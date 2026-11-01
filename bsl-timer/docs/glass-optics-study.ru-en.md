# Glass: проверенная оптическая основа / verified optical study

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

2026-10-31. Пользователь подтвердил визуальное направление работающей пробы.
Это один стеклянный элемент в отдельном тестовом окне BSL-Timer,
а не завершённая тема и не новый установщик.

## Реализация

Direct3D 11 шейдер смещает выборку живого фона по всей поверхности,
сильнее у наклонных участков. Есть округлый профиль, фаска, регулируемая
выраженность толщины, отражения и боковая поверхность. Это оптическая
аппроксимация, не трассировка лучей. Толщина не откалибрована в сантиметрах.

Фон получается через DXGI Desktop Duplication. Последний кадр монитора
сохраняется в памяти GPU: при перемещении окна можно выбрать новый участок
даже на неподвижном рабочем столе. Шейдер выбирает участок под стеклом.
Кадры всего рабочего стола на диск не записываются. QA сохраняет только
область собственного тестового окна.

Обычный CompositionBackdropBrush не подошёл: Windows отклоняет прямое
преобразование с сообщением `Backdrop brushes cannot be transformed`.
Проба через CompositionVisualSurface не дала изменения пикселей фона.
Эти варианты сохранены отдельно и не считаются работающим преломлением.

## Ограничение захвата экрана

Чтобы не захватывать свой результат повторно, эксперимент использует
`WDA_EXCLUDEFROMCAPTURE`. Поэтому обычные снимки и трансляции могут
исключать тестовое окно. QA временно останавливает обновление, снимает
ограничение только у собственного окна, сохраняет снимок его области
и восстанавливает режим. Эта специальная процедура **не доказывает
совместимость с обычным PrtScn/ShareX**.

Такое ограничение нельзя незаметно переносить в готовую тему. Перед
полноценной интеграцией нужно сохранить нормальный захват окна.
Установленный Таймер, его настройки и bsl-core не изменены.

Шейдер выбирает монитор, на котором находится основная часть окна.
Одновременное пересечение двух экранов, другие DPI, портретная ориентация,
блокировка сеанса и потеря устройства требуют отдельной приёмки.
Обработка восстановления и поворотов добавлена, но успешная проверка
этих сценариев не заявляется.

## Проверено

- 108 существующих тестов проекта — прошли.
- Компиляция обоих шейдеров и debug-сборка Tauri с экспериментом — прошли.
- `cargo check --offline --locked` без экспериментального feature — прошёл.
- Реальное окно: RU/EN, два профиля и три значения толщины — 12 сочетаний.
- Включение преломления меняет пиксели внутри стекла; текст переключателя
  исключён из сравнения. Средняя нормализованная разница RGB — около 0.047.
- Изменение маркера, движущийся фон и перемещение окна по неподвижному
  фону проверены отдельными сравнениями пикселей.
- Два монитора 1920×1080 при системном масштабе 100%, включая отрицательный
  X. Снимки обоих мониторов просмотрены. Учтена разница CSS-пикселей
  WebView2 и физических пикселей окна.
- Светлый и тёмный тестовый фон просмотрены визуально.
- Пользователь визуально подтвердил удачное оптическое направление.

Полная тема, установщики Free/Pro, обычный внешний захват и клавиатурная
приёмка всей пробы этим экспериментом не проверены. Время в QA JSON
измеряет CPU-вызов настройки, а не полное время GPU-кадра.

## Сохранность и воспроизведение

### Следующая проба: боковина и фаска

По уточнению пользователя отдельная нижняя CSS-плашка удалена.
В том же GPU-изображении построена непрерывная вертикальная экструзия
нижнего контура; сверху она соединена с лицевой поверхностью узкой
плоской фаской. Её высота зависит от настройки толщины. В CSS осталась
только контактная тень. Это вариант для оценки пользователя, не замена
сохранённой одобренной оптической основы.

Шейдеры и debug-сборка прошли проверку. Повторно прошли 12 сочетаний
RU/EN, профилей и толщины, сравнения включённой/выключенной оптики,
обновления маркера, движущегося фона, перемещения по статическому фону
и работы на двух мониторах. Светлый и тёмный снимки просмотрены.
Исходная точка и новая проба сохранены отдельно в
`.task-backups/glass-sidewall-2026-10-31/`.

The follow-up sidewall study removes the separate CSS lower plate and
renders a contiguous vertical extrusion and narrow flat joining chamfer
in the same GPU surface as the face. CSS retains only the contact shadow.
The previous accepted study remains preserved. Shader/build checks and
the 12 native UI cases, live/static backdrop comparisons and two-monitor
checks passed again. This follow-up still awaits the user's visual review.

### Более массивный корпус

