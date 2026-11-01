# BSL-Timer 1.1.3 — Glass

1 ноября 2026. Пользователь принял внешний вид Glass и разрешил сборку Free/Pro,
обновление документации, коммит и push. Публикация установщиков и изменение
производственных манифестов обновления в эту задачу не входят.

## Изменения

Главное окно в Glass — прозрачный объёмный прибор с живым преломлением фона,
правой и нижней стенками, плоской фаской и тонированной лицевой поверхностью.
Внутри видны декоративная плата, контроллер, три конденсатора, дорожки,
шлейф дисплея и парные проводники кнопок и полей ввода.

Основной дисплей и три поля ввода оформлены отдельными ЖК-модулями.
Механические кнопки имеют быстрый нативный ход; три позиции управления
постоянны, недоступные кнопки обесцвечены. Надписи и верхние иконки адаптируют
контраст к поверхности под ними, в том числе при перемещении окна. Название
и подписи полей имеют тонкий рельеф гравировки. Кнопка событий получила видимую
подсказку RU/EN. Палитра тонирует поверхность, подсветку и кнопки; TAN использует
цвет подсветки. Сохранены живые настройки Glow.

Предусмотрены три масштаба всего прибора независимо от размера шрифта.
Индикатор просрочки расположен внутри дисплея, место зарезервировано заранее;
мигание — 500 мс включён / 500 мс выключен. Рост просрочки не меняет геометрию.

Реализация остаётся локальной для Timer. Core и оформление вспомогательных окон
не изменены. Светлая, тёмная и системная темы сохраняют прежнюю разметку.
Режим Glass автоматически активируется выбранным оформлением, без переменных
окружения и отдельной экспериментальной страницы.

При подключении к обычному окну удалены прежние декоративные контуры,
накладывавшиеся на новый корпус. Запросы размеров прибора идут через общую
очередь главного окна; декоративный вылет рамки дисплея исключён из измерительной
копии. Сетевая проверка обновлений не задерживает запуск рендерера.

1.1.0 сохранён только как промежуточный локальный Free-кандидат. После расширенной
проверки масштабирования он заменён версией 1.1.3 до передачи пользователю.
Кандидаты 1.1.1 и 1.1.2 также не публиковались: заключительная проверка добавила
восстановление исходных подписей и обычной подсказки при выходе из Glass и
исправление фиксации кадра для снимков.

## Выполненные проверки

- 108 автоматических тестов прошли на исходниках 1.1.3.
- Обычная точка входа, изолированные данные, без переменных включения эксперимента:
  ввод трёхзначных часов, стрелки клавиатуры, фокус, запуск, пауза, рестарт,
  блокировка полей и живое преломление при перемещении — Free и Pro.
- По 18 сочетаний RU/EN × Small/Normal/Large шрифта × три масштаба прибора:
  элементы помещаются, размеры растут последовательно. Исправление измерения
  рамки дополнительно проверено в работающем Free до упаковки.
- Обычная точка входа Pro: повторные и быстрые переходы Glass/Light/Dark,
  возврат к геометрии выбранного материала, отступ кнопки закрытия.
- Адаптивные надписи и все шесть иконок на светлом/тёмном фоне, разделённый
  фон и перемещение, Blue/Green/TAN, подсказка событий RU/EN.
- Просрочка продолжает расти, период индикатора — 1000 мс, полупериоды по 500 мс.
- 48 браузерных проверок окна «Что нового» с имитацией нативных размеров:
  Free/Pro, RU/EN, три шрифта, четыре оформления, размещение и фокус закрытия.
- Визуально просмотрен собственный кадр Pro без прежнего контура.
- На изолированном нативном 1.1.3 проверены клавиши F8 → Win+Shift+S,
  прямой Win+Shift+S и Escape. WinAPI подтверждает доступность окна для захвата
  и последующее восстановление исключения из Desktop Duplication. Это проверка
  режима захвата; выбор области и сохранение файла самими «Ножницами» остаются
  пользовательской проверкой.
