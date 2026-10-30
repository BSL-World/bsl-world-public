# BSL-Timer 1.0.3

## Русский

- Нажатие на Информер открывает окно и вкладку показанного таймера, включая
  повторные напоминания о просрочке. Переход сохраняет текущий отсчёт.
- Фоновые обновления других таймеров сохраняют источник показанного напоминания.
- Закрыт найденный сценарий почти одновременного запуска двух экземпляров Windows-приложения.
- Сохранены изменения 1.0.1–1.0.2: скрытие часов и минут у датированного события
  и единое направление колеса мыши для часов, минут и секунд.

Публичная загрузка — Free: один таймер и одно датированное событие.
Pro распространяется отдельно и не прикрепляется к этому выпуску.

Версия записана в CHANGELOG 25 октября 2026. Размещение файлов на сайте и
успешное автообновление Pro подтверждены пользователем 26 октября.
Дата публикации этого Release будет датой фактического завершения публикации
на соответствующей площадке; выпуск не следует датировать задним числом.

Проверки исходной окончательной сборки: 99 тестов; сборки Free/Pro;
криптографическая проверка подписей обновления. Пользователь подтвердил установку
Free на виртуальной машине, нажатие на Информер и прокрутку длительности,
а также автообновление Pro и открытие окна по нажатию на Информер.
Отдельная приёмка автообновления Free, выбора нужной вкладки в Pro и
одновременного запуска не зафиксирована.

30 октября повторно проверены подписи окончательных локальных Free/Pro.
SHA-256 скачанных с сайта установщиков совпадают с окончательными локальными файлами.
Подпись обновлений Tauri/minisign не является подписью Windows Authenticode.

## English

- Click the informer to open the displayed timer window and tab, including
  repeated overdue reminders, while preserving the countdown.
- Background updates from other timers preserve the source of the displayed reminder.
- Fixed a Windows startup race that could allow simultaneous duplicate instances.
- Includes the 1.0.1 dated-event time visibility option and the 1.0.2 duration-wheel fix.

Free is the public download: one timer and one dated event. Pro is distributed
separately and is not attached to this public release.

The changelog version date is 25 October 2026. Website publication and a real
Pro update were confirmed by the user on 26 October. This repository Release
must use its actual publication date; it must not be backdated.

Original final-build validation: 99 automated tests, Free/Pro builds and
cryptographically verified updater signatures. The user confirmed Free
installation on a virtual machine, informer activation and duration-wheel
behavior, plus a real Pro update and informer window activation. Separate Free
updater, Pro tab-selection and simultaneous-launch acceptance are not recorded.

On 30 October, final local Free/Pro updater signatures were verified again.
Website installer SHA-256 values match the final local artifacts.
Tauri/minisign updater signatures are separate from Windows Authenticode.

## Free download / Загрузка Free

File: `bsl-timer_1.0.3_free_x64-setup.exe` — 4,071,593 bytes.

SHA-256: `90a4d5db10eeb1ffd5e051df9964eab14e1306bb453cfcc73fd409b44eb25352`.

[Download Free / Скачать Free](https://bsl-world.ru/download.php?product=bsl-timer&file=bsl-timer_1.0.3_free_x64-setup.exe&source=release)
