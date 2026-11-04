# BSL-Timer 1.1.8 — исправления устойчивости Glass и тем / stability update

## Публикация / Publication

4 ноября 2026 по прямому указанию пользователя опубликованы Free и Pro 1.1.8
и переключён производственный latest.json. Оба скачанных установщика сверены
по SHA-256, подписи Tauri криптографически проверены; HTTP-манифест сверён
по всем трём целям. Authenticode: NotSigned. Проверку установки до публикации
пользователь заменил обновлением хоста и виртуалки с сайта; результат ещё ожидается.
Приведённый ниже первоначальный порядок приёмки заменён этим решением.
Отчёт: `src-tauri/target/release-handoff/1.1.8/publication-status.json`.

Free/Pro installers and the production updater were published on 4 November 2026
at the user's explicit request. Downloaded hashes, updater signatures and all three
manifest targets match. Installed host/VM upgrade acceptance remains pending.

4 ноября 2026. Узкий bugfix по подтверждённым дефектам синхронизации оформления
и незавершённого захвата Glass. Пользователь подтвердил нормальное переключение
и отсутствие цикличности в изолированной Pro dev-сборке.

## Состав / Changes

- Входящие события оформления применяют актуальный режим без повторной записи
  устаревшего значения другим окнам.
- При выходе из Glass ожидающий захват отменяется, маска снимается немедленно,
  старый native-сеанс освобождается до создания нового. Поздний callback не должен
  восстанавливать прежнюю поверхность. Ожидание WebView2 capture ограничено 5 с,
  frontend-прохода — 6 с.
- Используются Desktop Core 0.7.1 и native window companion 0.8.1.
- RU/EN «Что нового» сохраняет накопленные изменения после публичной 1.0.3,
  включая Glass, сигнализацию вкладок и живое время Информера.

Incoming appearance events now apply the latest selection without echoing stale
values to other windows. Leaving Glass cancels captures, immediately clears masks
and retires native sessions before reentry. Capture waits are bounded and late
callbacks cannot revive retired sessions. Cumulative RU/EN release notes retain Glass.

## Проверки / Validation

119 тестов Timer и 41 тест Core прошли. Регрессии покрывают накопившиеся
события разных окон, зависшую маску, таймаут, запоздавшую конфигурацию и callback,
сохранение отклика кнопок. В настоящем Pro dev WebView прошли 24 сочетания
RU/EN × три шрифта × четыре темы и 20 быстрых предпросмотров со стабильным
последним состоянием. Подтверждение пользователя относится к dev, не к установщику.

Фактические результаты окончательных сборок Free/Pro, проверки версий,
frontend, хешей и подписей записываются в
`src-tauri/target/release-handoff/1.1.8/candidate-status.json`.

119 Timer and 41 Core tests passed. Native Pro development validation includes
24 language/font/material combinations and 20 rapid previews. Final installer
validation and signature status are recorded separately in the candidate status.

## Границы и приёмка / Scope and acceptance

Пропорции, масштаб, шрифты, лента дат и алгоритм отрисовки не перерабатываются.
Задержка появления фона Glass остаётся известной: в dev измерено примерно
0,9–1,9 с; причина не сведена к видеокарте. Первоначальный графический сбой
пользователя не воспроизведён, поэтому выпуск не объявляет все причины потери
прозрачности устранёнными.

Обработчики PrtScn/F8 в native renderer сохранены относительно 1.1.7.
Это сравнение кода не доказывает надёжность обычного снимка. PrtScn остаётся
отдельной задачей; текущий обход — F8 перед открытием захвата.

Далее: подписать оба окончательных установщика, проверить установку поверх 1.1.7
с сохранением настроек и таймеров, затем разместить файлы и переключить latest.json.
До этой приёмки не заменять производственный манифест 1.1.7. Pro остаётся частной
редакцией. Коммит, push и GitHub/GitVerse Releases этой подготовкой не выполняются.

Geometry and typography remain unchanged. Glass entry delay and ordinary PrtScn
compatibility are separate work; the initial graphics failure has not been
reproduced. Native screenshot handlers are retained, which is not screenshot
acceptance. Sign final installers, verify upgrading from 1.1.7 and retained data,
then publish artifacts and switch the updater. Pro remains separately distributed.
