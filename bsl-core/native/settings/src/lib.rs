use serde_json::{Map, Value};
use std::{
    env,
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    thread,
    time::Duration,
};

const SETTINGS_DIRECTORY: &str = "BSL-World";
const SETTINGS_FILE: &str = "desktop-settings.json";
const SETTINGS_SCHEMA_VERSION: u64 = 2;
const SHARED_ROOT: &str = "shared";
const APPLICATIONS_ROOT: &str = "applications";
const LOCK_RETRY_COUNT: usize = 40;
const LOCK_RETRY_DELAY_MS: u64 = 50;
static TEMP_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug)]
pub struct SharedSettingsStore {
    path: PathBuf,
}

impl SharedSettingsStore {
    pub fn for_current_user() -> Result<Self, String> {
        let configuration_directory = configuration_directory()
            .ok_or_else(|| "The user configuration directory is unavailable".to_string())?;

        Ok(Self::new(
            configuration_directory
                .join(SETTINGS_DIRECTORY)
                .join(SETTINGS_FILE),
        ))
    }

    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn load_shared_section(&self, section: &str) -> Result<Value, String> {
        validate_key("section", section)?;
        let document = self.load_document()?;

        let shared_value = document
            .get(SHARED_ROOT)
            .and_then(Value::as_object)
            .and_then(|shared| shared.get(section))
            .cloned();

        if let Some(value) = shared_value {
            return Ok(value);
        }
        if document.get(section).is_some() {
            return self.migrate_legacy_shared_section(section);
        }

        Ok(Value::Null)
    }

    pub fn save_shared_section(&self, section: &str, value: Value) -> Result<Value, String> {
        validate_key("section", section)?;
        self.update_document(|object| {
            object.remove(section);
            object_child_mut(object, SHARED_ROOT)?.insert(section.to_string(), value.clone());
            Ok(value)
        })
    }

    pub fn load_application_section(
        &self,
        application: &str,
        section: &str,
    ) -> Result<Value, String> {
        validate_key("application", application)?;
        validate_key("section", section)?;
        let document = self.load_document()?;

        Ok(document
            .get(APPLICATIONS_ROOT)
            .and_then(Value::as_object)
            .and_then(|applications| applications.get(application))
            .and_then(Value::as_object)
            .and_then(|application_settings| application_settings.get(section))
            .cloned()
            .unwrap_or(Value::Null))
    }

    pub fn save_application_section(
        &self,
        application: &str,
        section: &str,
        value: Value,
    ) -> Result<Value, String> {
        validate_key("application", application)?;
        validate_key("section", section)?;
        self.update_document(|object| {
            let applications = object_child_mut(object, APPLICATIONS_ROOT)?;
            let application_settings = object_child_mut(applications, application)?;
            application_settings.insert(section.to_string(), value.clone());
            Ok(value)
        })
    }

    pub fn remove_application_section(
        &self,
        application: &str,
        section: &str,
    ) -> Result<bool, String> {
        validate_key("application", application)?;
        validate_key("section", section)?;
        self.update_document(|object| {
            let Some(applications) = object
                .get_mut(APPLICATIONS_ROOT)
                .and_then(Value::as_object_mut)
            else {
                return Ok(false);
            };
            let Some(application_settings) = applications
                .get_mut(application)
                .and_then(Value::as_object_mut)
            else {
                return Ok(false);
            };

            let removed = application_settings.remove(section).is_some();
            if application_settings.is_empty() {
                applications.remove(application);
            }
            Ok(removed)
        })
    }

