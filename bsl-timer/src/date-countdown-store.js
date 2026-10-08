import {
  createDateCountdown,
  normalizeDateCountdown
} from './date-countdown.js';

export const DATE_COUNTDOWN_STORAGE_KEY =
  'bsl-timer.date-countdowns';
export const DATE_COUNTDOWN_STORE_VERSION = 1;

function normalizeStore(value) {
  const countdowns = Array.isArray(value?.countdowns)
    ? value.countdowns
      .map(normalizeDateCountdown)
      .filter(Boolean)
    : [];

  return {
    version: DATE_COUNTDOWN_STORE_VERSION,
    countdowns
  };
}

export class DateCountdownStore {
  constructor({
    storage = globalThis.localStorage,
    storageKey = DATE_COUNTDOWN_STORAGE_KEY
  } = {}) {
    if (!storage) {
      throw new Error('Date countdown storage is not available');
    }

    this.storage = storage;
    this.storageKey = storageKey;
    this.countdowns = [];
  }

  load() {
    const storedValue = this.storage.getItem(this.storageKey);

    if (!storedValue) {
      this.countdowns = [];
      return this.getAll();
    }

    try {
      this.countdowns = normalizeStore(
        JSON.parse(storedValue)
      ).countdowns;
    } catch {
      this.countdowns = [];
    }

    return this.getAll();
  }

  getAll() {
    return this.countdowns.map((countdown) => ({ ...countdown }));
  }

  get(countdownId) {
    const countdown = this.countdowns.find(
      ({ id }) => id === countdownId
    );

    return countdown ? { ...countdown } : null;
  }

  add(value = {}) {
    const highestOrdinal = this.countdowns.reduce(
      (highest, countdown) => Math.max(
        highest,
        countdown.ordinal
      ),
      0
    );
    const countdown = createDateCountdown({
      ...value,
      ordinal: highestOrdinal + 1
    });

    this.countdowns.push(countdown);
    this.save();
    return { ...countdown };
  }

  update(countdownId, value = {}) {
    const countdownIndex = this.countdowns.findIndex(
      ({ id }) => id === countdownId
    );

    if (countdownIndex < 0) {
      return null;
    }

    const updatedCountdown = createDateCountdown({
      ...this.countdowns[countdownIndex],
      ...value,
      id: this.countdowns[countdownIndex].id,
      ordinal: this.countdowns[countdownIndex].ordinal
    });

    this.countdowns[countdownIndex] = updatedCountdown;
    this.save();
    return { ...updatedCountdown };
  }

  remove(countdownId) {
    const countdownIndex = this.countdowns.findIndex(
      ({ id }) => id === countdownId
    );

    if (countdownIndex < 0) {
      return false;
    }

    this.countdowns.splice(countdownIndex, 1);
    this.save();
    return true;
  }

  save() {
    const normalizedStore = normalizeStore({
      countdowns: this.countdowns
    });

    this.countdowns = normalizedStore.countdowns;
    this.storage.setItem(
      this.storageKey,
      JSON.stringify(normalizedStore)
    );
    return this.getAll();
  }
}
