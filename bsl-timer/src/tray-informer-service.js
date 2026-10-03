export class TrayInformerService {
  constructor({
    show,
    startFade,
    hide,
    lingerMs = 3_000,
    fadeMs = 420,
    setTimeoutFn = globalThis.setTimeout.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout.bind(globalThis)
  }) {
    this.show = show;
    this.startFade = startFade;
    this.hide = hide;
    this.lingerMs = lingerMs;
    this.fadeMs = fadeMs;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.activeTokens = new Set();
    this.lingerTimeoutId = null;
    this.fadeTimeoutId = null;
    this.generation = null;
    this.showRequestId = 0;
  }

  start(token, data) {
    this.activeTokens.add(token);
    this.cancelPendingHide();

    const requestId = ++this.showRequestId;

    void Promise.resolve(this.show(data)).then((generation) => {
      if (requestId === this.showRequestId) {
        this.generation = generation;
      }
    });
  }

  complete(token) {
    if (!this.activeTokens.has(token)) {
      return;
    }

    this.activeTokens.delete(token);

    if (this.activeTokens.size > 0) {
      return;
    }

    this.cancelPendingHide();
    this.lingerTimeoutId = this.setTimeoutFn(() => {
      this.lingerTimeoutId = null;
      this.startFade();
      this.fadeTimeoutId = this.setTimeoutFn(() => {
        this.fadeTimeoutId = null;
        void this.hide(this.generation);
      }, this.fadeMs);
    }, this.lingerMs);
  }

  showMoment(token, data) {
    this.start(token, data);
    this.complete(token);
  }

  cancelPendingHide() {
    if (this.lingerTimeoutId !== null) {
      this.clearTimeoutFn(this.lingerTimeoutId);
      this.lingerTimeoutId = null;
    }

    if (this.fadeTimeoutId !== null) {
      this.clearTimeoutFn(this.fadeTimeoutId);
      this.fadeTimeoutId = null;
    }
  }
}
