# Перевірка форми заявки в браузері (Task B, Playwright)

- **Коли й чим:** 2026-10-05, Claude Code 2.1.289 · Opus 5.5 (effort xhigh), macOS Terminal.app (не термінал VS Code),
  `CLAUDE_CODE_AUTO_CONNECT_IDE=false ENABLE_CLAUDEAI_MCP_SERVERS=false claude --mcp-config docs/mcp/profiles/playwright.json --strict-mcp-config --permission-mode default`.
- **Що було в `/mcp`:** `playwright` — ✔ connected, 25 tools; вбудований `computer-use` — ◯ вимкнений. Supabase і
  Vercel у цій сесії не завантажувались, конектори claude.ai вимкнено змінною оточення.
- **Застосунок:** `npm run dev` цього репозиторію на `http://localhost:3000` (перед сесією перевірили, що порт
  тримає саме LeadDesk: заголовок сторінки — «LeadDesk»).
- **Джерела:** виклики, аргументи й результати — з JSONL-журналу цієї сесії Claude Code; запити на схвалення — із
  запису термінала (`script`); підсумки в лапках — дослівна відповідь агента.

## Запит

> Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль і мережу. Інших адрес не відкривай.

## Ланцюжок інструментів

| # | Інструмент | Аргументи | Схвалення |
|---|---|---|---|
| 1 | `Bash` | `curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://localhost:3000/` — агент сам перевірив, що сервер відповідає | діалог «Bash command», людина схвалила |
| 2 | `mcp__playwright__browser_navigate` | `url: "http://localhost:3000"` → «Page Title: LeadDesk» | діалог; «Permission rule mcp__playwright__browser_navigate requires confirmation for this tool.» (правило `ask`) |
| 3 | `mcp__playwright__browser_snapshot` | — | без діалогу (точне ім'я в `allow`) |
| 4 | `mcp__playwright__browser_console_messages` | `level: "debug"` | без діалогу (`allow`) |
| 5 | `mcp__playwright__browser_fill_form` | 8 полів: «Ім'я» `Тест`, «Прізвище» `Тестенко`, «Email» `test.lead@example.com`, «Телефон» `+380 00 000 0000`, «Компанія» `ТОВ Тестова Компанія`, «Сайт» `https://example.com`, «Бюджет» `$500–1500 / міс.`, «Що потрібно зробити?» `Тестова заявка: потрібен лендинг і налаштування реклами. Це синтетичні дані для перевірки форми.` | діалог (правило `ask`) |
| 6 | `mcp__playwright__browser_click` | `target: "e40"`, `element: "Кнопка «Надіслати заявку»"` | діалог (правило `ask`) |
| 7 | `mcp__playwright__browser_snapshot` | — | без діалогу (`allow`) |
| 8 | `mcp__playwright__browser_console_messages` | `level: "debug"` | без діалогу (`allow`) |
| 9 | `mcp__playwright__browser_network_requests` | `static: false` → лише запит 23 і «Note: 22 static requests not shown, run with "static" option to see them.» | без діалогу (`allow`) |
| 10 | `mcp__playwright__browser_network_request` | `index: 23` — заголовки й статус POST-запиту форми | діалог (правило `ask`) |
| 11 | `mcp__playwright__browser_network_requests` | `static: true` — повний перелік, див. нижче | без діалогу (`allow`) |
| 12 | `mcp__playwright__browser_network_request` | `index: 23`, `part: "response-body"` | діалог (правило `ask`) |
| 13 | `mcp__playwright__browser_network_request` | `index: 23`, `part: "request-body"` — паралельно з кроком 12, в одному кроці агента | окремого діалогу в записі термінала не видно: кроки 12 і 13 — паралельні виклики, і, ймовірно, термінал перемалював другий діалог поверх першого, як у прогоні A Task C на запиті 4; правила «don't ask again» після сесії немає |
| 14 | `Bash` | `git -C ~/Documents/GitHub/2026-quitcode-05-mcp-hw check-ignore -v .playwright-mcp/` → `.gitignore:49:.playwright-mcp/` | діалог «Bash command», людина схвалила |
| 15 | `mcp__playwright__browser_close` | після окремого прохання «Закрий браузер.» → «No open tabs.» | діалог (не в `allow`) |

Заборонених інструментів (`browser_run_code_unsafe`, `browser_evaluate`, `browser_file_upload`, `browser_drop`) агент
не мав і не просив. `WebFetch` не викликав, інших адрес, ніж `http://localhost:3000`, не відкривав.

## Чи відправилась форма

Так. Відповідь агента: «форма зникла, натомість з'явилося «Дякуємо! Заявку отримано. Ми зв'яжемося з вами протягом
робочого дня.»». Галочку згоди на розсилку агент залишив порожньою (у тілі запиту її немає).

## Консоль

`browser_console_messages` двічі (до й після відправки) повернув те саме:

```text
Total messages: 4 (Errors: 0, Warnings: 0)

[INFO] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold @ http://localhost:3000/_next/static/chunks/node_modules_next_dist_1e8vcs8._.js:776
[LOG] [HMR] connected @ http://localhost:3000/_next/static/chunks/node_modules_next_dist_1e8vcs8._.js:776
[LOG] [Fast Refresh] rebuilding @ http://localhost:3000/_next/static/chunks/node_modules_next_dist_1e8vcs8._.js:776
[LOG] [Fast Refresh] done in 429ms @ http://localhost:3000/_next/static/chunks/node_modules_next_dist_1e8vcs8._.js:776
```

## Мережа

Повний перелік (`browser_network_requests` з `static: true`), дослівно — усі 23 запити на `http://localhost:3000`, усі
зі статусом 200:

```text
1. [GET] http://localhost:3000/ => [200] OK
2. [GET] http://localhost:3000/_next/static/media/4fa387ec64143e14-s.p.2tuy5pz7dlieh.woff2 => [200] OK
3. [GET] http://localhost:3000/_next/static/media/797e433ab948586e-s.p.0r6juujl39pe6.woff2 => [200] OK
4. [GET] http://localhost:3000/_next/static/media/8a480f0b521d4e75-s.p.1qq4vpdcun5oj.woff2 => [200] OK
5. [GET] http://localhost:3000/_next/static/media/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2 => [200] OK
6. [GET] http://localhost:3000/_next/static/chunks/%5Broot-of-the-server%5D__110zi9y._.css => [200] OK
7. [GET] http://localhost:3000/_next/static/chunks/%5Bturbopack%5D_browser_dev_hmr-client_hmr-client_ts_1di75ot._.js => [200] OK
8. [GET] http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_next-devtools_index_090k2jm.js => [200] OK
9. [GET] http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js => [200] OK
10. [GET] http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_164kp-6._.js => [200] OK
11. [GET] http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_1amofcm._.js => [200] OK
12. [GET] http://localhost:3000/_next/static/chunks/node_modules_next_dist_client_0_90u2t._.js => [200] OK
13. [GET] http://localhost:3000/_next/static/chunks/node_modules_next_dist_1e8vcs8._.js => [200] OK
14. [GET] http://localhost:3000/_next/static/chunks/node_modules_%40swc_helpers_cjs_1r9vbqw._.js => [200] OK
15. [GET] http://localhost:3000/_next/static/chunks/_1anvha4._.js => [200] OK
16. [GET] http://localhost:3000/_next/static/chunks/turbopack-_08bm286._.js => [200] OK
17. [GET] http://localhost:3000/_next/static/chunks/_219uq1s._.js => [200] OK
18. [GET] http://localhost:3000/_next/static/chunks/node_modules_next_dist_20wefz_._.js => [200] OK
19. [GET] http://localhost:3000/_next/static/chunks/_0owx4cm._.js => [200] OK
20. [GET] http://localhost:3000/_next/static/chunks/%5Bturbopack%5D_browser_dev_hmr-client_hmr-client_ts_1mojsay._.js => [200] OK
21. [GET] http://localhost:3000/favicon.ico?favicon.2vob68tjqpejf.ico => [200] OK
22. [GET] http://localhost:3000/__nextjs_font/geist-latin.woff2 => [200] OK
23. [POST] http://localhost:3000/ => [200] OK
```

- **Запит 23 — відправка форми:** `POST http://localhost:3000/`, `status: [200] OK`, `duration: 244ms`, `type: fetch`,
  `mimeType: text/x-component`; у заголовках — `next-action` (виклик Server Action) і
  `content-type: multipart/form-data`.
- **Тіло запиту** (`part: "request-body"`): службові поля Server Action і поля форми (`firstName`, `lastName`, `email`
  тощо) з тими самими синтетичними значеннями, що в кроці 5.
- **Тіло відповіді** (`part: "response-body"`), дослівно:

  ```text
  0:{"a":"$@1","f":"","q":"","i":true,"b":"development"}
  1:D"$2"
  1:{"status":"ok"}
  ```

  Сервер повертає лише `{"status":"ok"}` — жодного з введених персональних даних.
- Спостереження агента: варіант бюджету «$500–1500 / міс.» надсилається як `budget=1500`, тобто верхня межа діапазону.

## Що залишилось після перевірки

- Знімки сторінки й журнал консолі — у `.playwright-mcp/` на диску (`--isolated` тримає в пам'яті лише профіль
  браузера, а не ці файли); тека в `.gitignore`, у git не потрапила.
- Тестова заявка: Server Action записав її в пам'ять процесу `npm run dev` (`lib/db.ts`), а в `after()` передає дані
  заявки в n8n (`app/actions.ts`, рядок 64). Змінних `N8N_*` на цій машині немає (`.env.local` не створювали), тож,
  за кодом `lib/n8n/client.ts` (рядки 36–37), цей виклик пропускається з попередженням «skipped: … is not set».
  Журнал dev-сервера з цієї сесії не збережено, тож це висновок із коду, а не спостереження. Після зупинки сервера
  заявки в пам'яті немає.
- Ті самі синтетичні дані форми лишились у локальних журналах сесії (JSONL Claude Code і запис термінала) — поза
  репозиторієм.
- Тест як `.spec.ts` не створювали.
