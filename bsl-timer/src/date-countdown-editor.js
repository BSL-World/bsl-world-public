export const DATE_COUNTDOWN_EDITOR_LABEL = 'date-countdown-editor';
export const DATE_COUNTDOWN_EDITOR_OPEN_EVENT =
  'bsl-timer:date-countdown-editor-open';
export const DATE_COUNTDOWN_CHANGED_EVENT =
  'bsl-timer:date-countdowns-changed';
export const DATE_COUNTDOWN_EDITOR_REQUEST_KEY =
  'bsl-timer.date-countdown-editor-request';

export function dateCountdownEditorValuesEqual(first, second) {
  return first?.name === second?.name
    && first?.description === second?.description
    && first?.targetTimestamp === second?.targetTimestamp
    && first?.showSeconds === second?.showSeconds;
}
