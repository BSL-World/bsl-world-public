# Glass: масштабы, переходы и чёткость / calibration and crisp rendering

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

Локальный прототип Таймера, 1 ноября 2026. Core и установленная программа
не изменялись; установщик, коммит и публикация не создавались.

Три масштаба прибора: 70%, 85%, 100%; прежний Normal 100% теперь Large.
Настройка размера шрифта остаётся независимой. Верхний ряд кнопок смещён
на 20 CSS-пикселей влево. Измеренный отступ правой кнопки от корпуса —
26,55 CSS-пикселя в малом размере: скруглённый угол её не обрезает.

Лицевая крышка получила слабый оттенок активной схемы. Нейтральная основа
стала менее голубой; TAN использует тёплый оттенок подсветки.

Для экспериментальной страницы выровнена геометрия Light/Dark/Glass.
Смена одного лишь материала не вызывает новую подгонку окна. Из измерения
естественного размера исключена выступающая контактная тень клона страницы.
После переключения в Glass отменяются устаревшие проходы CapturePreview,
готовится новая пара основы и маски текста, заново получается фон рабочего
стола; нативная поверхность показывается только после нового кадра.

Убрано повторное растяжение растра: шейдер использует координаты пиксельных
центров SV_Position, поверхность композиции имеет целочисленный размер и
положение. Ход кнопки округляется до экранного пикселя. Снимок WebView2
может содержать 1–2 дополнительных крайних пикселя; его не уменьшают для
вписывания в окно. Размытое преломление остаётся отдельным от слоя интерфейса.
Пользователь подтвердил чёткость надписей в малом масштабе.

В Light заданы тёмные надписи с небольшим оттенком текущей схемы, без
ореола; неактивные кнопки имеют читаемые серые подписи.

Проверены HLSL, Tauri-сборка, обычный Cargo check, три масштаба в RU/EN,
семь последовательных смен материала и четыре быстрых смены. Размеры окна
и дисплея сохраняются, снимки Glass содержат полноценный прозрачный прибор,
чёрных кадров в этой серии нет. Отдельный исходный эпизод почернения,
о котором сообщил пользователь, не был пойман на записи. Проверены цвет
надписей Light через реальные вычисленные стили и снимок, а также цикл
индикатора 500/500 мс.

EN: Device sizes are now 70/85/100%, with the former Normal becoming Large.
The toolbar is inset 20 CSS pixels farther left; the cover subtly follows the
active palette. Light/Dark/Glass keep a common geometry and do not refit the
window merely for a material change. Stale capture passes are invalidated;
Glass becomes visible after a fresh UI/background frame.

Pixel-center shader coordinates and integer composition bounds remove repeated
UI raster rescaling. WebView2's small extra edge padding is not scaled down.
Light-mode controls use dark, slightly palette-tinted text; disabled labels
remain gray. The user confirmed improved small-size legibility.

HLSL/Tauri builds, default Cargo check, RU/EN at three sizes, seven sequential
and four rapid material changes, light-mode ink and screenshots, and the
500/500-ms indicator cycle passed. Geometry stayed stable and no black frames
appeared in this run; the user's original transient black frame was not recorded.
