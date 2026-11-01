# Лицевая крышка Glass / Glass front cover

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

Замкнутая плоская фаска: полоса шириной 0,32 от глубины материала идёт
по всему периметру лицевой плоскости. Наклон её нормали постоянен
поперёк полосы; свет направлен сверху слева. Тонкий контур отмечает
внутренний переход к крышке. Изменение ограничено шейдером собранного
прибора; исходный пробник без интерфейса сохраняет прежний профиль.
Проверены компиляция HLSL, сборка Tauri, снимки на однотонном фоне,
три масштаба в RU/EN и сохранность секундного цикла индикатора.

Closed flat bevel: a strip 0.32 times the material depth follows the entire
front-face perimeter, with constant inclination across the strip and light
from the upper left. A fine inner contour marks the face/bevel junction.
Only the assembled device shader changes; the original UI-free optical
probe retains its profile. HLSL/Tauri compilation, plain-background captures,
three device sizes in RU/EN, and the one-second LED cycle were checked.

Актуальное уточнение: 500 мс горит, 500 мс погашен. Фаза определяется
временем просрочки и обновляется каждые 25 мс. Проверенные интервалы
между включениями: 999 и 999 мс. Это измерение DOM, не задержки монитора.
Описанный ниже двухсекундный вариант заменён этим ритмом.

Current rhythm: 500 ms on, 500 ms off, anchored to overdue time and checked
every 25 ms. Measured DOM pulse periods: 999 and 999 ms. The two-second
version described below has been superseded; monitor latency was not measured.

2026-10-31. Только локальный прототип Таймера / Timer-local prototype only.

Лицевая поверхность получила широкое мягкое отражение и слабый холодный
оттенок поверх внутренней электроники. Дисплей установлен в посадочный
ободок с внутренним затемнением, прежняя выступающая ступенчатая тень
убрана. Под механическими кнопками обозначены посадочные места; при
нажатии положение этих мест сохраняется. Размеры элементов не менялись.

Индикатор просрочки теперь меняет состояние только вместе с отображаемой
секундой: чётные секунды — горит, нечётные — погашен. Таким образом,
полный цикл длится две секунды; отдельной полусекундной фазы нет.
Проверены 165 последовательных выборок за 3,3 секунды: каждое состояние
соответствует цифрам 00:00:00–00:00:03. Это проверка DOM-синхронизации;
время появления кадра на физическом мониторе инструментально не измерялось.

Проверены компиляция шейдера, локальная сборка Tauri, отсчёт, пауза,
рестарт, размещение кнопок в RU/EN и обновление фона при перемещении.
Сделана визуальная проверка снимка собственного экспериментального окна.
Публикации, установщика и переноса в Core не было.

EN: The front cover now has broad soft reflection and a subtle cool tint
above the electronics. A recessed mounting surround seats the display;
the former stepped external shadow is removed. Button seats stay fixed
when the keys travel. Element dimensions are unchanged.

The overdue LED now changes only with the displayed second: even seconds
on, odd seconds off, for a two-second full cycle. All 165 DOM samples over
3.3 seconds matched the displayed seconds. Physical monitor presentation
latency was not measured. Shader/Tauri builds, timer interactions, RU/EN
placement, moving-window backdrop updates, and an own-window screenshot
were checked. No installer, publication, or Core transfer was made.