Пользователь подтвердил стеклянный характер боковины, но попросил
существенно увеличить толщину. Видимая экструзия увеличена с множителя
0.7 до 3.2: при значении 12 это 38.4 CSS-пикселя вместо 8.4.
Сила преломления, отражения и плоская фаска сохранены. Место под стенку
резервируется внутри тестового окна, чтобы она не накладывалась на управление.
Это ориентир воспринимаемой толщины, не калибровка физических сантиметров.

Проверены 14 сочетаний однотонных светлого/тёмного и сложного фонов,
двух профилей и трёх значений толщины. Контрольные пиксели подтверждают
материал внутри стенки, включая минимальную толщину; CSS-плашки под ней нет.
Проверены видимый клавиатурный фокус и переключение пробелом. Снимки
временно поднимают только тестовое окно и возвращают прежний режим topmost.
Тестовый фон создаётся без активации. Варианты сохранены в
`.task-backups/glass-thickness-2026-10-31/`; прежняя тонкая проба сохранена
в `.task-backups/glass-sidewall-2026-10-31/`.

The user accepted the glass material and requested a substantially thicker
body. Projected sidewall depth now uses factor 3.2 instead of 0.7, while
optical strength, reflections and the flat chamfer remain unchanged. Layout
reserves space for the wall. This is perceived thickness, not centimeter
calibration. Fourteen background/profile/depth cases and keyboard focus/Space
checks passed. The previous thinner study remains preserved separately.

После визуальной оценки массивного варианта экструзия уменьшена до
множителя 1.8: при значении 12 видимая стенка составляет 21.6 CSS-пикселя.
Это промежуточный вариант между первой тонкой стенкой (8.4) и слишком
массивной (38.4). Преломление, отражения и фаска не изменены. Повторно
прошли 14 проверок фонов, профилей и толщины, а также фокуса и пробела.
Текущая проба сохранена в `glass-thickness-2026-10-31/middle/` внутри
`.task-backups`; предыдущие варианты не перезаписаны.

Following visual review, projected extrusion is now factor 1.8, producing
21.6 CSS pixels at the default value of 12. This lies between the first thin
and oversized studies. Optical strength, reflections and chamfer remain
unchanged. All 14 background/profile/depth and keyboard checks passed again.

Папка `.task-backups/glass-optics-study-2026-10-31/` содержит отдельный
исполняемый файл, профиль и копию настроек, снимки, `qa-results.json`,
исходную точку, неудачные технические варианты и первую рабочую GPU-пробу.
Ранние исследования Glass не удалены.

`run-optics.ps1` поддерживает Build, Start, Stop, Test и Capture.
Для воспроизведения используется `study.conf.json` из той же папки.
Build включает `glass-optics-study` в Cargo и
`VITE_BSL_GLASS_OPTICS_STUDY=1` в Vite. Start задаёт отдельный идентификатор,
копию настроек и флаг запуска. Тестовый фон закрывается вместе с пробой.

Без флагов нативная реализация, команда и страница эксперимента не входят
в обычную сборку. Публикация, коммит и перенос в Core не выполнялись.

## EN

The user accepted the visual direction of the live optical study on
31 October 2026. It is one glass element in an isolated BSL-Timer window,
not a completed theme or installer.

A Direct3D 11 shader refracts a live Desktop Duplication frame, with broad
surface deformation, stronger shoulder refraction, reflections, rounded
and bevel profiles, and adjustable perceived thickness. The model is an
optical approximation; thickness is not calibrated to physical centimeters.
Desktop frames remain on the GPU. QA saves only the study window region.

**Important limitation:** to avoid capture feedback, the prototype excludes
itself from capture. Ordinary screenshot and sharing tools can omit it.
QA temporarily freezes the renderer and disables exclusion for its own
window. Those captures do not establish normal PrtScn/ShareX compatibility.
This limitation must be resolved before shipping a full theme.

Validation passed: 108 existing tests, shader compilation, a Tauri debug
build, an offline default-feature Cargo check, 12 RU/EN/profile/depth cases,
pixel comparisons for refraction, live updates and window movement over
a static backdrop, and two 1920×1080 monitors at 100% system DPI including
negative desktop coordinates. Other DPI values, rotated displays, windows
straddling displays, lock/unlock, device loss, normal external capture and
full keyboard acceptance still require testing.

The experiment has separate Cargo/Vite/runtime flags, app identifier and
settings. The installed application and bsl-core were not modified.
Source, executable, previous attempts and captures remain in the local
backup folder. No installer, release, commit or Core transfer was made.

## Технические источники / technical references

- [Microsoft: Composition brushes](https://learn.microsoft.com/en-us/windows/apps/develop/composition/composition-brushes)
  describes backdrop and surface brushes.
- [Microsoft: Desktop Duplication](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/desktop-dup-api)
  describes GPU desktop frames, updates and rotation.
- [Microsoft: SetWindowDisplayAffinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)
  documents exclusion from capture and Windows requirements.
