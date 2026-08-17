export const Edition = Object.freeze({
  FREE: 'free',
  PRO: 'pro'
});

const capabilities = Object.freeze({
  [Edition.FREE]: Object.freeze({
    maxTimers: 1,
    multipleTimers: false,
    selectableSoundDevice: false,
    systemSounds: false,
    customSounds: false,
    presets: false,
    themes: true
  }),
  [Edition.PRO]: Object.freeze({
    maxTimers: Number.POSITIVE_INFINITY,
    multipleTimers: true,
    selectableSoundDevice: true,
    systemSounds: true,
    customSounds: true,
    presets: true,
    themes: true
  })
});

let currentEdition = Edition.FREE;

export function getEdition() {
  return currentEdition;
}

export function getCapability(name) {
  return capabilities[currentEdition][name] ?? false;
}

export function canCreateTimer(currentTimerCount) {
  return currentTimerCount < getCapability('maxTimers');
}

export function setDevelopmentEdition(edition) {
  if (!import.meta.env.DEV || !capabilities[edition]) {
    return false;
  }

  currentEdition = edition;

  window.dispatchEvent(
    new CustomEvent('bsl-timer:edition-changed', {
      detail: { edition }
    })
  );

  return true;
}
