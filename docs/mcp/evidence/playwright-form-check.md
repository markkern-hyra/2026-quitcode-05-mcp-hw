# Перевірка форми заявки в браузері (Task B, Playwright)

- **Коли й чим:** 2026-10-05, Claude Code 2.1.289 · Opus 5.5 (effort xhigh), macOS Terminal.app (не термінал VS Code),
  `CLAUDE_CODE_AUTO_CONNECT_IDE=false ENABLE_CLAUDEAI_MCP_SERVERS=false claude --mcp-config docs/mcp/profiles/playwright.json --strict-mcp-config --permission-mode default`.
- **Що було в `/mcp`:** `playwright` — ✔ connected, 25 tools; вбудований `computer-use` — ◯ вимкнений. Supabase і
  Vercel у цій сесії не завантажувались, конектори claude.ai вимкнено змінною оточення.
- **Застосунок:** `npm run dev` цього репозиторію на `http://localhost:3000` (перед сесією перевірили, що порт
  тримає саме LeadDesk: `<title>LeadDesk</title>`).

## Запит

> Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль і мережу. Інших адрес не відкривай.

## Ланцюжок інструментів

| # | Інструмент | Аргументи (коротко) | Схвалення |
|---|---|---|---|
| 1 | `Bash` — `curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://localhost:3000/` | агент сам перевірив, що сервер відповідає | запит на схвалення, людина схвалила |
| 2 | `mcp__playwright__browser_navigate` | `url: "http://localhost:3000"` | правило `ask`: «Permission rule mcp__playwright__browser_navigate requires confirmation for this tool.» — схвалено |
| 3 | `mcp__playwright__browser_fill_form` | 8 полів: «Ім'я» `Тест`, «Прізвище» `Тестенко`, «Email» `test.lead@example.com`, «Телефон» `+380 00 000 0000`, «Компанія» `ТОВ Тестова Компанія`, «Сайт» `https://example.com`, «Бюджет» `$500–1500 / міс.`, «Що потрібно зробити?» — короткий синтетичний опис | правило `ask` — схвалено |
| 4 | `mcp__playwright__browser_click` | `element: "Кнопка «Надіслати заявку»"` | правило `ask` — схвалено |
| 5 | читання сторінки, консолі й переліку запитів | у журналі згорнуто як «Called playwright … times»: це інструменти з `allow` (`mcp__playwright__browser_snapshot`, `mcp__playwright__browser_console_messages`, `mcp__playwright__browser_network_requests`), тож точний порядок викликів журнал не показує | без запиту (точні імена в `allow`) |
| 6 | `mcp__playwright__browser_network_request` | `index: 23` — тіло й заголовки POST-запиту форми | правило `ask` — схвалено |
| 7 | `Bash` — `git -C … check-ignore -v .playwright-mcp/` | агент сам перевірив, що теку зі знімками ігнорує git: `.gitignore:49:.playwright-mcp/` | запит на схвалення, людина схвалила |
| 8 | `mcp__playwright__browser_close` | після окремого прохання «Закрий браузер.» | запит на схвалення (не в `allow`) — схвалено |

Заборонених інструментів (`browser_run_code_unsafe`, `browser_evaluate`, `browser_file_upload`, `browser_drop`) агент
не мав і не просив. Жодного `WebFetch`, жодної іншої адреси, ніж `http://localhost:3000`.

## Чи відправилась форма

Так. Відповідь агента: «форма зникла, натомість з'явилося «Дякуємо! Заявку отримано. Ми зв'яжемося з вами протягом
робочого дня.»». Галочку згоди на розсилку агент залишив порожньою.

## Консоль

«4 записи, жодної помилки чи попередження. Це лише службові повідомлення Next.js у режимі розробки: підказка про React
DevTools, [HMR] connected і [Fast Refresh] rebuilding / done in 429ms.»

## Мережа

- «23 запити, усі на localhost:3000 зі статусом 200»: 22 — завантаження сторінки (HTML, JS-чанки, CSS, шрифти, favicon).
- Надсилання форми — `POST http://localhost:3000/` (Server Action), відповідь 200 за 244 мс.
- Тіло запиту містить усі поля форми; відповідь — лише `{"status":"ok"}`: сервер не повертає введених персональних
  даних.
- Спостереження агента: варіант бюджету «$500–1500 / міс.» надсилається як `budget=1500`, тобто верхня межа діапазону.

## Що залишилось після перевірки

- Знімки сторінки й журнал консолі — у `.playwright-mcp/` (у `.gitignore`, у git не потрапили).
- Тестову заявку збережено лише в пам'яті процесу `npm run dev` (`lib/db.ts`); після зупинки сервера її немає.
- Тест як `.spec.ts` не створювали.
