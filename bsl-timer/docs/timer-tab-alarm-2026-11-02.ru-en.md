# Timer tab alarms / Сигнализация вкладок — 2026-11-02

## RU

Изменения вошли в локальные дистрибутивы 1.1.6; статус проверки и подписи —
в [описании подготовки](release-1.1.6.md).

- Работающий таймер: вкладка в цвете темы, постоянный диод того же цвета.
- Незапущенный таймер: более бледная вкладка в цвете темы, с читаемой надписью.
  Пауза сохраняет янтарный диод.
- Просрочка: постоянно красная вкладка и красный диод с периодом 1000 мс
  (500 мс горит, 500 мс погашен), синхронно с диодом циферблата.
  Диод увеличен с 5 до 7 px при базовом масштабе.
- Короткий писк 880 Гц длительностью 125 мс следует тому же ритму. Используется
  существующий нативный аудиомодуль и выбранное общее устройство вывода.
- Mute на вкладке отключает только её ритмичный писк. Красный цвет и диод
  остаются; повторное нажатие возвращает писк. Остановка или новый запуск
  сбрасывают Mute. Кнопка не меняет выбранную вкладку.
- Несколько просроченных таймеров используют общий ритм без наложения писков.
  Во время штатного звукового сигнала конкретного таймера его дополнительный
  писк подавляется. Настройки штатного сигнала и Информера не меняются.
- Основной диод Glass на дисплее сохраняет полупериоды 500/500 мс;
  вкладки и писк используют ту же фазу из общего обработчика.

Проверки: автоматические тесты, сборка Vite и `cargo check --offline --locked`.
В изолированном браузере с имитацией Tauri проверены смена состояний во времени,
фоновое завершение, Stop/Start, Mute, RU/EN, Free/Pro, размеры шрифта,
Light/Dark/Glass и Blue/Green/TAN. Это не проверка установленного приложения,
нативного захвата Glass или фактического звука на аудиоустройстве.

## EN

Included in local 1.1.6 packages; see the [release handoff](release-1.1.6.md)
for actual validation and updater-signing status.

Running tabs use the theme color with a steady matching lamp. Idle tabs are
a paler theme color with readable lettering; paused timers retain their amber lamp. Overdue tabs stay red, with
a larger red lamp cycling in sync with the display (500 ms on/off) and a synchronized 125 ms,
880 Hz beep through the existing native audio engine and selected output.

Each overdue tab has a Mute toggle for its rhythmic beep. Visual alarms continue;
Stop or a new run resets Mute. The button does not select its tab. Multiple
overdue timers share one audible beat without overlapping beeps. An existing
completion sound suppresses that timer's additional beep while playing; its
sound and informer settings remain unchanged. The main Glass display lamp
retains its existing 500/500 ms timing.

Validation includes automated tests, Vite build, offline Cargo check and
isolated browser UI checks with a mocked Tauri bridge. Installed-app behavior,
native Glass capture and actual audio output have not been validated here.
