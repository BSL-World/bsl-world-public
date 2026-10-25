# BSL-Timer 1.0.3 — изменения и подготовка выпуска

Документ для подготовки страницы версии, записи в блог и сопроводительных материалов. Состояние на 25 октября 2026 года.

## Статус версии

Предварительные установщики Free и Pro 1.0.3 были собраны и подписаны, но не опубликованы. При повторном просмотре найдена порча двух новых русских строк в «Что нового». Исходники исправлены; прежние установщики не предназначены для публикации. Пользователь разрешил сохранить 1.0.3 для неопубликованной пересборки. Окончательные Free и Pro пересобраны в каталоге 1.0.3-final; исправленный русский текст проверен в production-файлах. Ожидается новая подпись.

Публикация 1.0.3 пока не выполнена. Проверка поведения установленного приложения и визуальная проверка RU/EN ещё не завершены. Материалы можно готовить как черновики; дату публичного выхода нужно подтвердить при публикации.

## Что нового в 1.0.3

### Переход к таймеру из Информера

Нажатие на Информер открывает главное окно и выбирает вкладку таймера, показанного в уведомлении. Это относится и к повторным напоминаниям о просрочке: если открыта другая вкладка, приложение переключается на нужный таймер. Фоновые обновления других таймеров не подменяют данные показанного напоминания. Сам переход не останавливает и не перезапускает отсчёт.

Изменение входит в Free и Pro. Переход между несколькими вкладками актуален для Pro, поскольку во Free доступен один таймер.

### Защита от одновременного запуска нескольких экземпляров

Исправлен найденный сценарий, при котором почти одновременные запуски могли создать два экземпляра BSL-Timer с отдельными окнами и значками в трее и на панели задач. Повторный запуск должен обращаться к уже работающему приложению; если оно ещё запускается или не отвечает, второй экземпляр не продолжает работу как самостоятельное приложение.

Защита от повторного запуска была добавлена ранее и не удалялась. В её Windows-плагине обнаружен промежуток между установкой блокировки и созданием служебного окна. Исправление закрывает этот путь. Точное выполнение этого сценария у двух ранее запущенных процессов не было зафиксировано, поэтому не стоит утверждать, что причина конкретного случая доказана трассировкой.

## Сохранившиеся изменения 1.0.1–1.0.2

Эти пункты полезны для общей записи об обновлениях после 1.0.0. Их не следует представлять как впервые появившиеся в 1.0.3.

- **1.0.1:** у датированного события можно скрыть часы и минуты, оставив число дней. Настройка секунд сохраняется отдельно; прежние события сохраняют прежнее отображение.
- **1.0.2:** колесо мыши меняет часы, минуты и секунды в одном направлении. Прокрутка к себе увеличивает значение. Часы не становятся отрицательными, минуты и секунды меняются циклически.

## Основа для материалов

Главные темы версии: переход от напоминания к нужному таймеру и устранение найденного сценария запуска двух экземпляров. В описании пользовательского поведения не нужны подробности mutex, IPC и локальной копии плагина.

Варианты заголовков для дальнейшей редакции:

- «BSL-Timer 1.0.3: переход к таймеру из Информера».
- «Обновление BSL-Timer: нужный таймер по нажатию на напоминание».

Факты о редакциях для страницы продукта:

- Free: один таймер и одно датированное событие.
- Pro: несколько таймеров и несколько датированных событий.
- Публичная загрузка — Free. Pro распространяется отдельно и не должна появляться как общедоступная ссылка на скачивание.
- Для автоматического обновления сохранены отдельные цели Free и Pro.

Не заявлять до фактической проверки и публикации, что обновление уже доступно на сайте, проверено в установленном приложении, прошло визуальную проверку RU/EN или проверено реальным обновлением с предыдущей версии.

Не включать «исправление исчезновения Информера»: такая регрессия ранее не подтвердилась и в эту задачу не входила.

## English release facts

BSL-Timer 1.0.3 adds navigation from the informer to the displayed timer tab, including repeated overdue reminders, and fixes a Windows startup race that could allow duplicate application instances. Background timer updates no longer replace the displayed reminder's source timer.

The release retains the optional date-countdown time display introduced in 1.0.1 and consistent duration-wheel adjustment from 1.0.2. These are earlier changes, not new 1.0.3 features. Free and Pro installers have been built and signed for the updater; publication and installed-app acceptance checks are still pending. Free is the public download; Pro remains separately distributed.

## Что осталось сделать с Git и выпуском