    fn update_document<T>(
        &self,
        update: impl FnOnce(&mut Map<String, Value>) -> Result<T, String>,
    ) -> Result<T, String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "The shared settings path has no parent directory".to_string())?;

        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Failed to create the shared settings directory {}: {error}",
                parent.display()
            )
        })?;

        let lock_path = parent.join("desktop-settings.lock");
        let _lock = acquire_lock(&lock_path)?;
        let mut document = self.load_document()?;
        let object = document
            .as_object_mut()
            .ok_or_else(|| "The shared settings root must be a JSON object".to_string())?;

        let result = update(object)?;
        object.insert("schemaVersion".to_string(), Value::from(SETTINGS_SCHEMA_VERSION));
        object_child_mut(object, SHARED_ROOT)?;
        object_child_mut(object, APPLICATIONS_ROOT)?;
        self.write_document(&document)?;
        Ok(result)
    }

    fn migrate_legacy_shared_section(&self, section: &str) -> Result<Value, String> {
        self.update_document(|object| {
            if let Some(value) = object
                .get(SHARED_ROOT)
                .and_then(Value::as_object)
                .and_then(|shared| shared.get(section))
                .cloned()
            {
                return Ok(value);
            }

            let value = object.remove(section).unwrap_or(Value::Null);
            if !value.is_null() {
                object_child_mut(object, SHARED_ROOT)?
                    .insert(section.to_string(), value.clone());
            }
            Ok(value)
        })
    }

    fn load_document(&self) -> Result<Value, String> {
        if !self.path.exists() {
            return Ok(empty_document());
        }

        let bytes = fs::read(&self.path).map_err(|error| {
            format!(
                "Failed to read shared settings from {}: {error}",
                self.path.display()
            )
        })?;

        if bytes.is_empty() {
            return Ok(empty_document());
        }

        let document: Value = serde_json::from_slice(&bytes).map_err(|error| {
            format!(
                "Shared settings in {} are not valid JSON: {error}",
                self.path.display()
            )
        })?;

        if !document.is_object() {
            return Err(format!(
                "The shared settings root in {} must be a JSON object",
                self.path.display()
            ));
        }

        Ok(document)
    }

    fn write_document(&self, document: &Value) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "The shared settings path has no parent directory".to_string())?;
        let sequence = TEMP_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let temporary_path = parent.join(format!(
            ".desktop-settings.{}.{}.tmp",
            std::process::id(),
            sequence
        ));
        let mut bytes = serde_json::to_vec_pretty(document)
            .map_err(|error| format!("Failed to serialize shared settings: {error}"))?;

        bytes.push(b'\n');

        let write_result = (|| {
            let mut file = OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&temporary_path)
                .map_err(|error| {
                    format!(
                        "Failed to create temporary shared settings {}: {error}",
                        temporary_path.display()
                    )
                })?;

            file.write_all(&bytes).map_err(|error| {
                format!(
                    "Failed to write temporary shared settings {}: {error}",
                    temporary_path.display()
                )
            })?;
            file.sync_all().map_err(|error| {
                format!(
                    "Failed to flush temporary shared settings {}: {error}",
                    temporary_path.display()
                )
            })?;
            replace_file(&temporary_path, &self.path)
        })();

        if write_result.is_err() {
            let _ = fs::remove_file(&temporary_path);
        }

        write_result
    }
}

fn empty_document() -> Value {
    let mut object = Map::new();

    object.insert(
        "schemaVersion".to_string(),
        Value::from(SETTINGS_SCHEMA_VERSION),
    );
    object.insert(SHARED_ROOT.to_string(), Value::Object(Map::new()));
    object.insert(APPLICATIONS_ROOT.to_string(), Value::Object(Map::new()));
    Value::Object(object)
}

fn object_child_mut<'a>(
    object: &'a mut Map<String, Value>,
    key: &str,
) -> Result<&'a mut Map<String, Value>, String> {
    let value = object
        .entry(key.to_string())
        .or_insert_with(|| Value::Object(Map::new()));

    value
        .as_object_mut()
        .ok_or_else(|| format!("Shared settings field {key} must be an object"))
}

fn validate_key(kind: &str, key: &str) -> Result<(), String> {
    let mut characters = key.chars();
    let valid_first = characters
        .next()
        .is_some_and(|character| character.is_ascii_lowercase());
    let valid_rest = characters.all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == '-'
    });

    if valid_first && valid_rest {
        Ok(())
    } else {
        Err(format!("Invalid shared settings {kind}: {key}"))
    }
}

fn configuration_directory() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        env::var_os("APPDATA").map(PathBuf::from)
    }

    #[cfg(not(target_os = "windows"))]
    {
        env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
    }
}

#[cfg(target_os = "windows")]
fn acquire_lock(path: &Path) -> Result<File, String> {
    use std::os::windows::fs::OpenOptionsExt;

    let mut last_error = None;

    for _ in 0..LOCK_RETRY_COUNT {
        match OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .share_mode(0)
            .open(path)
        {
            Ok(file) => return Ok(file),
            Err(error) => {
                last_error = Some(error);
                thread::sleep(Duration::from_millis(LOCK_RETRY_DELAY_MS));
            }
        }
    }

    Err(format!(
        "Failed to lock shared settings {}: {}",
        path.display(),
        last_error
            .map(|error| error.to_string())
            .unwrap_or_else(|| "unknown error".to_string())
    ))
}

#[cfg(not(target_os = "windows"))]
fn acquire_lock(path: &Path) -> Result<File, String> {
    OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(path)
        .map_err(|error| format!("Failed to open shared settings lock: {error}"))
}

