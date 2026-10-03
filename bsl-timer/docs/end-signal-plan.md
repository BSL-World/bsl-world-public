# BSL-Timer end-of-countdown signal plan

[Russian version](end-signal-plan.ru.md)

## Status

BSL-Timer 0.8.0 delivered the first production stage of the expanded
end-of-countdown signal subsystem. The current development version simplifies
repetition to a number of additional repeats, retains minute-based
start-to-start intervals, and adds Windows system sounds and user audio files.
Live preview and application-wide simultaneous or queued playback remain
available.

An original BSL-World sound collection is postponed until production time is
available. Explicit audio output device selection remains mandatory follow-up
work. The About window can still open on the primary monitor in some
multi-monitor layouts and is tracked as a non-blocking known issue.

## Required user controls

- Number of times the end signal is played.
- Interval between signal plays.
- Signal source:
  - the existing default signal;
  - Windows system sounds;
  - a user audio file selected through the native Windows file picker.
- One application-wide audio output device, including an explicit Windows
  default option.
- A Test or Preview action that uses the pending sound and output-device choices.

## Output-device behavior

Output-device selection has lower implementation priority than repeat and sound
selection, but it is mandatory. The audio architecture must support it from the
start rather than binding playback permanently to the current default device.

The output device is an application-wide BSL-Timer setting. Every timer routes
audio to the same selected device. Per-tab device selection is not part of the
planned interface.

The selected device should be persisted by a stable identifier where Windows
provides one. If it is disconnected or missing, BSL-Timer must fall back safely
to the Windows default device, inform the user, and continue operating. The
available-device list should refresh when Settings opens and after a device
change where practical.

## Sound-source behavior

Windows system sounds are discovered from the Windows Media directory and are
presented with user-readable names. A custom file is selected with the native
picker, retained at its original path, and previewable. An invalid or
unavailable file does not prevent the timer from completing or entering the
overdue state; playback falls back to the existing built-in BSL-Timer signal
and the failure is shown to the user.

Creating an original BSL-World sound collection, whether with Suno or another
production tool, is a content-production task separate from implementing the
sound-selection and playback architecture.

## Architecture constraints

- Timer state and overdue calculations remain independent of audio playback.
- Repeated playback must be cancellable and must not block the interface.
- The signal scheduler, sound source, and output device are separate concerns.
- Settings are persisted separately from timer runtime state.
- The design must handle several timers finishing close together according to
  the user's concurrent-playback setting.
- No sound source may require a network connection during normal playback.

The edition model exposes system sounds and custom files in both Free and Pro.
The audio service currently routes the built-in signal and file-based sources
to the Windows default destination. The next audio stage must route every
source consistently to the application-wide selected output device.

## Approved product decisions

1. The user specifies only the number of additional repeats after the initial
   signal. The duration-based repetition mode is removed because it adds
   ambiguity without sufficient value.
2. The repeat count has no artificial product maximum. `0` means the initial
   play only. The implementation must not pre-schedule an entire very large
   sequence in memory.
3. The interval is measured from the start of one playback to the start of the
   next. A long file may therefore overlap with another instance of itself.
4. Repetition settings and the signal source are stored separately for each
   timer. The output device is an application-wide BSL-Timer setting used by all
   timers.
5. A custom file is played from its original location and is not copied into
   application data. If it is missing, unreadable, or cannot be decoded,
   playback falls back to the existing built-in BSL-Timer signal.
6. The picker accepts WAV, MP3, M4A, AAC, OGG, OGA, Opus, FLAC, WebM, and WMA.
   Actual decoding is performed by WebView2 and therefore may also depend on
   the codecs available in Windows.
7. Signals from several timers may play simultaneously by default. Settings
   provides an Allow signals from different timers to play simultaneously
   checkbox. When disabled, signals play sequentially in timer-completion order.
8. Every feature, including sound settings and presets, is available in Free and
   Pro. The sole functional Pro distinction is support for more than one timer
   tab; Free is limited to one. Existing edition flags must be aligned with this
   rule during implementation.

## Remaining technical details

- Explicit application-wide audio output device selection and fallback to the
  Windows default device.
- Validation of the accepted format list across supported Windows and WebView2
  versions.
- Production of the postponed original BSL-World sound collection.

## Warning signals and tray informer

- Each timer has independent Sound and Informer switches for the 15, 10, and
  5 minute warning thresholds. All warning channels are disabled by default.
- Countdown completion also has independent Sound and Informer switches. Both
  remain enabled by default to preserve sound behavior and expose the new
  visual notification.
- Warning thresholds fire once per countdown run, reset on a new run, remain
  armed across pause and resume, and do not fire retroactively after session
  restoration. Thresholds longer than the countdown duration are skipped.
- Warning signals use one short built-in BSL-Timer sound that is distinct from
  the final end signal. Sound selection remains intentionally unavailable for
  warning signals.
- The timer informer opens above the system tray regardless of whether the main
  window is visible. It never takes keyboard focus or creates a taskbar button.
- The informer remains visible while the sound is playing, stays for another
  three seconds, and then fades out smoothly. Every repeated playback invokes
  it separately instead of keeping it open throughout the repeat interval.
- Each timer can store an optional three-line description. The informer shows
  it together with the timer name and event status; the same description is
  available as the timer tab hover tooltip.
