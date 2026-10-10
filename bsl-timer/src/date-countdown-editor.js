export const DATE_COUNTDOWN_EDITOR_LABEL = 'date-countdown-editor';
export const DATE_COUNTDOWN_EDITOR_OPEN_EVENT =
  'bsl-timer:date-countdown-editor-open';
export const DATE_COUNTDOWN_CHANGED_EVENT =
  'bsl-timer:date-countdowns-changed';
export const DATE_COUNTDOWN_EDITOR_REQUEST_KEY =
  'bsl-timer.date-countdown-editor-request';

const DATE_COUNTDOWN_EDITOR_MINIMUM_HEIGHTS = Object.freeze({
  small: 520,
  normal: 520,
  large: 660
});

export function getDateCountdownEditorMinimumHeight(fontSize) {
  return DATE_COUNTDOWN_EDITOR_MINIMUM_HEIGHTS[fontSize]
    ?? DATE_COUNTDOWN_EDITOR_MINIMUM_HEIGHTS.normal;
}

export function dateCountdownEditorValuesEqual(first, second) {
  return first?.name === second?.name
    && first?.description === second?.description
    && first?.targetTimestamp === second?.targetTimestamp
    && first?.showSeconds === second?.showSeconds;
}
