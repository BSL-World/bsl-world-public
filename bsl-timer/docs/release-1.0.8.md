# BSL-Timer 1.0.8 — кандидат для приёмки / acceptance candidate

## Результат установленной проверки, 30 октября

Пользователь подписал обе редакции; обе подписи и SHA-256 повторно проверены.
Пользователь установил 1.0.8 и сообщил о недостаточном ощущении материала,
отсутствии регулятора размытия и двойной нижней кромке полей времени/Start
(снимок `D:\BSL-Updates\Glass02.jpg`). Приёмка Glass не пройдена, публикация
1.0.8 не разрешена. Сила нативного размытия сейчас фиксирована на 0,75;
существующая прозрачность не передаёт её изменение в Glass backend.

В рабочих исходниках после сборки 1.0.8 удалена только внешняя нижняя тень
трёх полей времени и Start в Glass. Браузерное сравнение 48 сочетаний
Free/Pro, RU/EN, размеров шрифта и оформлений подтвердило сохранение геометрии,
цветов, текста, теней остальных кнопок и поведения других оформлений.
Снимки до/после проверены. Это исправление ещё не включено в установленную
версию; регулятор размытия пока не реализован. Изменённый установщик под
номером 1.0.8 повторно не выпускать; для следующей сборки нужен новый номер.

Installed acceptance has not passed: the user reported missing blur control,
insufficient material appearance and doubled lower control edges. Both updater
signatures and hashes were verified. The working CSS now removes only the outer
lower shadow of the three duration inputs and Start in Glass; 48 browser
comparisons passed. This source fix is not in installed 1.0.8. Blur control
remains unimplemented. A changed installer requires a new version number.

## Состав

Кандидат собирается из сохранённого последнего согласованного Glass без
добавления функций или новых визуальных экспериментов. Главное окно и Информер
используют прозрачный корпус с мягким нативным размытием, чёткие ободки,
отдельную рамку табло и независимые палитру, контраст надписей и Glow 0–300%.
Вспомогательные окна сохраняют прежнее оформление. Сохранены исправления
живого времени Информера из 1.0.5 и последующие исправления Glass.

Общая реализация уже находится в desktop-core 0.6.1; продуктовые формы и
расположение элементов остаются в Timer. Новая реализация Core этой задачей
не добавляется. Сборки явно включают `native-glass-preview`, который подключает
`bsl-desktop-window/composition-preview`; обычная сборка без этого флага не
является эквивалентом данного кандидата.

Версия согласованно обновлена в package.json, package-lock.json, Tauri,
Cargo.toml, Cargo.lock и «Что нового» RU/EN. Публичная стабильная версия
остаётся 1.0.3 до приёмки и отдельного разрешения на публикацию.

## Артефакты

Каталог: `src-tauri/target/release-handoff/1.0.8`.

- `bsl-timer_1.0.8_free_x64-setup.exe` и `bsl-timer_1.0.8_pro_x64-setup.exe`.
- Отдельные EXE, снимки production-файлов `free-dist.zip` / `pro-dist.zip`.
- `sha256.json` — контрольные суммы готовых файлов.
- `sign-installers.ps1` — подпись существующим ключом с безопасным вводом пароля
  непосредственно в PowerShell; пароль не передаётся в чат.
- `signing-success.txt` появляется только после успешной криптографической
  проверки обеих подписей. До этого наличие подписи не заявляется.

Новые установщики не заменяют прежние выпуски с теми же номерами.
Работающий Таймер не останавливается автоматически. Файлы пользователя и
производственный манифест обновлений не меняются.

## Ручная приёмка

