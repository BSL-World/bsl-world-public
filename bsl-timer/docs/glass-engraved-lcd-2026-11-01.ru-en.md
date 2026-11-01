# Glass: лицевая поверхность, гравировка и мини-дисплеи

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

2026-11-01. Только изолированный прототип BSL-Timer; без переноса в desktop-core, установки или публикации.

Лицевая поверхность сильнее тонируется текущей палитрой. BSL-Таймер и подписи часов, минут и секунд получили тонкий однопиксельный рельеф гравировки. Адаптивный цвет букв сохранён. Поля ввода оформлены отдельными утопленными ЖК-модулями: наружная рамка, внутреннее стекло, сегментные цифры с оттенком схемы. Размеры полей и обработчики ввода сохранены.

Проверено: компиляция шейдера и сборка нативного прототипа; RU/EN в трёх масштабах; ввод трёхзначных часов, стрелка вверх, сохранение фокуса, блокировка редактирования при отсчёте и восстановление после остановки; запуск, пауза, рестарт; адаптивные надписи на светлом, тёмном и разделённом фоне при перемещении; переключение Blue/Green/TAN; период индикатора 500 мс включён / 500 мс выключен. Визуально проверен снимок собственного окна прототипа. Установленное приложение не проверялось и не заменялось.

Исходная точка и итоговый снимок/исходники/исполняемый файл сохранены локально в `.task-backups/glass-finish-2026-11-01` и его подкаталоге `preview`.

## English

Timer-only isolated prototype; no desktop-core transfer, installation or publication.

The front cover receives more of the selected palette tint. The application title and duration labels have subtle one-pixel engraved relief, retaining adaptive ink contrast. Editable values are recessed LCD modules with outer frames, inner glass and palette-tinted segmented digits. Field dimensions and input handlers are unchanged.

Validated shader compilation and native prototype build; RU/EN at all three device sizes; three-digit hours, ArrowUp, focus, editing disabled during countdown and restored after stopping; start, pause and restart; adaptive ink on light/dark/split backgrounds and while moving; Blue/Green/TAN switching; indicator timing of 500 ms on / 500 ms off. Visually inspected a capture of the prototype window. The installed application was neither tested nor replaced.
