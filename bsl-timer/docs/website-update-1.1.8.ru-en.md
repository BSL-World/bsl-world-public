# BSL-Timer 1.1.8 — записка для обновления страницы сайта

Опубликована 4 ноября 2026, `2026-11-04T06:49:59Z`. Установщики Free/Pro и latest.json уже на сайте. Повторная загрузка не требуется. Обновить RU/EN страницу продукта, историю обновлений и новость.

## Текст RU

**BSL-Timer 1.1.8: оформление «Стекло» и исправления устойчивости.**

После публичной 1.0.3 появились прозрачный стеклянный корпус главного окна с живым преломлением фона, декоративной электроникой, механическим откликом кнопок, тремя размерами прибора и регулировкой Glow. Вкладки показывают состояние таймера цветом; просроченные вкладки и дисплей мигают синхронно с коротким писком. Mute отключает писк отдельной вкладки. Время Информера обновляется вживую.

В 1.1.7 вспомогательные окна сохранили прежнее обычное оформление при включении «Стекла». В 1.1.8 исправлены циклическая пересылка настроек оформления между окнами и зависший захват фона Glass: при смене темы захват отменяется, временная маска снимается, ожидание кадра ограничено по времени.

Free включает один таймер и одно датированное событие. Несколько таймеров и событий доступны в Pro, которая распространяется отдельно.

## Copy EN

**BSL-Timer 1.1.8: Glass appearance and stability fixes.**

Since public version 1.0.3, the main window has gained a transparent Glass instrument with live desktop refraction, decorative electronics, mechanical button feedback, three device sizes and adjustable Glow. Timer tabs indicate their state with color. Overdue tabs and the display flash in sync with a short beep; per-tab Mute silences the beep. Informer time updates live.

Version 1.1.7 preserves auxiliary windows' previous ordinary appearance when enabling Glass. Version 1.1.8 fixes appearance synchronization loops between windows and stalled Glass background captures: changing themes cancels capture, clears the temporary mask and bounds frame waits.

Free includes one timer and one dated event. Multiple timers and dated events are available in Pro, which is distributed separately.

## Кнопка загрузки и проверенные данные

- Версия: **1.1.8**, Windows x64.
- Публичная кнопка — только [скачать Free](https://bsl-world.ru/download.php?product=bsl-timer&file=bsl-timer_1.1.8_free_x64-setup.exe&source=website).
- Файл: `bsl-timer_1.1.8_free_x64-setup.exe`, **4 202 468 байт**.
- SHA-256: `CE6D463B9E2FF089B4E13557BC6855A93F0E66CC51DA05D17F1F0147E6175DDB`.
- [Производственный манифест](https://bsl-world.ru/downloads/bsl-timer/latest.json) уже переключён на 1.1.8; все три цели проверены.
- Оба установщика скачаны по URL обновления, SHA-256 совпадают, подписи Tauri криптографически проверены.
- Windows Authenticode обоих установщиков: **NotSigned**, сертификата и thumbprint нет. Подпись автообновления Tauri не является Authenticode.
- 119 тестов Timer и 41 тест Core прошли; окно «Что нового» проверено в 48 сочетаниях. Переключение тем подтверждено пользователем в dev-сборке. Обновление установленной 1.1.8 на хосте и VM ещё не подтверждено.

## Границы обещаний

Не объявлять обычный PrtScn исправленным: это следующая задача. Пропорции и шрифты этим выпуском не менялись; задержка появления Glass остаётся отдельным вопросом. Первоначальный графический сбой не был воспроизведён: не обещать устранение всех сбоев графики. Не публиковать ссылку Pro в кнопках или публичных вложениях. Промежуточные локальные версии не нужны как ступени обновления с 1.0.3.

Страница продукта и новости при загрузке установщиков не изменялись. Для обновления страницы передать этот документ; ключ, пароль и установщики не требуются.

