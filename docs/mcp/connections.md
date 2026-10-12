# Підключення MCP-серверів LeadDesk (Task B)

- **Акаунти** (особисті чи одноразові, без клієнтських організацій і команд): Supabase — новий особистий акаунт,
  окрема організація, створена під цю домашку, у ній один порожній проєкт (`project_ref=ibmckvhzbgatidgimqrh`) ·
  Vercel — особистий Hobby-акаунт; команда створена під цю домашку, у ній лише проєкт із форком репозиторію,
  інших учасників немає · Figma — не використовували.
- **Третій сервер:** Playwright — чому саме він: головний сценарій застосунку — публічна форма заявки, і саме її
  треба перевіряти після змін; акаунт і квота не потрібні (за walkthrough, у Figma на Starter — 20 викликів на місяць, а OAuth-скоуп
  `mcp:connect` на сервері не звузити); Chrome на машині вже є.
- **Vercel CLI на цій машині:** не встановлено (`which vercel` нічого не знаходить). Додатково в
  `.claude/settings.json` у `deny` стоять `Bash(vercel)`, `Bash(vercel *)`, `Bash(npx vercel *)`,
  `Bash(npx -y vercel *)`. Це спрацювало: у сесії з логом білду агент сам спробував `which vercel && vercel --version`,
  `npx vercel --version` і `vercel inspect dpl_… --logs` — усі три відхилено правилами
  (напр. «Permission to use Bash with command npx vercel --version has been denied.»).

## Сервери

| Сервер | Який доступ | Навіщо нам | Що станеться при компрометації | Чим саме звужено |
|---|---|---|---|---|
| `supabase` | 9 інструментів на один проєкт: схема й таблиці бази, довільний SQL через `execute_sql`, міграції через `apply_migration`, URL і publishable key проєкту, TypeScript-типи, пошук у документації. Читає й пише всю базу проєкту, зокрема ПІБ, email і тексти заявок у `leads` | міграція схеми й сид тих самих 20 лідів, що у фікстурі сервера LeadDesk, — для прогону A в Task C | OAuth-токен ширший за URL: на екрані згоди Supabase запитав скоупи на рівні організації (`organizations:read`, `projects:write`, `database:write`, `secrets:read`, `edge_functions:write`, `storage:write`…). З ним можна прочитати й змінити чи видалити всі дані, прочитати ключі, задеплоїти edge function у будь-який проєкт організації. Організація одноразова, у ній один проєкт із синтетичними даними — це і є межа шкоди | `project_ref=` прив'язує всі інструменти до одного проєкту (за walkthrough, з їхніх схем зникає `project_id`); `features=database,development,docs` — без `account`, `functions` (канал назовні), `branching` (платне), `storage`, `debugging`. `read_only=true` не ставимо: він прибирає `apply_migration`. `execute_sql` і `apply_migration` — у `ask`, тож «don't ask again» їх не схвалює назавжди |
| `vercel` | За walkthrough, OAuth-скоуп один (`openid`), тобто токен — це користувач Vercel цілком, у межах команди, якій дали доступ на екрані згоди. Агенту доступні проєкти, деплої, події й логи білдів; серед інструментів є й такі, що деплоять, купують і пишуть у toolbar | лог білду задеплоєного форка | з токеном можна задеплоїти будь-що в цю команду, зокрема з `target: production`, купити домен чи кредити з картки (`buy_*`), видати посилання в обхід Deployment Protection (`get_access_to_vercel_url`; за walkthrough), писати в toolbar-листування, яке бачить клієнт | URL звузити нічим. У `deny` — 11 інструментів, що змінюють стан, зі списку рубрики, точними іменами; інші записуючі інструменти Vercel MCP у `deny` не внесені й доступні лише через запит на схвалення. В `allow` — лише `list_deployments`, `get_deployment`, `get_deployment_build_logs`. `list_deployment_events`, яким агент дістав лог, у `allow` немає: кожен виклик — запит на схвалення, бо лог білду може містити значення оточення. CLI не встановлено, `Bash(vercel …)` — у `deny` |
| `playwright` | локальний Chrome під керуванням агента (stdio, `@playwright/mcp@0.0.82`): відкриває сторінки, читає DOM, консоль і мережу (зокрема тіла запитів і cookie через `browser_network_request`), заповнює форми, клікає; знімки й журнали пише в `.playwright-mcp/` | перевірка форми заявки на `http://localhost:3000` після змін | «компрометація» тут — інструкції з відкритої сторінки (prompt injection). Без звуження сторінка могла б змусити агента виконати код у процесі сервера (`browser_run_code_unsafe`; за walkthrough, власний опис називає його «RCE-equivalent»), прочитати локальні файли, зокрема `.env.local` (`browser_file_upload`, `browser_drop` — теж за walkthrough), додати власні інструменти (`webmcp_*`) або перейти на будь-яку адресу й винести дані в URL чи формі | версія закріплена `@0.0.82`; `--isolated` — профіль браузера лише в пам'яті, без логінів; `--no-webmcp` — сторінка не додає інструментів; `--allowed-origins http://localhost:3000` — лише зручність, не межа безпеки (так пише документація вендора; самі не перевіряли). `deny`: `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate`. `ask`: `browser_navigate`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_network_request`. `allow` — лише 6 інструментів читання точними іменами. У наших сесіях — ніколи разом із Supabase (окремі профілі); виняток, який правилами не закрито, — `claude -p --mcp-config .mcp.json`, що підняв би обидва (див. threat model) |

