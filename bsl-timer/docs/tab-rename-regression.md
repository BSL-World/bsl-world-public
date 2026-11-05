# Timer tab rename regression / Переименование вкладки

Run `npm run test:tab-rename` on Windows with Microsoft Edge installed.
This is a separate browser check; `npm test` runs the unit tests.

The check uses the application's live DOM, real keyboard input and recurring
Glass ink captures with mocked native IPC. It covers Free/Pro, RU/EN and
Glass/Light/Dark/System: focus and draft retention during countdown and expiry,
Enter, Escape with a changed draft, the ink-mask exclusion and selection range,
per-tab Mute, continuing overdue blinking, and Pro tab selection.
Screenshots are saved under `.task-backups/tab-rename-browser/ui`.

The native window and captures are mocked. The harness tolerates the existing
`Content does not fit` measurement error in its mocked viewport; it does not
validate native window sizing, desktop refraction, audible output or an installed
application. Installed-app acceptance remains a separate check.

Запуск: `npm run test:tab-rename` в Windows с установленным Microsoft Edge.
Это отдельная браузерная проверка; `npm test` запускает модульные тесты.

Проверяются Free/Pro, RU/EN и четыре режима оформления: сохранение фокуса и
введённого имени во время отсчёта и перехода в просрочку, Enter, отмена изменённого
имени через Escape, выделение текста и исключение поля из маски Glass, Mute,
продолжающееся мигание просрочки и переключение вкладок Pro.

Нативные вызовы имитируются. Проверка допускает существующую ошибку измерения
`Content does not fit` в имитируемом окне. Реальные размеры окна, стеклянное
преломление рабочего стола, слышимый звук и установленное приложение этой
проверкой не подтверждаются.
