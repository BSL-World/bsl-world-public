> Superseded local candidate; see [1.1.6](release-1.1.6.md). Not delivered or published.

# BSL-Timer 1.1.5 — вкладки, диод и Mute / timer tab alarms

2 ноября 2026. Локальная подготовка Free/Pro по запросу пользователя.
Коммит, push, публикация и производственные манифесты обновления не входят в запрос.

## RU

- Работающий таймер: вкладка в цвете темы с постоянным диодом того же цвета.
- Незапущенный таймер: более бледный цвет темы и читаемая надпись; вкладка
  остаётся доступной. Пауза сохраняет янтарный диод.
- Просроченный таймер: постоянно красная вкладка и увеличенный красный диод,
  который мигает синхронно с диодом циферблата, включая фоновые вкладки.
  Писк следует тому же ритму. Все диоды используют общую фазу: 500 мс
  включено, 500 мс выключено.
- Mute на вкладке отключает только её ритмичный писк. Красная индикация остаётся.
  Повторное нажатие включает писк; Stop или новый запуск сбрасывают Mute.
- Используется общее выбранное аудиоустройство. Штатный звуковой сигнал
  завершения подавляет дополнительный писк своего таймера на время звучания;
  его настройки и Информер не перерабатывались.
- Принятый прибор Glass использует общий необязательный механизм desktop-core
  0.7.0 / native window 0.8.0. Разметка, подписи и логика Timer остаются в Timer.
  Вспомогательные окна сохраняют прежний механизм оформления.

Пользователь принял результат в запущенном Pro в режиме разработки. Это не
проверка установки поверх прежней версии и не сертификация других приложений,
использующих Core. Исходная точка и прежние установщики 1.1.3 сохранены.

## Проверки и артефакты

113 автоматических тестов Timer и 38 тестов Core прошли. Окно «Что нового»
проверено в 48 сочетаниях RU/EN, Free/Pro, трёх шрифтов и четырёх оформлений,
включая размещение кнопки закрытия и фокус. Эти проверки используют браузерную
имитацию Tauri; не заменяют проверку установленных приложений.

Фактические результаты сборки, проверки упакованных EXE и подписей находятся
в `src-tauri/target/release-handoff/1.1.5/candidate-status.json`. В том же каталоге
хранятся отдельные установщики и EXE Free/Pro, снимки frontend, контрольные суммы,
скрипт подписи и итоговая инструкция. Подпись обновлений проверяется имеющимся
публичным ключом; пароль закрытого ключа вводится пользователем локально.
Pro не является публичной загрузкой. Установка и доставка через автообновление
не выполняются в рамках этой подготовки.

## EN

Running tabs use the theme color and a steady matching lamp. Idle tabs retain a
paler theme color with readable lettering; paused tabs keep their amber lamp.
Overdue tabs remain red and their larger red lamp blinks in sync with the display lamp with a short
synchronized beep, including on background tabs. Per-tab Mute silences only
that rhythmic beep; visual indication continues and Stop/a new run resets Mute.
Existing completion sounds, output-device routing and informer settings remain
independent. All lamps use one shared 500/500 ms phase.

The accepted Glass instrument now consumes the optional shared desktop-core
surface (JS 0.7.0/native window 0.8.0); Timer retains its geometry, labels and
business rules. Auxiliary window material behavior is unchanged. Native
multi-window/more-than-three-control rendering is not certified by this release.

The user accepted the development Pro run. Validation includes 113 Timer tests,
38 Core tests and 48 mocked-browser release-note layouts. Actual packaged-EXE,
hash and updater-signature checks are recorded in the local candidate status.
No installed upgrade, public release, source push or production updater change
is implied. Free/Pro artifacts are separate; Pro remains private.
