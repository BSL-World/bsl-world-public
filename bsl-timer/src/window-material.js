// Serialize native transitions so a slower previous request cannot restore blur
// after a later Glass selection. A failed request remains retryable.
export function createWindowMaterialUpdater(applyNative) {
  let pending = Promise.resolve();
  let appliedKey = null;

  return (mode, transparency) => {
    const key = JSON.stringify([mode, transparency]);
    pending = pending.catch(() => {}).then(async () => {
      if (key === appliedKey) return;
      await applyNative(mode, transparency);
      appliedKey = key;
    });
    return pending;
  };
}
