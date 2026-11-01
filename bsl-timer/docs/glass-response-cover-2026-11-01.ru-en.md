# Glass: отклик кнопок и крышка / button response and front cover

> Historical development-stage record. Current packaging: [1.1.3](release-1.1.3.md).

## Состояние на 1 ноября 2026

Это локальный эксперимент Таймера. Core, установщики и публикации не менялись.
Исходная точка сохранена в `.task-backups/glass-response-cover-2026-10-31`.

Нажатие больше не требует нового CapturePreview, PNG-декодирования и маски
надписи. События pointer down/up и Space/Enter передают геометрию и ход
в нативный рендерер. Он перемещает уже готовые пиксели кнопки и надписи;
подложка и посадочное место остаются неподвижными. CSS-перемещение отключено,
чтобы не было двойного хода. Нажатие отменяется при pointer cancel и blur.

На крышке добавлены стационарные посадочные кольца трёх основных кнопок
с внутренним затемнением. Усилены широкое отражение, его переход по площади
и оттенок лицевой плоскости поверх платы. Фаска, толщина, внутренняя разводка,
адаптивные оттенки надписей и ритм индикатора сохранены.

### Проверено

- HLSL компилируется, локальная Tauri-сборка готова.
- Автоматические события мыши: шесть нажатий и отпусканий; отпускание вне
  кнопки не запускает таймер. Нативный ответ — 12–20,5 мс, среднее 16,9 мс.
  Это время команды, **не измерение физической задержки монитора**.
- Пробел нажимает кнопку и запускает отсчёт; остановка возвращает ввод.
- Геометрия и доступность органов управления: три масштаба в RU/EN.
- 108 существующих тестов прошли; обычный Cargo check без эксперимента прошёл.
- В журнале экспериментального окна нет новых ошибок.

### Что осталось проверить глазами

Во время работы Windows заблокировалась (`LockApp` стал передним окном).
Два снимка, ошибочно захватившие экран блокировки вместо прототипа, отклонены
и удалены. Они не доказывают ни ход кнопок, ни правильность крышки. Проверщик
теперь запрещает такие снимки при активном LockApp. Разблокировка не выполнялась.

После разблокировки нужно оценить реальный отклик мышью и вид крышки на
светлом и тёмном фоне. Визуальная убедительность новой поверхности пока
**не подтверждена**. При необходимости сравнить с сохранённым исходным вариантом.

Прототип: `.task-backups/glass-optics-study-2026-10-31/bsl-glass-optics.exe`.
Запуск: `run-optics.ps1 -Action Start -Name device` в той же папке.
Проверка без снимков: `-Action PressTest -Name headless`.

## English

Timer-local experiment only; no Core changes, installer, or publication.
Pointer and keyboard press/release events now drive a native shader transform
of the cached button and glyph pixels, avoiding a fresh WebView PNG capture
for press feedback. Fixed mounting collars, recessed seating and stronger
cover-wide reflection aim to attach the keys to the front lid. The old CSS
travel is disabled to prevent duplicate motion.

HLSL/Tauri compilation, six mouse press/release sequences, Space activation,
three sizes in RU/EN, all 108 existing tests, and default-feature Cargo check
passed. Native command round trips were 12–20.5 ms, averaging 16.9 ms; physical
monitor latency was not measured.

Windows locked during the work. Screenshots showing LockApp rather than the
prototype were rejected and removed; the capture helper now guards against
this. No attempt was made to unlock Windows. Actual on-screen mouse response
and the visual plausibility of the new lid remain to be checked after unlock.