- В браузере проверены переходы Glass/Light/Dark в Free/Pro и RU/EN:
  вне Glass возвращаются прежние переведённые подписи и обычная подсказка событий.

Эти проверки не являются проверкой установленного приложения.
Нативные проверки геометрии и управления выполнялись на изолированных EXE
1.1.0/1.1.1 с заключительными стилями; проверка горячих клавиш — на 1.1.3.
Заключительные изменения обычных подписей/подсказок проверены в браузере на
текущих исходниках. Эти различия сохраняются в локальном `candidate-status.json`.

## Сборка и ограничения

Нативный backend включён стандартной Cargo-возможностью `glass-device`.
Для преломления нужны Windows, D3D11 и Desktop Duplication. При снимке стекла
можно использовать F8 перед Win+Shift+S: кадр фиксируется до снимка, Escape
или тайм-аута. Обычный захват исключён из Desktop Duplication, чтобы избежать
зеркальной обратной связи. Поддержка снимков без фиксации не гарантируется.

Локальные установщики, EXE, снимки frontend и SHA-256:
`src-tauri/target/release-handoff/1.1.3`. Подпись обновлений требует существующего
ключа и ввода его пароля пользователем через приложенный PowerShell-скрипт.
Неподписанные установщики не объявляются пригодными для автообновления.

Проверки и фактический статус артефактов записываются в `candidate-status.json`.
Проверка изолированного EXE не заменяет приёмку установки поверх прежней версии.
Установка, сохранность данных после установки и реальное автообновление требуют
отдельной проверки. Информер не перерабатывался.

## English

The user accepted the Glass appearance and authorized Free/Pro packaging,
documentation, commit and push. Installer publication and production updater
manifests are outside this task.

The Glass main window is a transparent instrument with live desktop refraction,
sidewalls, a flat bevel, palette-tinted front cover, decorative electronics,
display ribbon and paired button/input wiring. The main readout and three inputs
are distinct LCD modules. Mechanical buttons use native press feedback; labels
and toolbar icons adapt contrast per pixel. Body labels have subtle engraved
relief. Three device sizes are independent of font size. The overdue indicator
has reserved space and a 500 ms on / 500 ms off cycle.

Implementation remains Timer-local. Core and auxiliary windows are unchanged.
Glass activates through the normal appearance selection; other appearances
retain their existing layout. The native backend is included by the default
`glass-device` Cargo feature. Windows D3D11 and Desktop Duplication are required
for refraction. F8 freezes a Glass frame for capture, ending on clipboard change,
Escape or timeout. Unfrozen screenshot compatibility is not guaranteed.

Artifacts, frontend snapshots, SHA-256 and actual validation status are retained
in the local 1.1.3 handoff directory. Updater signing requires the existing key
password entered privately in PowerShell. Installed upgrade acceptance and real
updater delivery are separate from isolated executable validation.

Validation includes 108 automated tests; ordinary-entry isolated Free/Pro timer
interactions; 18 font/device/language layout combinations per edition; material
transitions, adaptive icon/text contrast, tooltip translations and overdue timing;
48 browser release-note layouts; and visual inspection of the final Pro window.
Legacy rounded contours were removed from the main entry. Layout requests share
the main window queue; decorative readout-frame overflow is excluded from the
measurement copy. Updater network checks do not block renderer startup.
The intermediate local 1.1.0 Free candidate was superseded before delivery.
Local 1.1.1 and 1.1.2 candidates were also superseded without publication.
Final native 1.1.3 keyboard validation covers F8 followed by Win+Shift+S,
direct Win+Shift+S and Escape, checking WinAPI capture affinity transitions.
Selecting a region and saving the Snipping Tool image remains user acceptance.
Geometry and timer interactions were validated in isolated 1.1.0/1.1.1 executables
with final styles; final ordinary-caption/tooltip restoration was checked in the
browser using current sources. These do not constitute installed-upgrade tests.
