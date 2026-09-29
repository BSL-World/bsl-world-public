import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY,
  allowWhatsNewAgain,
  dismissWhatsNew,
  shouldShowWhatsNew
} from '../src/whats-new.js';

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test('shows release notes until the current version is dismissed', () => {
  const storage = createMemoryStorage();

  assert.equal(shouldShowWhatsNew('0.8.0', storage), true);

  dismissWhatsNew('0.8.0', storage);

  assert.equal(shouldShowWhatsNew('0.8.0', storage), false);
});

test('shows release notes again for a newer version', () => {
  const storage = createMemoryStorage({
    [WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY]: '0.8.0'
  });

  assert.equal(shouldShowWhatsNew('0.8.1', storage), true);
});

test('can enable automatic release notes again for the current version', () => {
  const storage = createMemoryStorage({
    [WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY]: '0.8.0'
  });

  allowWhatsNewAgain('0.8.0', storage);

  assert.equal(shouldShowWhatsNew('0.8.0', storage), true);
});
