# Glass: контраст иконок / Icon contrast

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

2026-11-01. Изолированный прототип Таймера, без переноса в Core или выпуска дистрибутива.

Иконки настроек, событий, информации, сворачивания, закрытия и добавления вкладки включены в существующую маску адаптивных надписей. Цвет выбирается по яркости поверхности под каждым пикселем при перемещении окна. Для Info адаптивны и буква, и кольцо; цветная заливка кружка заменена прозрачной. Кнопка закрепления сохраняет прежний вид.

Для кнопки событий добавлена подсказка внутри композиции: существующий перевод RU/EN, появление при наведении или фокусе, скрытие при уходе указателя, потере фокуса, нажатии или Escape. Маска надписей вырезается под подсказкой, чтобы лежащий ниже текст не проступал поверх неё.

Проверки: нативная сборка; пиксельная проверка всех шести иконок на светлом/тёмном фоне; существующие проверки адаптивного текста на разделённом фоне и при перемещении; наведение, текст, границы и скрытие подсказки в RU/EN; размещение элементов в трёх масштабах RU/EN. Визуальная проверка снимков собственного окна прототипа. Установленное приложение не заменялось и не проверялось.

## English

Timer-only isolated prototype; no Core transfer or distribution release.

Settings, events, information, minimize, close and add-tab icons now use the existing adaptive ink mask. Ink follows the composed surface brightness per pixel while moving the window. Both the information letter and ring adapt; the ring has a transparent interior. The pin retains its previous appearance.

The events button has an in-composition tooltip using the existing RU/EN translations. Hover or focus shows it; leaving, blur, pressing or Escape hides it. Adaptive ink is clipped beneath the tooltip to prevent underlying labels showing through.

Validated native build, pixel contrast for all six icons on light/dark backgrounds, existing split-background and movement checks, tooltip hover/text/bounds/hiding in RU/EN, and layout at all three device sizes in RU/EN. Visually inspected prototype-window captures. The installed application was neither replaced nor tested.
