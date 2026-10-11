import { applyActionButtonWidth } from '@bsl-world/desktop-core/layout';
import en from './locales/en.json';
import ru from './locales/ru.json';

const keys = [
  'window.ok', 'window.cancel', 'window.apply',
  'timer.start', 'timer.pause', 'timer.stop', 'timer.restart', 'timer.resume',
  'dateCountdowns.delete', 'dateCountdowns.save',
  'settings.chooseAudioFile', 'settings.previewSignal',
  'behavior.closeAction', 'behavior.restoreAction', 'behavior.resetAction',
  'tabs.confirmCloseAction', 'updater.update', 'updater.later'
];
const labels = [en, ru].flatMap(locale => keys.map(key =>
  key.split('.').reduce((value, part) => value?.[part], locale)
).filter(value => typeof value === 'string'));

export function fitActionButtons() {
  applyActionButtonWidth(labels, document.querySelector('.control-button'));
}

window.addEventListener('bsl-world:font-size-applied', fitActionButtons);
window.addEventListener('bsl-timer:locale-changed', fitActionButtons);