#[cfg(target_os = "windows")]
fn replace_file(source: &Path, destination: &Path) -> Result<(), String> {
    use std::{ffi::OsStr, os::windows::ffi::OsStrExt};
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    fn wide(path: &Path) -> Vec<u16> {
        OsStr::new(path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    let source = wide(source);
    let destination = wide(destination);
    let result = unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };

    if result == 0 {
        Err(format!(
            "Failed to replace shared settings: {}",
            std::io::Error::last_os_error()
        ))
    } else {
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
fn replace_file(source: &Path, destination: &Path) -> Result<(), String> {
    fs::rename(source, destination).map_err(|error| {
        format!(
            "Failed to replace shared settings {}: {error}",
            destination.display()
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_settings_path(name: &str) -> PathBuf {
        env::temp_dir().join(format!(
            "bsl-desktop-settings-test-{}-{}-{name}",
            std::process::id(),
            TEMP_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed)
        )).join(SETTINGS_FILE)
    }

    #[test]
    fn stores_shared_sections_without_overwriting_each_other() {
        let path = temporary_settings_path("sections");
        let store = SharedSettingsStore::new(&path);

        store
            .save_shared_section("regional", serde_json::json!({ "timeFormat": "24-hour" }))
            .unwrap();
        store
            .save_shared_section("audio", serde_json::json!({ "outputDeviceId": "default" }))
            .unwrap();

        assert_eq!(
            store.load_shared_section("regional").unwrap(),
            serde_json::json!({ "timeFormat": "24-hour" })
        );
        assert_eq!(
            store.load_shared_section("audio").unwrap(),
            serde_json::json!({ "outputDeviceId": "default" })
        );

        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn returns_null_for_a_missing_section() {
        let path = temporary_settings_path("missing");
        let store = SharedSettingsStore::new(&path);

        assert_eq!(store.load_shared_section("regional").unwrap(), Value::Null);
    }

    #[test]
    fn rejects_unsafe_section_names() {
        let store = SharedSettingsStore::new(temporary_settings_path("unsafe"));

        assert!(store.load_shared_section("../timer").is_err());
        assert!(store
            .load_application_section("../timer", "regional")
            .is_err());
    }

    #[test]
    fn keeps_application_overrides_independent() {
        let path = temporary_settings_path("applications");
        let store = SharedSettingsStore::new(&path);

        store
            .save_application_section(
                "bsl-timer",
                "regional",
                serde_json::json!({ "timeFormat": "24-hour" }),
            )
            .unwrap();
        store
            .save_application_section(
                "bsl-clock",
                "regional",
                serde_json::json!({ "timeFormat": "12-hour" }),
            )
            .unwrap();

        assert_eq!(
            store
                .load_application_section("bsl-timer", "regional")
                .unwrap(),
            serde_json::json!({ "timeFormat": "24-hour" })
        );
        assert_eq!(
            store
                .load_application_section("bsl-clock", "regional")
                .unwrap(),
            serde_json::json!({ "timeFormat": "12-hour" })
        );

        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn reads_legacy_sections_and_migrates_them_on_save() {
        let path = temporary_settings_path("legacy");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(
            &path,
            serde_json::to_vec_pretty(&serde_json::json!({
                "schemaVersion": 1,
                "regional": { "timeFormat": "24-hour" }
            }))
            .unwrap(),
        )
        .unwrap();
        let store = SharedSettingsStore::new(&path);

        let regional = store.load_shared_section("regional").unwrap();
        assert_eq!(regional, serde_json::json!({ "timeFormat": "24-hour" }));

        let document: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(document["schemaVersion"], SETTINGS_SCHEMA_VERSION);
        assert!(document.get("regional").is_none());
        assert_eq!(
            document[SHARED_ROOT]["regional"],
            serde_json::json!({ "timeFormat": "24-hour" })
        );

        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn removes_an_application_override_without_touching_shared_defaults() {
        let path = temporary_settings_path("remove-override");
        let store = SharedSettingsStore::new(&path);

        store
            .save_shared_section("regional", serde_json::json!({ "timeFormat": "system" }))
            .unwrap();
        store
            .save_application_section(
                "bsl-timer",
                "regional",
                serde_json::json!({ "timeFormat": "24-hour" }),
            )
            .unwrap();

        assert!(store
            .remove_application_section("bsl-timer", "regional")
            .unwrap());
        assert_eq!(
            store.load_shared_section("regional").unwrap(),
            serde_json::json!({ "timeFormat": "system" })
        );
        assert_eq!(
            store
                .load_application_section("bsl-timer", "regional")
                .unwrap(),
            Value::Null
        );

        let _ = fs::remove_dir_all(path.parent().unwrap());
    }
}
