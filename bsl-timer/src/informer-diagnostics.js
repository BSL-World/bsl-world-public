import { invoke } from '@tauri-apps/api/core';

// No periodic polling: hidden WebViews must retain their normal lifecycle.
const enabled = invoke('informer_diagnostics_enabled').catch(() => false);
let sequence = 0;

export function informerDiagnostic(event, details = {}) {
  const observation = {
    ...details, sequence: ++sequence, observedAtMs: Date.now(),
    monotonicMs: performance.now()
  };
  void enabled.then(active => {
    if (active) return invoke('log_informer_diagnostic', { event, details: observation });
  }).catch(() => {});
}

export function installInformerErrorDiagnostics() {
  window.addEventListener('error', event => {
    informerDiagnostic('javascript-error', {
      message: String(event.message).slice(0, 1000), line: event.lineno,
      column: event.colno
    });
  });
  window.addEventListener('unhandledrejection', event => {
    informerDiagnostic('unhandled-rejection', {
      message: String(event.reason?.message ?? event.reason).slice(0, 1000)
    });
  });
}