## Supabase: схема й сид

- Міграція `supabase/migrations/0001_leaddesk.sql` створює таблиці: `leads` (одна таблиця; поля з
  `materials/leads.json`, `status` — `CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost'))`).
- Сид `supabase/seed/leads.sql`: 20 рядків, `lead_0001`–`lead_0020`, ті самі, що в `materials/leads.json` (кожне поле
  кожного рядка звірено з фікстурою скриптом — 0 розбіжностей).
- Скільки інструментів Supabase видно в `/mcp` із вашим URL: 9.
- Якими викликами створено схему й дані і що ви схвалювали вручну:
  1. `execute_sql` `SELECT count(*) FROM leads` — помилка `42P01: relation "leads" does not exist` (таблиці ще не
     було);
  2. агент у чаті спитав «Застосувати міграцію та сід до Supabase? Це змінить схему бази…», людина відповіла «yes»;
  3. `apply_migration` з `name: "leaddesk"` і тим самим `CREATE TABLE`, що у файлі міграції, — `{"success": true}`;
  4. `execute_sql` з одним `INSERT` на 20 рядків;
  5. `execute_sql` `SELECT count(*) FROM leads`.

  Кожен із цих викликів ішов через окремий запит на схвалення; для `execute_sql` Claude Code прямо написав
  «Permission rule mcp__supabase__execute_sql requires confirmation for this tool.». «Don't ask again» людина не обирала
  жодного разу — правил `allow` у `settings.local.json` після сесії не з'явилось. Окремою сесією (лише читання) перевірили лічильник: `[{"count":20}]`, загорнуто в
  тег untrusted-data з випадковим суфіксом. Файли міграції й сиду агент записав після двох окремих схвалень `Write` (і одного `Bash mkdir`).
- Друга міграція — `supabase/migrations/0002_leaddesk_rls.sql`, окремою сесією лише з `supabase`: вмикає RLS на
  `leads`, відкликає всі права `anon` і `authenticated` і додає політику `SELECT` для ролі, якою читає профіль «client».
  Схвалено три діалоги: `apply_migration` (`name: "leaddesk_rls"`, `{"success":true}`) і два `execute_sql`. Перевірка:
  `rls_enabled: true`; `anon_select`, `anon_insert`, `anon_update`, `anon_delete`, `authenticated_select`,
  `authenticated_insert`, `authenticated_update`, `authenticated_delete` — усі `false`; політика одна —
  «read-only MCP role reads leads». Роль профілю «client» (`supabase_read_only_user` — так її назвав `current_user` у
  відкинутій першій серії A/B, `docs/mcp/ab/series-1/a-generic.md`) має `rolbypassrls: true` (той самий запит 1),
  тобто бачить рядки й без цієї політики: політика лише явно фіксує, хто має читати. Коментар у файлі міграції спершу
  стверджував, що доступ дає саме політика; після застосування його уточнено, SQL-інструкції у файлі — ті самі. Спроба перевірити кількість рядків від імені цієї ролі (`set local role supabase_read_only_user`) дала
  `permission denied to set role`; те, що профіль «client» бачить усі 20 лідів, підтвердив прогін A другої серії.

## Сесії: що вмикаємо разом

У кожній сесії — щонайбільше один сервер із правом запису; браузерний сервер — ніколи разом із Supabase.

Як це забезпечено: у `.claude/settings.json` закомічено `"disabledMcpjsonServers": ["supabase", "vercel", "playwright"]`,
тож звичайний `claude` у репозиторії не піднімає жодного з них. Кожну сесію Task B запускали з профілю, де рівно один сервер (`supabase.json`, `vercel.json` або `playwright.json` у `docs/mcp/profiles/`), наприклад для Supabase:

```bash
CLAUDE_CODE_AUTO_CONNECT_IDE=false ENABLE_CLAUDEAI_MCP_SERVERS=false \
  claude --mcp-config docs/mcp/profiles/supabase.json --strict-mcp-config --permission-mode default
```

