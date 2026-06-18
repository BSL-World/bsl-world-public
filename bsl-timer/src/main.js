import { getCurrentWindow } from '@tauri-apps/api/window';

// ---- Context Menu (custom right-click) ----
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const menu = document.createElement('div');
    menu.id = 'custom-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    menu.style.backgroundColor = '#2c2c2c';
    menu.style.border = '1px solid #888';
    menu.style.padding = '5px 0';
    menu.style.zIndex = '9999';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.3)';
    menu.innerHTML = `
        <div data-action="settings" style="padding: 6px 20px; cursor: pointer;">Settings</div>
        <div data-action="about" style="padding: 6px 20px; cursor: pointer;">About</div>
        <div data-action="support" style="padding: 6px 20px; cursor: pointer;">Support</div>
    `;
    document.body.appendChild(menu);

    const handleClick = (action) => {
        if (action === 'settings') console.log('Open settings');
        if (action === 'about') console.log('About');
        if (action === 'support') console.log('Support');
        menu.remove();
    };

    menu.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', (ev) => {
            const action = ev.target.getAttribute('data-action');
            handleClick(action);
        });
    });

    const removeMenu = (e) => {
        if (!menu.contains(e.target)) menu.remove();
        document.removeEventListener('click', removeMenu);
    };
    setTimeout(() => document.addEventListener('click', removeMenu), 10);
});

