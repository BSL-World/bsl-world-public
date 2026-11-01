# Glass: прибор / instrument study — 2026-10-31

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

Этот первый вариант не принят как визуальное решение. Следующая,
подтверждённая пользователем оптическая проба описана в
[отдельной записи](glass-optics-study.ru-en.md).

This first instrument treatment was not accepted as the visual solution.
The subsequent accepted optical direction is documented in the linked study.

## RU

Локальный прототип главного окна: прозрачный корпус с распределёнными
отражениями и видимой глубиной, отдельный модуль табло, цветные прозрачные
кнопки с боковиной и ходом при нажатии. Цвет кнопок совпадает с основным
цветом цифр; TAN использует цвет подсветки. Под табло расположены
полупрозрачная плата, дорожки, микросхема, шлейф, проводники к видимым
кнопкам и два конденсатора. Разводка пересчитывается при изменении размеров
и набора кнопок, включая паузу и просрочку.

Слой электроники декоративный, исключён из дерева доступности и не
перехватывает мышь. Он скрыт вне Glass. Логика таймера, Информер,
вспомогательные окна и desktop-core не изменены. Пользовательских текстов
не добавлено. Это прототип исходников, новый дистрибутив не собран.

**Ограничение:** SVG-преломление применяется к внутренней электронике.
Фон рабочего стола пока не преломляется. По уточнению пользователя,
эффект сначала следует исследовать и проверить локально в BSL-Timer;
перенос решения в bsl-core обсуждается только после оценки результата.
Толщина корпуса передаётся светом и боковой поверхностью, физическим
сантиметрам на экране она пока не откалибрована.

Проверки и снимки хранятся в
`.task-backups/glass-instrument-2026-10-31/` вместе с исходной копией и
патчем изменений, существовавших до задачи. Автоматический браузерный
стенд использует имитацию Tauri; он не заменяет проверку установленного
приложения, рабочего стола и DPI.

Проверено: 108 существующих тестов, сборки интерфейса Free/Pro и 144
браузерных сочетания RU/EN, Small/Normal/Large, шести палитр, Glow on/off
и Free/Pro. Дополнительно проверены изменение пикселей от внутреннего
преломления, ход кнопки от события мыши, клавиатурный фокус, отсчёт,
пауза, продолжающаяся просрочка и сохранность Light/Dark. Визуально
просмотрены снимки Blue и TAN на синтетическом полосатом фоне.
Установленное приложение и реальный фон рабочего стола не проверены.

## EN

Main-window source prototype: a transparent housing with broad reflections
and visible depth, a separate display module, and translucent colored keys
with sidewalls and visible press travel. Keys use the main digit color;
TAN uses its backlight color. Internal details include a translucent PCB,
traces, a chip, a display ribbon, wires to the currently visible keys and
two capacitors. Wiring follows layout and button visibility changes.

Electronics are decorative, excluded from accessibility and pointer input,
and hidden outside Glass. Timer logic, the informer, auxiliary windows and
desktop-core remain unchanged. No user-facing text was added. No new
installer was built.

**Limitation:** SVG refraction affects internal electronics only. Desktop
background refraction is pending. The user requires local experimentation
and acceptance in BSL-Timer before considering a transfer to bsl-core.
Perceived thickness is not calibrated to physical
centimeters on screen.

The local backup folder above contains the baseline, pre-existing diff,
browser QA and screenshots. Browser QA mocks Tauri and does not substitute
for installed-app, desktop backdrop or DPI acceptance.

Validation: all 108 existing tests and both frontend edition builds passed.
Browser QA covered 144 locale/font/palette/glow/edition combinations, pixel
changes from internal refraction, pointer-driven key travel, keyboard focus,
countdown, pause, continuing overdue updates and unchanged Light/Dark styles.
Blue and TAN screenshots were inspected on a synthetic striped backdrop.
Installed-app appearance and the actual desktop backdrop were not verified.
