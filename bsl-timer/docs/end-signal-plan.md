# BSL-Timer end-of-countdown signal plan

[Russian version](end-signal-plan.ru.md)

## Target

The expanded end-of-countdown signal subsystem is planned for BSL-Timer 0.8.0.
The focused About-window corrections remain planned for the 0.7.3 patch release.

## Required user controls

- Number of times the end signal is played.
- Interval between signal plays.
- Signal source:
  - the existing default signal;
  - a bundled BSL-World sound collection that works offline;
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

Bundled BSL-World sounds must remain available offline. Windows system sounds
must be presented with user-readable names. A custom file must be selected with
the native picker, validated before it is saved, and previewable. An invalid or
unavailable custom file must not prevent the timer from completing or entering
the overdue state; playback falls back safely and the failure is shown to the
user.

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

The current edition model already declares `selectableSoundDevice`,
`systemSounds`, and `customSounds`, but currently disables them for Free. The
implementation must enable them in both editions. The current `SignalPlayer`
generates one fixed Web Audio signal and connects it to the default destination.
That hard-wired path must be replaced with an audio service that routes every
supported source to the selected output device consistently.

## Approved product decisions

1. The user chooses one of two repetition modes:
   - a number of additional repeats after the initial signal;
   - a period of time during which the signal continues to repeat.
2. The repeat count has no artificial product maximum. `0` means the initial
   play only. The implementation must not pre-schedule an entire very large
   sequence in memory.
3. The interval is measured from the start of one playback to the start of the
   next. A long file may therefore overlap with another instance of itself.
4. Repetition settings and the signal source are stored separately for each
   timer. The output device is an application-wide BSL-Timer setting used by all
   timers.
5. A custom file is played from its original location and is not copied into
   application data. If it is missing, playback falls back to a bundled signal;
   the exact fallback sound will be selected separately.
6. Common music formats are guaranteed. Additional formats, including unusual
   lossless formats, may work when a system decoder is available. The exact
   guaranteed list depends on the selected audio library.
7. Signals from several timers may play simultaneously by default. Settings
   provides an Allow signals from different timers to play simultaneously
   checkbox. When disabled, signals play sequentially in timer-completion order.
8. Every feature, including sound settings and presets, is available in Free and
   Pro. The sole functional Pro distinction is support for more than one timer
   tab; Free is limited to one. Existing edition flags must be aligned with this
   rule during implementation.

## Remaining technical details

- Interval unit, range, and default value.
- Duration-mode range and default value.
- What happens to a long file already playing when the repetition period ends.
  The preliminary recommendation is to stop scheduling new repeats without
  cutting off playback that has already started.
- The guaranteed base-format list after the audio library is selected.
- The bundled fallback sound.