// ---- Timer Class ----
class Timer {
    constructor(containerId, timerId, initialMinutes = 10) {
        this.id = timerId;
        this.container = document.getElementById(containerId);
        this.remainingSeconds = initialMinutes * 60;
        this.interval = null;
        this.isRunning = false;
        this.isExpired = false;
        this.repeatTimer = null;
        this.repeatCountRemaining = 0;
        this.repeatIntervalSeconds = 0;
        this.isPaused = false;
        this.warning10Triggered = false;
        this.warning5Triggered = false;
        this.blinkTimer = null;

        this.initDOM();
        this.updateDisplay();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="timer-card timer" id="timer-card-${this.id}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="timer-display" id="display-${this.id}">00:00:00</div>
                    <input type="text" id="name-${this.id}" placeholder="Timer name (optional)" style="font-size: 1em; width: 150px; text-align: left; padding: 5px;">
                    <button id="close-${this.id}" style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #888;">✕</button>
                </div>
                <div>
                    <input type="number" id="input-${this.id}" placeholder="Minutes" value="10">
                    <button id="start-${this.id}">Start</button>
                    <button id="pause-${this.id}">Pause</button>
                    <button id="restart-${this.id}">Restart</button>
                    <button id="toggleSettings-${this.id}" style="font-size: 0.8em; padding: 4px 10px;">⚙️ Settings</button>
                </div>
                <div id="settingsPanel-${this.id}" style="display: none; margin-top: 10px; border-top: 1px solid #444; padding-top: 10px;">
                    <div class="repeat-options">
                        <label><input type="checkbox" id="repeatCheck-${this.id}"> Repeat signal</label>
                        <label>Repeat count: <input type="number" id="repeatCount-${this.id}" value="1" min="1" step="1" disabled></label>
                        <label>Interval (min): <input type="number" id="repeatInterval-${this.id}" value="1" min="1" step="1" disabled></label>
                        <button id="playSound-${this.id}">Play</button>
                    </div>
                    <div class="warning-options" style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px;">
                        <label><input type="checkbox" id="warning10-${this.id}"> Warn 10 min before</label>
                        <label><input type="checkbox" id="warning5-${this.id}"> Warn 5 min before</label>
                        <span style="margin-left: 15px;">Alert type:</span>
                        <label><input type="checkbox" id="warningSound-${this.id}" checked> Sound</label>
                        <label><input type="checkbox" id="warningVisual-${this.id}" checked> Visual (blink)</label>
                    </div>
                </div>
            </div>
        `;

        this.displayEl = document.getElementById(`display-${this.id}`);
        this.timerCard = document.getElementById(`timer-card-${this.id}`);
        this.inputMin = document.getElementById(`input-${this.id}`);
        this.startStopBtn = document.getElementById(`start-${this.id}`);
        this.pauseResumeBtn = document.getElementById(`pause-${this.id}`);
        this.restartBtn = document.getElementById(`restart-${this.id}`);
        this.repeatCheck = document.getElementById(`repeatCheck-${this.id}`);
        this.repeatCountInput = document.getElementById(`repeatCount-${this.id}`);
        this.repeatIntervalInput = document.getElementById(`repeatInterval-${this.id}`);
        this.playSoundBtn = document.getElementById(`playSound-${this.id}`);
        this.warning10 = document.getElementById(`warning10-${this.id}`);
        this.warning5 = document.getElementById(`warning5-${this.id}`);
        this.warningSound = document.getElementById(`warningSound-${this.id}`);
        this.warningVisual = document.getElementById(`warningVisual-${this.id}`);

        this.startStopBtn.addEventListener('click', () => this.onStartStop());
        this.pauseResumeBtn.addEventListener('click', () => this.onPauseResume());
        this.restartBtn.addEventListener('click', () => this.onRestart());
        this.repeatCheck.addEventListener('change', () => this.onRepeatCheckChange());
        this.playSoundBtn.addEventListener('click', () => this.playSignal());
        this.inputMin.addEventListener('input', () => this.onInputChange());
        this.inputMin.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onStartStop();
        });

        this.toggleSettingsBtn = document.getElementById(`toggleSettings-${this.id}`);
        this.settingsPanel = document.getElementById(`settingsPanel-${this.id}`);
        this.toggleSettingsBtn.addEventListener('click', () => {
            const isHidden = this.settingsPanel.style.display === 'none';
            this.settingsPanel.style.display = isHidden ? 'block' : 'none';
            this.toggleSettingsBtn.textContent = isHidden ? '⚙️ Hide Settings' : '⚙️ Settings';
        });

        document.getElementById(`close-${this.id}`).addEventListener('click', () => {
            this.container.remove();
            const index = timers.indexOf(this);
            if (index !== -1) timers.splice(index, 1);
        });

        this.onRepeatCheckChange();
        this.updateInputDisabled();
        this.setInitialTime();
    }

    setInitialTime() {
        const mins = parseInt(this.inputMin.value) || 0;
        this.remainingSeconds = mins * 60;
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.isExpired) {
            const overdue = Math.abs(this.remainingSeconds);
            const hours = Math.floor(overdue / 3600);
            const minutes = Math.floor((overdue % 3600) / 60);
            const seconds = overdue % 60;
            this.displayEl.textContent = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
            this.displayEl.classList.add('overdue');
            this.timerCard.classList.add('overdue');
        } else {
            const hours = Math.floor(this.remainingSeconds / 3600);
            const minutes = Math.floor((this.remainingSeconds % 3600) / 60);
            const seconds = this.remainingSeconds % 60;
            this.displayEl.textContent = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
            this.displayEl.classList.remove('overdue');
            this.timerCard.classList.remove('overdue');
        }
    }

    checkWarnings() {
        if (this.isPaused) return;
        if (this.isExpired) return;
        if (!this.isRunning) return;

        const secs = this.remainingSeconds;

        if (secs <= 600 && secs > 0 && !this.warning10Triggered && this.warning10.checked) {
            this.warning10Triggered = true;
            this.triggerWarning('10min');
        }
        if (secs <= 300 && secs > 0 && !this.warning5Triggered && this.warning5.checked) {
            this.warning5Triggered = true;
            this.triggerWarning('5min');
        }
    }

    triggerWarning(type) {
        if (this.warningSound.checked) {
            alert(`Warning: ${type} before end!`);
        }
        if (this.warningVisual.checked) {
            this.startBlinking();
        }
    }

    startBlinking() {
        const card = this.timerCard;
        card.classList.add('warning-blink');
        if (this.blinkTimer) clearTimeout(this.blinkTimer);
        this.blinkTimer = setTimeout(() => {
            card.classList.remove('warning-blink');
            this.blinkTimer = null;
        }, 5000);
    }

    stopBlinking() {
        const card = this.timerCard;
        card.classList.remove('warning-blink');
        if (this.blinkTimer) {
            clearTimeout(this.blinkTimer);
            this.blinkTimer = null;
        }
    }

    playSignal() {
        alert('BELL!');
    }

    stopRepeatSignals() {
        if (this.repeatTimer) {
            clearTimeout(this.repeatTimer);
            this.repeatTimer = null;
        }
        this.repeatCountRemaining = 0;
    }

    startRepeatSignals() {
        if (!this.repeatCheck.checked) return;
        if (this.repeatCountRemaining <= 0) return;
        this.playSignal();
        this.repeatCountRemaining--;
        if (this.repeatCountRemaining > 0) {
            this.repeatTimer = setTimeout(() => this.startRepeatSignals(), this.repeatIntervalSeconds * 1000);
        } else {
            this.repeatTimer = null;
        }
    }

    onTimerExpire() {
        if (this.isExpired) return;
        this.isExpired = true;
        this.pauseResumeBtn.disabled = true;
        this.updateInputDisabled();

        if (this.repeatCheck.checked) {
            const count = parseInt(this.repeatCountInput.value) || 0;
            const intervalMin = parseFloat(this.repeatIntervalInput.value) || 0;
            if (count > 0 && intervalMin > 0) {
                this.repeatCountRemaining = count;
                this.repeatIntervalSeconds = intervalMin * 60;
                this.startRepeatSignals();
            }
        }
        this.updateDisplay();
    }

    startTimer() {
        if (this.isRunning) return;
        if (this.isExpired) return;
        const mins = parseInt(this.inputMin.value) || 0;
        this.remainingSeconds = mins * 60;
        this.updateDisplay();
        this.isRunning = true;
        this.interval = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                this.updateDisplay();
                this.checkWarnings();
                if (this.remainingSeconds === 0) {
                    this.onTimerExpire();
                }
            } else if (this.isExpired) {
                this.remainingSeconds--;
                this.updateDisplay();
            }
        }, 1000);
        this.updateInputDisabled();
    }

    stopTimer() {
        if (this.interval) clearInterval(this.interval);
        this.isRunning = false;
        this.stopRepeatSignals();
        this.setInitialTime();
        this.isExpired = false;
        this.pauseResumeBtn.disabled = false;
        this.startStopBtn.textContent = 'Start';
        this.pauseResumeBtn.textContent = 'Pause';
        this.warning10Triggered = false;
        this.warning5Triggered = false;
        this.updateDisplay();
        this.updateInputDisabled();
    }

    pauseTimer() {
        if (this.isExpired) return;
        if (this.interval) {
            clearInterval(this.interval);
            this.isRunning = false;
            this.pauseResumeBtn.textContent = 'Resume';
        }
        this.isPaused = true;
        this.stopRepeatSignals();
    }

    resumeTimer() {
        if (this.isExpired) return;
        if (this.isRunning) return;
        if (this.remainingSeconds <= 0) this.setInitialTime();
        this.isRunning = true;
        this.isPaused = false;
        this.interval = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                this.updateDisplay();
                this.checkWarnings();
                if (this.remainingSeconds === 0) {
                    this.onTimerExpire();
                }
            } else if (this.isExpired) {
                this.remainingSeconds--;
                this.updateDisplay();
            }
        }, 1000);
        this.pauseResumeBtn.textContent = 'Pause';
        this.updateInputDisabled();
    }

    restartTimer() {
        if (this.interval) clearInterval(this.interval);
        this.isRunning = false;
        this.stopRepeatSignals();
        this.setInitialTime();
        this.isExpired = false;
        this.pauseResumeBtn.disabled = false;
        this.startStopBtn.textContent = 'Start';
        this.pauseResumeBtn.textContent = 'Pause';
        this.warning10Triggered = false;
        this.warning5Triggered = false;
        this.updateDisplay();
        this.updateInputDisabled();
        this.startTimer();
        this.startStopBtn.textContent = 'Stop';
    }

    onStartStop() {
        if (this.startStopBtn.textContent === 'Start') {
            this.startTimer();
            this.startStopBtn.textContent = 'Stop';
            this.pauseResumeBtn.textContent = 'Pause';
        } else {
            this.stopTimer();
        }
    }

    onPauseResume() {
        if (this.pauseResumeBtn.textContent === 'Pause') {
            this.pauseTimer();
        } else if (this.pauseResumeBtn.textContent === 'Resume') {
            this.resumeTimer();
        }
    }

    onRestart() {
        this.restartTimer();
    }

    onRepeatCheckChange() {
        const enabled = this.repeatCheck.checked;
        this.repeatCountInput.disabled = !enabled;
        this.repeatIntervalInput.disabled = !enabled;
        if (!enabled && this.isExpired) this.stopRepeatSignals();
    }

    onInputChange() {
        if (!this.isRunning && !this.isExpired) {
            const mins = parseInt(this.inputMin.value) || 0;
            this.remainingSeconds = mins * 60;
            this.updateDisplay();
        }
    }

    updateInputDisabled() {
        this.inputMin.disabled = (this.isRunning || this.isExpired);
    }
}

// ---- Global timers management ----
const timers = [];
let timerCounter = 0;
const MAX_FREE_TIMERS = 2;

function addTimer() {
    if (timers.length >= MAX_FREE_TIMERS) {
        alert('Pro version required to add more than 2 timers.');
        return;
    }
    timerCounter++;
    const containerId = `timer-container-${timerCounter}`;
    const container = document.createElement('div');
    container.id = containerId;
    document.getElementById('timers-container').appendChild(container);
    const timer = new Timer(containerId, timerCounter);
    timers.push(timer);
}

document.getElementById('addTimerBtn').addEventListener('click', addTimer);
addTimer();

// ---- Click anywhere to stop blinking for all timers ----
document.addEventListener('click', () => {
    timers.forEach(timer => timer.stopBlinking());
});

// ---- Always on Top ----
const win = getCurrentWindow();
let isOnTop = false;
const onTopBtn = document.getElementById('toggleAlwaysOnTop');

onTopBtn.addEventListener('click', async () => {
    try {
        isOnTop = !isOnTop;
        await win.setAlwaysOnTop(isOnTop);
        onTopBtn.textContent = isOnTop ? '📌 On Top (active)' : '📌 On Top';
    } catch (err) {
        console.error('Error toggling always on top:', err);
    }
});

// ---- Opacity via CSS (app content only) ----
const opacitySlider = document.getElementById('opacitySlider');
const appContainer = document.querySelector('#app');

opacitySlider.addEventListener('input', () => {
    const val = parseInt(opacitySlider.value) / 100;
    appContainer.style.opacity = val;
});