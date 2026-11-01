# Адаптивные надписи Glass / Adaptive Glass labels

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

2026-10-31, только экспериментальный Таймер / Timer-local experiment only.

Уточнение палитры: маска передаёт не только покрытие глифов, но и оттенок
выбранной схемы. Тёмные чернила смешиваются с нейтральным тёмно-серым,
светлые — с очень светлой нейтральной основой. TAN использует тёплый
оттенок подсветки. При смене схемы маска обновляется. Проверены смены
синей/зелёной/TAN-палитр на обоих фонах сравнением пикселей надписи.

Нижняя проекция толщины уменьшена на четверть: 1,8 → 1,35 от глубины;
правая остаётся 0,65. Подогнаны запас высоты окна и контактная тень.
Проверены три масштаба в RU/EN, диаметр индикатора 0,9 rem и размещение
внутри дисплея. Обычная Vite-сборка и Cargo check без эксперимента прошли.

Palette refinement: the mask carries the active palette hue as well as
coverage. Dark ink blends that hue with dark gray; light ink blends it
with a near-white neutral base. TAN uses its warm backlight hue. Native
pixel comparisons verified blue/green/TAN changes on both backgrounds.
The bottom extrusion is reduced by 25%, from 1.8 to 1.35 times depth;
the right extrusion remains 0.65. Window clearance and contact shadow
follow the new height. Three sizes in RU/EN, the doubled LED diameter
and fit, ordinary Vite build, and default-feature Cargo check passed.

Обычные надписи выделены в отдельную маску покрытия глифов. WebView2
снимает основу интерфейса без этих надписей и маску с исходным шрифтом,
положением и сглаживанием. GPU выбирает светлые или тёмные чернила по
яркости уже составленной поверхности непосредственно под каждым пикселем
буквы. Поэтому цвет может изменяться внутри надписи и отдельной буквы,
включая движение окна без новых снимков текста. Обводка не возвращается.

Маска кэшируется до изменения текста, геометрии или состояния элементов.
Обновлённая пара основы и маски публикуется вместе; промежуточные проходы
WebView не показываются в нативном слое. Цветные цифры и Glow дисплея,
индикатор просрочки и цветные значки не включены в адаптивную маску.
Значения в полях сохраняют светлый цвет на собственной тёмной подложке.

Индикатор увеличен до двойного исходного диаметра: 0,9 rem вместо 0,45 rem.
Ритм сохранён: 500 мс горит, 500 мс погашен.

Проверены HLSL и локальная сборка Tauri. На снимках собственного окна
проверены тёмные буквы на светлом фоне, светлые на тёмном, оба цвета внутри
одной надписи на разделённом фоне и обновление при перемещении HWND.
Измеренный цикл индикатора в DOM — 1000 и 1001 мс. Физическая задержка
монитора не измерялась. Механизм не переносился в Core и не публиковался.

EN: Ordinary labels use a separate glyph coverage mask captured by WebView2
with their original fonts, placement, and antialiasing. The GPU selects light
or dark ink from the composed surface luminance beneath each glyph pixel,
including changes inside one label or letter and during window movement.
The cached mask updates only when label content, geometry, or state changes.
Base and mask updates are committed together; intermediate capture passes
are not presented by the native compositor. Colored readout digits and Glow,
the warning LED, and colored icons retain their original treatment. Field
values retain light text over their own dark input surfaces.

The LED diameter is now twice its original size, with 500 ms on/500 ms off.
HLSL/Tauri builds and native-window pixel checks passed for light, dark,
split backgrounds, and moving-window updates. Physical presentation latency
was not measured. No Core transfer or publication was made.
