import {
  FontSize,
  normalizeFontSize
} from '@bsl-world/desktop-core/typography';

export const DateCountdownRibbonState = Object.freeze({
  HIDDEN: 'hidden',
  COLLAPSED: 'collapsed',
  EXPANDED: 'expanded'
});

const MAIN_WINDOW_SIZES = Object.freeze({
  [FontSize.SMALL]: Object.freeze({
    width: 360,
    hidden: 260,
    collapsed: 286,
    expanded: 330
  }),
  [FontSize.NORMAL]: Object.freeze({
    width: 360,
    hidden: 270,
    collapsed: 296,
    expanded: 340
  }),
  [FontSize.LARGE]: Object.freeze({
    width: 360,
    hidden: 300,
    collapsed: 326,
    expanded: 370
  })
});

export function getMainWindowSize(
  fontSize,
  ribbonState = DateCountdownRibbonState.HIDDEN
) {
  const normalizedFontSize = normalizeFontSize(fontSize);
  const normalizedRibbonState = Object.values(
    DateCountdownRibbonState
  ).includes(ribbonState)
    ? ribbonState
    : DateCountdownRibbonState.HIDDEN;
  const definition = MAIN_WINDOW_SIZES[normalizedFontSize];

  return Object.freeze({
    width: definition.width,
    height: definition[normalizedRibbonState]
  });
}
