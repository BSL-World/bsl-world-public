import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FONT_SIZE,
  FontSize,
  applyFontSize,
  fontSizeSettingsEqual,
  normalizeFontSize
} from '../utils/typography.js';

test('normalizes supported font sizes', () => {
  assert.equal(normalizeFontSize(FontSize.SMALL), FontSize.SMALL);
  assert.equal(normalizeFontSize(FontSize.LARGE), FontSize.LARGE);
  assert.equal(normalizeFontSize('huge'), DEFAULT_FONT_SIZE);
});

test('compares normalized font size settings', () => {
  assert.equal(
    fontSizeSettingsEqual({ fontSize: 'normal' }, {}),
    true
  );
  assert.equal(
    fontSizeSettingsEqual({ fontSize: 'large' }, { fontSize: 'small' }),
    false
  );
});

test('applies the font size to the document root', () => {
  const document = { documentElement: { dataset: {} } };

  assert.equal(applyFontSize('large', document), FontSize.LARGE);
  assert.equal(document.documentElement.dataset.fontSize, FontSize.LARGE);
});