Автоматическая подготовка завершена: 108 тестов прошли; NSIS Free и Pro
с `native-glass-preview` собраны. Все четыре файла имеют версию 1.0.8.
Редакции проверены в отдельных production-модулях; маркер нативного Composition
найден в обоих EXE. Версии и lock-файлы согласованы, SHA-256 сохранены.
Браузерная проверка «Что нового» прошла 48 сочетаний RU/EN, Free/Pro,
Small/Normal/Large, System/Light/Dark/Glass с имитацией нативного изменения
размера. Проверены границы содержимого и фокус кнопки закрытия; просмотрены
снимки RU/EN. Эта проверка не является проверкой установленного WebView2.
Подпись и установленная приёмка пока ожидают действий пользователя.

Сначала Pro на основной машине; затем Free на виртуальной машине.
Установка поверх прежней версии, без удаления пользовательских данных.

1. Перед установкой завершить активные отсчёты по своему усмотрению и выйти
   из Таймера через меню трея. После установки проверить версию и редакцию,
   сохранность таймеров, датированных событий и настроек.
2. Проверить соответствие Glass последнему согласованному виду. Переключить
   System / Light / Dark / Glass; проверить отображение после сворачивания,
   возврата из трея, перемещения между мониторами и перезапуска.
3. Glow on/off, интенсивность 0/100/300%, светлые/тёмные надписи; применение
   сохраняет выбор, отмена восстанавливает сохранённое. Палитра независима.
4. PrtScn/ShareX на основном и дополнительном мониторах: фон остаётся видимым.
5. Короткий таймер: отсчёт, завершение, растущая просрочка в Информере и
   повторное напоминание через минуту. Нажатие открывает правильный таймер;
   фоновые тики другого таймера не подменяют карточку. Предупреждения
   за 15/10/5 минут продолжают обновлять оставшееся время.
6. RU/EN и Small/Normal/Large: видимость текста и кнопок, отсутствие наложений,
   доступность закрытия «Что нового» и настроек.

Подписанные локальные файлы ещё не доказывают исправность установленной версии
или реальное автообновление. Публичная публикация и проверка автообновления —
следующие отдельные этапы после приёмки.

## История 1.0.4–1.0.7

Эти версии не исключены из плана оформления истории:

| Версия | Состояние и следующий шаг |
| --- | --- |
| 1.0.4 | Промежуточное исправление: значения просрочки исправлены, время оставалось статичным. Оформлять с этим ограничением. |
| 1.0.5 | Восстановленный снимок `b016600`, сохранившиеся подписанные установщики. Перед архивным выпуском сверить точный состав и подтверждения приёмки. |
| 1.0.6 | Экспериментальное развитие Glass; сопоставить сохранившийся EXE с исходниками и временными стилями. |
| 1.0.7 | Следующий этап Glass; не выдавать нынешний объединённый снимок с Unreleased за точный исторический установщик. |

Сначала сохраняются достоверные сведения и статус этапа. Бинарные вложения и
теги добавляются после установления их соответствия исходникам. Новая стабильная
сборка с последним Glass готовится параллельно и не требует публикации всех
промежуточных установщиков как стабильных.

## English

1.0.8 is an installed-app acceptance candidate containing the approved existing
Glass implementation and accumulated fixes. It introduces no new feature work.
Candidate builds explicitly enable `native-glass-preview`; default-feature builds
are not equivalent. Shared Glass behavior already resides in desktop-core 0.6.1.
Auxiliary windows retain their existing surfaces. RU/EN release notes and all
Timer version/lock files are synchronized. Public stable remains 1.0.3.

Separate Free/Pro installers, executable copies, frontend snapshots and checksums
are retained in the candidate directory. The signing script requests the existing
key password privately and writes success only after verifying both signatures.
No installer is launched or published automatically, and production updater
metadata and user data remain unchanged.

Acceptance covers preserved data, approved Glass appearance, material switching,
Glow preview/apply/cancel, monitor changes and capture, live informer countdown
and overdue updates, correct timer activation, RU/EN and all three font sizes.
Start with installed Pro on the main machine, then Free on a virtual machine.
Historical records for 1.0.4–1.0.7 remain planned with accurate intermediate or
experimental status; source/tag/binary correspondence must precede attachments.
