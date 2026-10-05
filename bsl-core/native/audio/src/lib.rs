use rodio::{
    cpal::{
        self,
        traits::{DeviceTrait, HostTrait},
        DeviceId,
    },
    source::{SineWave, Source},
    Decoder, DeviceSinkBuilder, MixerDeviceSink, Player,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs::File,
    path::Path,
    str::FromStr,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};

pub const DEFAULT_AUDIO_OUTPUT_DEVICE_ID: &str = "default";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioOutputDevice {
    pub id: String,
    pub label: String,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NativeAudioSignal {
    BuiltIn,
    Warning,
    File,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAudioRequest {
    pub playback_id: String,
    pub output_device_id: String,
    pub signal: NativeAudioSignal,
    pub path: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAudioResult {
    pub effective_output_device_id: String,
    pub fell_back: bool,
}

struct ActivePlayback {
    token: u64,
    player: Arc<Player>,
    _device_sink: Arc<MixerDeviceSink>,
}

#[derive(Clone)]
struct AudioOutputSession {
    requested_output_device_id: String,
    effective_output_device_id: String,
    physical_output_device_id: Option<String>,
    fell_back: bool,
    device_sink: Arc<MixerDeviceSink>,
}

#[derive(Default)]
struct AudioEngineState {
    active: HashMap<String, Arc<ActivePlayback>>,
    cancelled: HashSet<String>,
    output_session: Option<AudioOutputSession>,
}

#[derive(Clone, Default)]
pub struct AudioEngine {
    next_token: Arc<AtomicU64>,
    state: Arc<Mutex<AudioEngineState>>,
}

fn lock_error() -> String {
    "The shared audio playback state is unavailable".to_string()
}

fn default_output_device() -> Result<cpal::Device, String> {
    cpal::default_host()
        .default_output_device()
        .ok_or_else(|| "No default audio output device is available".to_string())
}

fn normalize_output_device_id(device_id: &str) -> String {
    let device_id = device_id.trim();

    if device_id.is_empty() {
        DEFAULT_AUDIO_OUTPUT_DEVICE_ID.to_string()
    } else {
        device_id.to_string()
    }
}

fn physical_output_device_id(device: &cpal::Device) -> Option<String> {
    device.id().ok().map(|id| id.to_string())
}

fn resolve_output_device(device_id: &str) -> Result<cpal::Device, String> {
    if device_id.trim().is_empty() || device_id == DEFAULT_AUDIO_OUTPUT_DEVICE_ID {
        return default_output_device();
    }

    let parsed_id = DeviceId::from_str(device_id)
        .map_err(|error| format!("Invalid audio output device identifier: {error}"))?;
    // Device identifiers exposed by this engine are collected from CPAL's
    // default host, so they must be resolved through that same host. CPAL
    // 0.17 deliberately keeps the DeviceId host fields private and does not
    // expose the host() accessor added in 0.18.
    let host = cpal::default_host();

    host.device_by_id(&parsed_id)
        .ok_or_else(|| "The selected audio output device is unavailable".to_string())
}

fn open_device_sink(device: cpal::Device) -> Result<MixerDeviceSink, String> {
    let mut device_sink = DeviceSinkBuilder::from_device(device)
        .and_then(|builder| builder.open_sink_or_fallback())
        .map_err(|error| format!("Failed to open the audio output device: {error}"))?;

    // The engine deliberately owns and closes this long-lived stream. Rodio's
    // default diagnostic on drop is useful for accidental early drops, but it
    // is noise for this controlled lifecycle.
    device_sink.log_on_drop(false);
    Ok(device_sink)
}

fn create_output_session(
    device: cpal::Device,
    requested_output_device_id: String,
    effective_output_device_id: String,
    fell_back: bool,
) -> Result<AudioOutputSession, String> {
    let physical_output_device_id = physical_output_device_id(&device);
    let device_sink = Arc::new(open_device_sink(device)?);

    Ok(AudioOutputSession {
        requested_output_device_id,
        effective_output_device_id,
        physical_output_device_id,
        fell_back,
        device_sink,
    })
}

fn open_output_session(device_id: &str) -> Result<AudioOutputSession, String> {
    let requested_id = normalize_output_device_id(device_id);

    if requested_id == DEFAULT_AUDIO_OUTPUT_DEVICE_ID {
        return default_output_device()
            .and_then(|device| {
                create_output_session(
                    device,
                    requested_id,
                    DEFAULT_AUDIO_OUTPUT_DEVICE_ID.to_string(),
                    false,
                )
            })
            .map_err(|error| format!("Failed to open the default audio output: {error}"));
    }

    let selected_session = resolve_output_device(&requested_id).and_then(|device| {
        create_output_session(
            device,
            requested_id.clone(),
            requested_id.clone(),
            false,
        )
    });

    match selected_session {
        Ok(session) => Ok(session),
        Err(_) => default_output_device()
            .and_then(|device| {
                create_output_session(
                    device,
                    requested_id,
                    DEFAULT_AUDIO_OUTPUT_DEVICE_ID.to_string(),
                    true,
                )
            })
            .map_err(|error| format!("Failed to open the fallback audio output: {error}")),
    }
}

fn output_session_is_current(session: &AudioOutputSession, requested_id: &str) -> bool {
    if session.requested_output_device_id != requested_id {
        return false;
    }

    let current_device = if session.fell_back {
        // Keep using the cached fallback while the requested endpoint remains
        // absent. As soon as it returns, retry it on the next playback.
        if resolve_output_device(requested_id).is_ok() {
            return false;
        }

        default_output_device()
    } else {
        resolve_output_device(requested_id)
    };

    let current_physical_id = current_device
        .ok()
        .and_then(|device| physical_output_device_id(&device));

    matches!(
        (
            current_physical_id.as_deref(),
            session.physical_output_device_id.as_deref(),
        ),
        (Some(current), Some(cached)) if current == cached
    )
}

fn append_silence(player: &Player, duration: Duration) {
    player.append(
        SineWave::new(440.0)
            .take_duration(duration)
            .amplify(0.0),
    );
}

fn append_built_in_signal(player: &Player) {
    for index in 0..3 {
        player.append(
            SineWave::new(880.0)
                .take_duration(Duration::from_millis(200))
                .amplify(0.25),
        );

        if index < 2 {
            append_silence(player, Duration::from_millis(150));
        }
    }
}

fn append_warning_signal(player: &Player) {
    player.append(
        SineWave::new(660.0)
            .take_duration(Duration::from_millis(160))
            .amplify(0.20),
    );
    append_silence(player, Duration::from_millis(80));
    player.append(
        SineWave::new(880.0)
            .take_duration(Duration::from_millis(160))
            .amplify(0.20),
    );
}

fn append_file(player: &Player, path: Option<&str>) -> Result<(), String> {
    let path = path
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "No audio file was selected".to_string())?;
    let file = File::open(Path::new(path))
        .map_err(|error| format!("Failed to open the selected audio file: {error}"))?;
    let source = Decoder::try_from(file)
        .map_err(|error| format!("Failed to decode the selected audio file: {error}"))?;

    player.append(source);
    Ok(())
}

fn audio_output_device_label(description: &cpal::DeviceDescription) -> String {
    let name = description.name().trim();
    let normalized_name = name.to_lowercase();
    let mut label = name.to_string();

    for detail in [description.driver(), description.manufacturer()]
        .into_iter()
        .flatten()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let normalized_detail = detail.to_lowercase();

        if normalized_detail == normalized_name || label.to_lowercase().contains(&normalized_detail)
        {
            continue;
        }

        if normalized_detail.contains(&normalized_name) {
            label = detail.to_string();
        } else {
            label.push_str(" — ");
            label.push_str(detail);
        }
    }

    label
}

pub fn list_audio_output_devices() -> Result<Vec<AudioOutputDevice>, String> {
    let host = cpal::default_host();
    let mut devices = host
        .output_devices()
        .map_err(|error| format!("Failed to enumerate audio output devices: {error}"))?
        .filter_map(|device| {
            let id = device.id().ok()?.to_string();
            let description = device.description().ok()?;
            let label = audio_output_device_label(&description);

            Some(AudioOutputDevice { id, label })
        })
        .collect::<Vec<_>>();

    devices.sort_by(|left, right| {
        left.label
            .to_lowercase()
            .cmp(&right.label.to_lowercase())
            .then_with(|| left.id.cmp(&right.id))
    });
    devices.dedup_by(|left, right| left.id == right.id);

    Ok(devices)
}

pub fn is_audio_output_device_available(device_id: &str) -> bool {
    resolve_output_device(device_id).is_ok()
}

impl AudioEngine {
    fn output_session(&self, output_device_id: &str) -> Result<AudioOutputSession, String> {
        let requested_id = normalize_output_device_id(output_device_id);
        let mut state = self.state.lock().map_err(|_| lock_error())?;

        if let Some(session) = state
            .output_session
            .as_ref()
            .filter(|session| output_session_is_current(session, &requested_id))
        {
            return Ok(session.clone());
        }

        let session = open_output_session(&requested_id)?;
        state.output_session = Some(session.clone());
        Ok(session)
    }

    pub fn play(&self, request: NativeAudioRequest) -> Result<NativeAudioResult, String> {
        {
            let mut state = self.state.lock().map_err(|_| lock_error())?;

            if state.cancelled.remove(&request.playback_id) {
                return Ok(NativeAudioResult {
                    effective_output_device_id: request.output_device_id,
                    fell_back: false,
                });
            }
        }

        let output_session = self.output_session(&request.output_device_id)?;
        let player = Arc::new(Player::connect_new(output_session.device_sink.mixer()));

        match request.signal {
            NativeAudioSignal::BuiltIn => append_built_in_signal(&player),
            NativeAudioSignal::Warning => append_warning_signal(&player),
            NativeAudioSignal::File => append_file(&player, request.path.as_deref())?,
        }

        let token = self.next_token.fetch_add(1, Ordering::Relaxed);
        let active_playback = Arc::new(ActivePlayback {
            token,
            player,
            _device_sink: output_session.device_sink.clone(),
        });

        let previous = {
            let mut state = self.state.lock().map_err(|_| lock_error())?;

            if state.cancelled.remove(&request.playback_id) {
                return Ok(NativeAudioResult {
                    effective_output_device_id: output_session
                        .effective_output_device_id
                        .clone(),
                    fell_back: output_session.fell_back,
                });
            }

            state
                .active
                .insert(request.playback_id.clone(), active_playback.clone())
        };

        if let Some(previous) = previous {
            previous.player.stop();
        }

        active_playback.player.sleep_until_end();

        let mut state = self.state.lock().map_err(|_| lock_error())?;

        if state
            .active
            .get(&request.playback_id)
            .is_some_and(|playback| playback.token == token)
        {
            state.active.remove(&request.playback_id);
        }

        Ok(NativeAudioResult {
            effective_output_device_id: output_session.effective_output_device_id,
            fell_back: output_session.fell_back,
        })
    }

    pub fn stop(&self, playback_ids: &[String]) -> Result<(), String> {
        let playbacks = {
            let mut state = self.state.lock().map_err(|_| lock_error())?;

            if state.cancelled.len() > 1024 {
                state.cancelled.clear();
            }

            state.cancelled.extend(playback_ids.iter().cloned());
            playback_ids
                .iter()
                .filter_map(|playback_id| state.active.remove(playback_id))
                .collect::<Vec<_>>()
        };

        playbacks.iter().for_each(|playback| playback.player.stop());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_default_device_identifier_is_stable() {
        assert_eq!(DEFAULT_AUDIO_OUTPUT_DEVICE_ID, "default");
    }

    #[test]
    fn missing_specific_device_is_not_reported_as_available() {
        assert!(!is_audio_output_device_available(
            "not-a-valid-cpal-device-id"
        ));
    }
}
