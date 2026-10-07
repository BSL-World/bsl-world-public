const SECTION_PATTERN = /^[a-z][a-z0-9-]*$/;

function validateSection(section) {
  if (!SECTION_PATTERN.test(section)) {
    throw new Error(`Invalid shared settings section: ${section}`);
  }
}

function validateApplication(application) {
  if (!SECTION_PATTERN.test(application)) {
    throw new Error(`Invalid shared settings application: ${application}`);
  }
}

export async function loadSharedSettingsSection(
  section,
  invoke
) {
  validateSection(section);
  return invoke('load_shared_desktop_settings_section', { section });
}

export async function saveSharedSettingsSection(
  section,
  value,
  invoke
) {
  validateSection(section);
  return invoke('save_shared_desktop_settings_section', {
    section,
    value
  });
}

export async function loadApplicationSettingsSection(
  application,
  section,
  invoke
) {
  validateApplication(application);
  validateSection(section);
  return invoke('load_application_desktop_settings_section', {
    application,
    section
  });
}

export async function saveApplicationSettingsSection(
  application,
  section,
  value,
  invoke
) {
  validateApplication(application);
  validateSection(section);
  return invoke('save_application_desktop_settings_section', {
    application,
    section,
    value
  });
}

export async function removeApplicationSettingsSection(
  application,
  section,
  invoke
) {
  validateApplication(application);
  validateSection(section);
  return invoke('remove_application_desktop_settings_section', {
    application,
    section
  });
}

export async function loadEffectiveSettingsSection(
  application,
  section,
  invoke
) {
  const [shared, applicationSettings] = await Promise.all([
    loadSharedSettingsSection(section, invoke),
    loadApplicationSettingsSection(application, section, invoke)
  ]);

  if (applicationSettings === null) {
    return shared;
  }
  if (
    shared !== null &&
    typeof shared === 'object' &&
    !Array.isArray(shared) &&
    typeof applicationSettings === 'object' &&
    !Array.isArray(applicationSettings)
  ) {
    return { ...shared, ...applicationSettings };
  }
  return applicationSettings;
}