`ENABLE_CLAUDEAI_MCP_SERVERS=false` вимикає конектори claude.ai акаунта, `CLAUDE_CODE_AUTO_CONNECT_IDE=false` —
автопідключення до VS Code. Усі сесії — у Terminal.app, не в терміналі VS Code. Прогони Task C ішли не з профілів,
а з `claude mcp add` (скоуп `local`) у порожніх теках поза репозиторієм — рівно один сервер на теку, з тими самими
змінними оточення; команди — у `ab-generic-vs-domain.md`.

| Крок | Увімкнено в `/mcp` | Сервер із правом запису в цій сесії |
|---|---|---|
| Міграція й сид | `supabase` («1 server»). ⚠️ Відхилення від протоколу: Claude Code сам підключився до запущеного VS Code, щоб показати дифф міграції (див. нижче) | `supabase`; інтеграцію VS Code модель не викликала |
| Перевірка лічильника (лише `select`) | `supabase` | `supabase` |
| Міграція RLS (`0002_leaddesk_rls.sql`) | `supabase` ✔ 9 tools; `computer-use` — ◯ вимкнений | `supabase` |
| Лог білду | `vercel` | `vercel`: 11 записуючих інструментів під `deny`, решта записуючих — лише через запит на схвалення; записуючих викликів не було |
| Знімок «до» | `playwright` | `playwright` (ще без `deny`; викликів браузера не було) |
| Перевірка форми в браузері | `playwright`; вбудований `computer-use` — ◯ вимкнений | `playwright` |
| Знімок «після» | `playwright`; `computer-use` — ◯ вимкнений | `playwright` |
| Task C, прогін A (обидві серії) | `supabase` з `read_only=true&features=database,docs`, 5 tools; `computer-use` — ◯ | — (профіль «client» лише читає; спроби `UPDATE` база відхилила) |
| Task C, прогін B (обидві серії) | `leaddesk`, 2 tools; `computer-use` — ◯ | `leaddesk` (`leaddesk_set_lead_status`, кожен виклик через діалог) |

Що пішло не так і що змінили:

- У сесії міграції `CLAUDE_CODE_AUTO_CONNECT_IDE=false` ще не ставили, і Claude Code сам підключився до запущеного
  VS Code, щоб показати дифф файлу міграції («Opened changes in Visual Studio Code»). У `/mcp` був лише `supabase`,
  інструментів `ide` модель не викликала. З наступної сесії — змінна `CLAUDE_CODE_AUTO_CONNECT_IDE=false`.
- Перший запуск `claude` у репозиторії створив `.claude/settings.local.json` з `"enableAllProjectMcpServers": true`
  і всіма трьома серверами в `enabledMcpjsonServers`. Локальні налаштування сильніші за закомічені, тож звичайний
  `claude` підняв би Supabase разом із браузером. Файл видалили (він і так у `.gitignore`).
- Порт 3000 перед перевіркою форми тримав dev-сервер іншого проєкту. Його зупинили й перевірили, що на
  `http://localhost:3000` відповідає саме LeadDesk, — інакше агент відкрив би чужий застосунок.

## До і після звуження: третій сервер

- Як отримали перелік: дві окремі нові сесії лише з `playwright`, запит «Перелічи всі інструменти сервера
  playwright, які тобі зараз доступні. Нічого не викликай.», потім «Збережи цей перелік у
  docs/mcp/evidence/mcp-before.txt (mcp-after.txt) — по одному інструменту на рядок…». «До» — до блоку Playwright у
  `.claude/settings.json`, «після» — з ним.
- `docs/mcp/evidence/mcp-before.txt`: 25 інструментів.
- `docs/mcp/evidence/mcp-after.txt`: 21 інструмент; зникли: `browser_run_code_unsafe`, `browser_evaluate`,
  `browser_file_upload`, `browser_drop`. Інструментів `webmcp_*` не було й у «до» (`--no-webmcp`); правило в `deny` — на
  випадок, якщо прапорець приберуть.
- Лічильник у `/mcp` в обох сесіях показував «25 tools»: заборонені інструменти він теж рахує. Тому джерело — відповідь
  агента: у сесії «після» він почав із «Сервер playwright зараз дає мені 21 інструмент» — і кількість 21, і відсутність
  чотирьох заборонених інструментів — з його власного переліку в цій сесії. У тій самій відповіді він неточно назвав
  два з 21 інструментів і виправився, звіривши написання з `mcp-before.txt`; цей файл він брав лише для формату й
  порядку рядків, і в `mcp-after.txt` потрапили точні імена.
