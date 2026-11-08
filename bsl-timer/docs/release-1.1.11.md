# BSL-Timer 1.1.11 — запись живого Glass / live Glass recording

8 ноября 2026. Исправление исчезновения стеклянного окна при захвате экрана.

## Публикация / Publication

8 ноября по прямому указанию пользователя опубликованы подписанные Free/Pro
1.1.11 и переключён производственный манифест обновлений с 1.1.10. Скачанные
установщики сверены по SHA-256, подписи обновления проверены криптографически;
HTTP-манифест совпадает с подготовленным по всем трём целям Windows.
Публичные вложения релизов предназначены только для Free; Pro распространяется
через отдельную цель обновления. Authenticode: NotSigned.

Signed Free/Pro installers and the website updater are published. Download hashes,
updater signatures and all three HTTP targets match. Public release attachments
are Free only; Pro uses its separate updater target. Authenticode: NotSigned.

## Изменения / Changes

Вместо глобального `WDA_EXCLUDEFROMCAPTURE` используется
`WCA_EXCLUDED_FROM_DDA`: Таймер исключён из собственного источника фона DXGI
Desktop Duplication, но остаётся видимым для GDI и Windows Graphics Capture.
Живое преломление, шейдер, геометрия прибора и пользовательские данные не меняются.
При освобождении поверхности восстанавливается исходное исключение из DDA;
пауза F8, возобновление и переходы видимости используют тот же узкий флаг.

Ограничение: запись через DDA по-прежнему исключает окно. Для живого Glass
нужно выбрать GDI или Windows Graphics Capture. Это не обещание совместимости
со всеми программами записи и любыми их режимами.

Большой накопленный список «Что нового» сохранён; добавлен один пункт RU/EN.
Desktop Core: 0.7.2, native window companion: 0.8.2.

Global display-affinity exclusion is replaced by DDA-only exclusion. Glass remains
visible in GDI and Windows Graphics Capture while its own desktop backdrop source
omits it to avoid feedback. The shader, geometry and user data are unchanged.
The preceding DDA exclusion is restored on release. DDA-based recorders still
require a different capture backend. Cumulative RU/EN release notes are retained.

## Проверки / Validation

- 119 модульных тестов Timer и 41 тест Core прошли, включая отмену зависшей
  маски, таймаут, запоздалые callback, смену тем без циклической пересылки
  и сохранение отклика кнопок.
- Все 16 браузерных сценариев переименования прошли: Free/Pro, RU/EN, четыре
  режима оформления, Enter/Escape, отсчёт, переход в просрочку, Mute и лампы.
- Окно «Что нового» проверено в браузере: RU/EN × Small/Normal/Large,
  размещение списка и нижних элементов, фокус кнопки закрытия.
- Отдельная нативная проба с текущим шейдером записана одновременно через GDI
  (FFmpeg из ShareX) и Windows Graphics Capture. Оба MP4 декодированы;
  движущееся окно присутствует в серии кадров. На основном мониторе при двух
  подключённых мониторах подтверждено отсутствие окна в текстуре фона DDA.
  Это проверка технической возможности, отдельно от собранных приложений.
- Окончательные release EXE Free/Pro запущены с отдельными профилями: 36
  сочетаний RU/EN, размеров шрифта и прибора; 16 последовательных переходов
  оформления, отсутствие зависшей маски после выхода из Glass. При 100
  перемещениях окна в каждой редакции отсчёт переходит в просрочку, лампа
  продолжает мигать, Mute работает.
- Обе окончательные редакции одновременно записаны через GDI и Windows Graphics
  Capture. Все четыре MP4 декодированы; окно присутствует во всех 96 проверенных
  кадрах, положение меняется. Кадры обеих редакций просмотрены визуально.
  Первая запись Pro не содержала окна и не засчитана; контрольная запись с явно
  поднятым окном прошла. Причина первой попытки отдельно не изолирована;
  она не используется для подтверждения исправления.
- В Pro трижды выполнены реальные Win+Shift+S, выделение области и копирование
  изображения. Все три сохранённых PNG просмотрены: Таймер присутствует;
  исключение фона из DDA восстановлено после каждого снимка, время продолжает
  обновляться между снимками. Прямой PrtScn и ручной F8 отдельно не проверялись.

Состояние проверки окончательных Free/Pro, установщиков, подписей и публикации
фиксируется в `src-tauri/target/release-handoff/1.1.11/`.
Подпись, загрузка на сервер и проверка производственного обновления выполнены.
Установка поверх прежней версии с пользовательским профилем не выполнялась;
проверены именно упакованные release EXE с отдельными тестовыми профилями.
Периодическое потемнение Glass из прежнего отчёта остаётся отдельным известным
дефектом; этот выпуск не объявляет его устранённым.

Unit, browser and native checks above have passed. Both packaged executables
were recorded through GDI and WGC; all 96 sampled frames contain the moving
window. Three actual Pro Win+Shift+S images were saved and visually reviewed,
with backdrop capture restored after each. Direct PrtScn and manual F8 were not
separately tested. Installed upgrade acceptance with existing user data was not
performed. Signing and publication evidence is stored with the artifacts. The previously
reported intermittent Glass darkening is not claimed fixed by this release.

Размеры Glass не менялись. Пользователь отложил их переработку до следующей
сборки: нынешний Normal должен стать будущим Large; Normal и Small должны быть
меньше. Это отдельная задача и не входит в 1.1.11.
