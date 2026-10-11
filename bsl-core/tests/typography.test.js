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

test('scales both dimensions and gives numeric displays a gentler range', async () => {
  const { getFontSizeMetrics, scaleInterfaceSize } = await import('../utils/typography.js');
  const normal = { width: 360, height: 260 };
  const small = scaleInterfaceSize(normal, 'small');
  const large = scaleInterfaceSize(normal, 'large');
  assert.ok(small.width < normal.width && small.height < normal.height);
  assert.ok(large.width > normal.width && large.height > normal.height);
  assert.deepEqual(scaleInterfaceSize(normal, 'invalid'), normal);
  assert.ok(getFontSizeMetrics('small').displayScale > getFontSizeMetrics('small').uiScale);
  assert.ok(getFontSizeMetrics('large').displayScale < getFontSizeMetrics('large').uiScale);
});
