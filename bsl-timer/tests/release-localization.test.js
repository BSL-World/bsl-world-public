import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('new release notes contain real RU/EN text instead of encoding placeholders', () => {
  for (const locale of ['ru', 'en']) {
    const messages = JSON.parse(readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url), 'utf8'));
    for (const key of ['singleInstance', 'informerNavigation']) {
      const text = messages.whatsNew[key];
      assert.equal(typeof text, 'string');
      assert.ok(!/\?{3,}|\uFFFD/.test(text), `${locale}: ${key}`);
      assert.match(text, locale === 'ru' ? /[\u0400-\u04ff]/ : /[A-Za-z]/);
    }
  }
});
