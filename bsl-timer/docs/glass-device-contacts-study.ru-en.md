# Glass: контакты и компактность / contacts and compactness

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

2026-10-31, локальный эксперимент / local experiment.

Текущее дополнение: предупреждение постоянно занимает выделенную область
внутри дисплея. В обычном режиме подпись серая, индикатор погашен;
при просрочке фаза индикатора определяется `overdueMs % 1000 < 500`.
Геометрия не зависит от видимости предупреждения. Проверены реальные
переходы через ноль, продолжающийся отсчёт просрочки и сброс в RU/EN
с Small/Normal/Large шрифтами; высота окна и вертикальные координаты
сохраняются. Допуск округления ширины — один физический пиксель.

Отдельный выбор размера прибора рядом с вкладками: Малый 85%, Обычный
100%, Крупный 120%. Выбор локально сохраняется и не меняет настройку
размера шрифта. Масштабируются корпус, дисплей, органы управления,
внутренняя электроника и толщина стекла. Справа от чипа три двухжильных
кабеля; жилы расходятся только перед шестью выводами чипа и контактами
кнопок. Проверены все три размера прибора в RU/EN на отсутствие обрезания.

Current addition: a permanent reserved area inside the display holds the
gray idle caption and unlit LED. In overdue mode the LED phase follows
`overdueMs % 1000 < 500`. Real expiry, continuing overdue counting, and reset
were checked in RU/EN at three font sizes. Window height and vertical
positions remain stable; width rounding allows one physical pixel.
An independent device size selector offers 85%, 100%, and 120%, persists
locally, and leaves the font-size preference unchanged. All three sizes
were checked in RU/EN for clipping. Three two-core cables connect buttons
to six right-side chip pins, separating only near their terminals.

Позднейшая доработка: три конденсатора сгруппированы левее микросхемы.
Их шесть дорожек заканчиваются на шести левых выводах; шесть правых
соединены с контактами кнопок, восемь верхних — со шлейфом дисплея.
Координаты выводов и концов проводников совпадают по построению.
Для движения окна добавлена немедленная отрисовка по WM_MOVE, интервал
резервного обновления уменьшен с 33 до 16 мс. Поиск пересечения с боковыми
стенками заменён прямым пересечением с прямоугольниками и окружностями.
Это устраняет программное ожидание, но не доказывает конкретный FPS GPU.

Later revision: three capacitors form a group farther left of the chip.
Their six traces meet the six left pins; six right pins connect to button
terminals and eight top pins to the display ribbon. Pin and route coordinates
are shared. WM_MOVE now renders immediately; the fallback interval is reduced
from 33 to 16 ms. Sidewall intersection uses direct box/circle intersections
instead of iterative search. This removes software waiting without claiming
a measured GPU frame rate.

RU: У двух конденсаторов по два раздельных вывода с дорожками до выводов
микросхемы. Пары проводов у кнопок расходятся к двум разнесённым контактам.
Минимальная высота корпуса и панели уменьшена на 2 rem; свободное место
под дисплеем — на 1,1 rem. Геометрия преломления и толщина сохранены.

Для снимка F8 временно замораживает экспериментальный графический слой
и разрешает захват окна. Escape, изменение буфера обмена или 60 секунд
возвращают живой захват фона. Есть автоматическая попытка включения при
PrintScreen и Win+Shift+S; из-за порядка обработки сочетаний Windows
для надёжного снимка следует сначала нажать F8, затем открыть инструмент
снимка. Это обход ограничения прототипа, а не окончательное решение для
дистрибутива. Состояние самого таймера не замораживается.

EN: Each capacitor has two separate leads routed to chip pins. Button wire
pairs diverge into two spaced terminals. Body and panel minimum heights
are reduced by 2 rem, with 1.1 rem less space below the display. Refraction
geometry and thickness are unchanged.

F8 freezes the experimental graphics layer and makes the window capturable.
Escape, a clipboard change, or a 60-second timeout restores live backdrop
capture. PrintScreen and Win+Shift+S detection is also attempted; Windows
shortcut ordering can race, so press F8 before opening a capture tool for
a reliable shot. This is a prototype workaround, not the final shipping
capture solution. Timer state continues updating during the frozen image.