Исходники накопленных изменений 1.0.1–1.0.3 сохранены коммитом `c710aab` и отправлены в оба публичных репозитория. Проверка через ls-remote подтвердила одинаковый main на GitVerse и GitHub. Старые незакоммиченные архивы и локальный AGENTS.md в коммит не включены. Тег окончательной версии и релизные материалы оформляются следующим шагом. Пользователь прямо разрешил коммиты, push и публикацию выпуска.

Порядок завершения:

1. Проверить установленную 1.0.3: повторный и одновременный запуск, переход к просроченному таймеру из повторного напоминания, восстановление свёрнутого окна и сохранность данных. Проверить Free/Pro и видимый интерфейс RU/EN.
2. Просмотреть общий diff и отделить относящиеся к выпуску изменения от старых диагностических и прочих незакоммиченных файлов. Архивы `.task-backups/`, приватный ключ, локальные сборки и служебные результаты не включать в коммит. Локальную копию single-instance плагина и её лицензии включить: это зависимость исправленной сборки. Обновить статус проверок в этом документе.
3. Перед push проверить актуальные ветки и теги обоих удалённых репозиториев. При расхождениях сначала согласовать историю без принудительного push.
4. По прямому указанию пользователя создать коммит подготовленных изменений и тег `bsl-timer-v1.0.3`, затем отправить коммит и тег в GitVerse и GitHub.
5. Оформить описание релиза на обеих площадках. В публичные вложения включать только разрешённые артефакты Free; установщик Pro не публиковать открыто.
6. Опубликовать подписанные артефакты через принятый канал распространения, проверить доступность файлов и только затем обновить производственный манифест. Проверить реальные обновления Free→Free и Pro→Pro с сохранением настроек. Обновить README с фактически опубликованной стабильной версией.

Для других чатов подготовлен отдельный файл product-updates/bsl-timer/1.0.3.md в приватном репозитории bsl-world-internal. Публикация установщиков на сайте и реальная проверка обновления пока не выполнены: требуется подключение к хостингу.

## Техническая запись и доказательства

## Duplicate instances

On 2026-10-25 two processes were observed, PIDs 17108 and 18488, both running
`C:\Users\avasi\AppData\Local\bsl-timer\bsl-timer.exe`. Both reported the
same startup second (12:19:14). These were not separate editions or dev builds.

Git commit ff540c5 (2026-08-22) introduced the single-instance plugin. The
protection remains present; it was not removed in a later release.

The installed dependency tauri-plugin-single-instance 2.4.3 has a Windows
startup gap: CreateMutexW reports ERROR_ALREADY_EXISTS, then FindWindowW can
return null while the owner is still creating its IPC window. In that case
the original plugin returns success and allows a duplicate application.
The process timestamps are consistent with this race, but do not by themselves
prove the exact execution path of the already-running processes.

The local dependency in vendor/tauri-plugin-single-instance keeps the existing
mutex/IPC identity and fixes this branch: wait briefly for IPC, bound message
delivery, and always terminate the secondary process. Mutex/window creation
errors stop setup. The plugin is registered before other plugins.

## Informer

Native cursor passthrough and CSS pointer-event blocking prevented clicks.
Informer payloads now carry eventId. Background active-tab updates cannot replace
an automatic reminder payload; an explicit tray hover can request a preview.
Clicking selects and renders that event before showing/unminimizing/focusing
main. Deleted events are ignored. No timer state is reset by activation.

## Earlier requests

The release retains date-countdown time visibility (1.0.1) and consistent duration
wheel adjustment (1.0.2), including their existing RU/EN release-note entries.
Existing unrelated uncommitted work was backed up before changes in
.task-backups/before-1.0.3-2026-10-25.zip.

## Validation so far

- cargo check --offline: passed.
- Complete Node test run after the encoding fix: 99 passed.
- New informer navigation tests: 2 passed (source handlers executed with mocked
  event/window boundaries, including background updates and deleted events).
- Browser visual verification: not performed; browser runtime failed to start
  with CreateProcessWithLogonW error 1056.
- Installed native runtime / simultaneous launch verification: not yet performed.
- Free and Pro NSIS builds: passed. Both executable/installer versions are 1.0.3.
  Separate artifacts and SHA-256 hashes are saved under
  src-tauri/target/release-handoff/1.0.3-final/ for the final corrected candidate.
- Updater signing: completed for both editions at 19:12 Moscow time on
  2026-10-25; both .sig files, local latest.json and signing-success.txt exist.
  Installer SHA-256 hashes were rechecked after signing and match the saved
  build hashes. These checks establish successful signing output, not a tested
  production updater installation or an independent cryptographic verification.
- Publication: not performed; runtime acceptance remains pending.
