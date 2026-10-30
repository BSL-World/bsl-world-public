# Восстановление истории — 30 октября 2026 / History recovery

## Русский

GitHub и GitVerse получили одну последовательность коммитов поверх ранее
опубликованной `416fed8`:

| Коммит | Содержание |
| --- | --- |
| `b016600` | Восстановленное состояние Timer 1.0.5 до Glass из сохранённого снимка |
| `3f0b98e` | Сохранённые исходники Core, native companion и стандарт Glass |
| `aed85a3` | Сохранённое развитие Glass в Timer 1.0.7 и Unreleased |
| `5f47a50` | Реестр версий, доказательства и двуязычные материалы восстановления |

Все новые коммиты датированы днём восстановления. Старые даты разработки
сохранены в CHANGELOG. Существующие коммиты и теги не переписаны.

Локальная `main` приведена к общей истории без перезаписи исходников приложения.
Две ранее опубликованные документальные правки сохранены. Четыре документа
объединены или уточнены; остальные 46 файлов исходного снимка сохранены побайтно.
Резервные материалы сохранены локально и исключены через `.git/info/exclude`.
Локальный `AGENTS.md` оставлен незакоммиченным; ветки не удалялись.

### Опубликованные выпуски

| Версия | GitHub | GitVerse |
| --- | --- | --- |
| 1.0.3 | [Release](https://github.com/BSL-World/bsl-world-public/releases/tag/bsl-timer-v1.0.3) | [Release](https://gitverse.ru/BSL-World/bsl-world-public/releases/tag/bsl-timer-v1.0.3) |
| 0.7.2, архив | [Release](https://github.com/BSL-World/bsl-world-public/releases/tag/bsl-timer-v0.7.2) | [Release](https://gitverse.ru/BSL-World/bsl-world-public/releases/tag/bsl-timer-v0.7.2) |

Фактическая дата этих публикаций — **30 октября 2026**. Для 0.7.2 исходная
дата версии и проверки сайта — 24–25 сентября. Для 1.0.3 дата версии —
25 октября, подтверждение размещения на сайте — 26 октября.
GitVerse сохраняет в `published_at` дату создания черновика; она не доказывает
день превращения черновика в публичный выпуск. Эта особенность отмечена в описаниях.

Недостающий аннотированный тег `bsl-timer-v0.7.2` создан на документированном
коммите `60428d7a90b3c80d90a7ccb377833bfb7d9d2cca` и отправлен в оба зеркала.
Тег 1.0.3 сохранён на `56419cc`. Архивная 0.7.2 не назначалась Latest в GitHub;
текущим выпуском назначена 1.0.3. Публичные вложения содержат только Free.
На GitHub приложены EXE, подпись и SHA-256, на GitVerse — ZIP с теми же файлами.
ZIP позволил завершить загрузку, которая ранее не проходила через API GitVerse.

Производственный манифест сайта не менялся. Новый установщик не собирался,
уже выпущенные установщики не заменялись и не переименовывались.

### Проверки

- Восстановленный Timer 1.0.5: 101 тест прошёл.
- Текущий Timer: 108 тестов; Core: 33 теста.
- Vite production-сборки Free и Pro прошли.
- `cargo check --offline --locked` текущего дерева прошёл с обычными возможностями.
  Отдельная native-сборка с `native-glass-preview` в этой задаче не выполнялась.
- 33 сохранённые подписи установщиков проверены криптографически.
- Free/Pro 1.0.3 скачаны с сайта: обе подписи и SHA-256 совпали с окончательными
  локальными артефактами. Все три контрольные суммы вложений GitHub 1.0.3 совпали.
- Снимок 50 файлов проверен по SHA-256; полный локальный Git bundle проверен.
- Все четыре публичные страницы проверены без авторизации. Free-файлы
  GitHub и ZIP GitVerse скачаны анонимно и сверены побайтно/по SHA-256;
  подписи всех четырёх публично скачанных установщиков проверены.
- Latest GitHub подтверждён как 1.0.3. Манифест сайта после публикаций
  побайтно совпал с исходным; SHA-256:
  `4c4edf64bfd56caad5aaf09edf2e8de586043fee625d09a1d16189867401fef6`.
- Тексты RU/EN в ответах API сверены с исходными UTF-8; повреждённых символов
  замены нет. Для GitVerse использован явный UTF-8 при чтении ответа.

Новая установка, визуальная проверка RU/EN и проверка поведения приложения
вручную не выполнялись. В описаниях выпусков отдельно приведены исторические
подтверждения пользователя. Проверки исходников и подписей не подменяют приёмку.

### Что остаётся

В реестре проверены 15 кандидатов исторических тегов; 0.7.2 восстановлен,
остальные 14 не создавались автоматически. Для них нужна сверка точного состава
установщиков и исходников. Выпуски 0.3.0-beta.1 и 0.3.0 остаются дополнительным
пробелом GitVerse по сравнению с GitHub. Частичные архивы 1.0.1/1.0.2 сохранены,
но не объявлены полными деревьями исходников. 1.0.4 осталась промежуточной,
а восстановленный снимок 1.0.5 не опубликован как новый бинарный релиз.
Glass 1.0.6/1.0.7 и Core 0.6.0/0.6.1 не помечались недоказанными историческими тегами.

Подробный исходный реестр:
[аудит](git-history-audit-2026-10-30.ru.md),
[кандидаты тегов](git-history-tag-proposals-2026-10-30.json).

## English

Both mirrors received the same four recovery commits listed above. Local main
was aligned with that history while preserving application source. Original
development dates remain in the changelog; new commits use their actual recovery
date. Two previously published documentation commits were retained. Four
documents were synchronized after verifying all 50 original files; the other
46 files remain byte-identical. Local backups and AGENTS.md were not published.

Releases 1.0.3 and historical 0.7.2 were published on both services on **30 October
2026**. GitVerse metadata retains draft creation dates, so descriptions explicitly
record the actual publication date. The restored 0.7.2 tag points to documented
commit `60428d7`; the existing 1.0.3 tag remains on `56419cc`. Historical 0.7.2
was not made GitHub Latest; 1.0.3 is the current release. Public attachments
contain Free only: EXE/signature/checksum on GitHub and the same files inside
a ZIP on GitVerse. No production updater metadata or installer was replaced.

Checks passed: 101 recovered-baseline tests, 108 current Timer tests, 33 Core
tests, both Free/Pro Vite builds and an offline locked Cargo check of the default
feature set. The opt-in native Glass feature was not compiled in this task.
Thirty-three preserved installer signatures were verified. Both website 1.0.3
installer signatures and hashes match final local artifacts, as do the three
GitHub 1.0.3 asset digests. No fresh installed-app or visual acceptance was
performed; historical user confirmations remain explicitly distinguished.

All four release pages and their Free downloads were verified without signing
in. Downloaded bytes/checksums and all four installer signatures match. GitHub
Latest resolves to 1.0.3. The website updater manifest is byte-identical to its
pre-publication snapshot. RU/EN API descriptions preserve the approved UTF-8 text.

Fourteen other source-tag proposals still need exact binary/source matching.
GitVerse is still missing the older 0.3.0-beta.1 and 0.3.0 release records.
Partial 1.0.1/1.0.2 archives were preserved without inventing complete historical
source trees. Intermediate builds and Glass studies were not automatically
published as stable releases. See the full audit and tag proposals above.
