# BSL-Timer 1.1.7 — тема вспомогательных окон и «Что нового» / auxiliary appearance and release notes

3 ноября 2026. Free/Pro собраны и подписаны, пользователь подтвердил проверку
на виртуальной машине. По прямому разрешению пользователя установщики и подписи
размещены на сайте; производственный `latest.json` переключён на 1.1.7
в `2026-11-03T14:32:01Z`. Скачанные установщики проверены по SHA-256 и подписям,
публичный манифест сверён по всем трём целям. Старая версия манифеста сохранена.
После публикации пользователь подтвердил успешное реальное автообновление
приложения: «Я только что обновил». Редакция и исходная версия не уточнены.
Страница продукта, GitHub/GitVerse, коммиты и push этой публикацией не затронуты.

## RU

- При включении «Стекла» настройки, редактор события, «О программе» и «Что нового»
  сохраняют предыдущий светлый, тёмный или системный режим. При отсутствии
  сохранённого режима в старых настройках используется тема Windows.
- Отмена предпросмотра восстанавливает оформление. Системный режим продолжает
  реагировать на смену темы Windows, в том числе при выбранном Glass.
- «Что нового» RU/EN показывает накопленные изменения после публичной 1.0.3:
  сначала появление Glass, затем управление прибором, вкладки, Mute и живое
  время Информера. Окно автоматически подстраивается под содержимое.
- Сохранены возможности 1.1.6: общий ритм диодов и писка 500/500 мс,
  красные просроченные вкладки, Mute и существующее поведение Информера.

117 тестов прошли на исходниках 1.1.7. Для исправлений проверены обе frontend-сборки
и 48 браузерных сочетаний
«Что нового» проверены. Проверены настройки RU/EN × три шрифта × обе редакции,
переходы Light/Dark/System → Glass, смена системной темы и Apply/Cancel.
Фактические результаты финальной упаковки и проверок — в
`src-tauri/target/release-handoff/1.1.7/candidate-status.json`.

Нативные NSIS-сборки Free/Pro завершены. Версии всех четырёх EXE проверены
как 1.1.7, редакции frontend сверены, контрольные суммы рассчитаны.
В том же каталоге — отдельные Free/Pro установщики и EXE, снимки frontend,
исходников, контрольные суммы, скрипт подписи и инструкция приёмки. Пароль ключа
пользователь вводит локально; подписи создаются заново для окончательных файлов.
Подпись обновлений не является Authenticode.

Предыдущие подписанные артефакты 1.1.6 сохранены в соседнем каталоге.
Начатая пересборка с тем же номером остановлена до получения установщика;
окончательные кандидаты используют 1.1.7, чтобы проверить обновление 1.1.6 → 1.1.7.
Работающее приложение пользователя не запускается и не закрывается.
Проверки старых нативных EXE 1.1.6 не объявляются проверками новых файлов.
Пользователь позднее сообщил: «На виртуалке всё хорошо». Редакция, исходная версия
и отдельные сценарии в сообщении не уточнены. После публикации пользователь
подтвердил успешное сетевое автообновление до 1.1.7, без уточнения редакции
и исходной версии. Pro остаётся частной сборкой. Производственный
updater теперь указывает на 1.1.7. Инструкция сайту: [постоянная передача](bsl-timer-website-handoff.md).

## EN

Glass retains the preceding light, dark or system appearance for Settings,
the event editor, About and What's New. Missing legacy preferences fall back
to Windows; cancellation restores the appearance and System continues to follow
Windows changes. Cumulative RU/EN release notes since public 1.0.3 start with
Glass, followed by instrument controls, tab alarms, Mute and live informer time.
Existing 1.1.6 timer and informer behavior is retained.

Local Free/Pro candidates are prepared separately for user signing and VM
acceptance. Tests and mocked-browser validation do not replace installed-app
acceptance. The user subsequently reported successful VM verification; edition,
previous version and individual scenarios were not specified. Both installer
signatures have been cryptographically verified. After publication, the user
confirmed successful real updater delivery; edition and previous version were
not specified. Actual final artifact and signing status is recorded in the local
candidate status. Earlier 1.1.6 artifacts remain preserved. Installers and
signatures were uploaded with explicit user authorization; the production updater
manifest was atomically switched to 1.1.7 at 2026-11-03T14:32:01Z and verified
over HTTPS. No product-page edit, GitHub/GitVerse release, commit or push was made.
Pro remains separately distributed without a public download button.
