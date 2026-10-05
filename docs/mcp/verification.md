# Перевірка (Task A, Task B, бонус E)

- **Інструмент і версія, модель:** Claude Code 2.1.20 (розширення VS Code) · Claude Opus 5.5 (`claude-opus-5-5`)
- **ОС і термінал, Node:** macOS 26.6 · zsh · Node 22.20.0 · MCP Inspector CLI 2.8.0

## Task A — сервер в Inspector

- **Команди**, якими зроблено чотири файли в `docs/mcp/`: дослівно як у walkthrough (Task A, крок 4), з кореня
  репозиторію, у zsh замість Git Bash (macOS). Вивід Inspector'а збережено як є, без правок руками:

  ```bash
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/list > docs/mcp/tools-list.json                                   # exit=0
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json   # exit=0
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok > docs/mcp/bad-input.json; echo "exit=$?"   # exit=5
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json   # exit=0
  ```

- **`tools-list.json`:** рівно два інструменти. `leaddesk_find_leads` — `{"readOnlyHint":true,"openWorldHint":false}`;
  `leaddesk_set_lead_status` — `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}`.
  Модель бачить опис у кожного з п'яти параметрів і обмеження в схемі: `status` — `enum` (у пошуку ще `any`),
  `limit` — `integer` 1–50 з `default: 10`, `leadId` — `pattern: ^lead_\d{4}$`, `reason` — `minLength: 3`,
  `maxLength: 500`. Опис `leaddesk_set_lead_status` починається з «ЗМІНЮЄ ДАНІ» і просить підтвердження людини.
- **`bad-input.json`:** зламали `leadId` (`nope`) і заодно `reason` (`ok` — 2 символи). Відповідь — `"isError": true` з
  текстом `Input validation error: Invalid arguments for tool leaddesk_set_lead_status: leadId: Invalid string: must
  match pattern /^lead_\d{4}$/, reason: Too small: expected string to have >=3 characters`. Inspector вийшов з кодом
  **5** і написав у stderr `{"error":{"code":"tool_is_error","message":"Tool 'leaddesk_set_lead_status' returned isError:true."}}`.
- **`set-status.json`:** `lead_0002` (Rynok Books), `new → contacted`. У `structuredContent` — новий стан ліда (лише
  `id, company, status, source, budget, createdAt`) і запис аудиту:
  `{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-05T07:01:52.454Z","from":"new","to":"contacted","reason":"перевірка в Inspector"}`.
  У stderr сервер написав лише `audit #1: lead.status_changed lead_0002 new -> contacted`.
- **`resource-read.json`:** `leaddesk://reference/statuses`, `"mimeType": "text/markdown"`, таблиця п'яти статусів: що
  означає кожен для команди, хто і коли його ставить, плюс правила зміни статусу.
- **Самоперевірка з walkthrough:** анотації як вище; `grep -c '"isError": true' docs/mcp/bad-input.json` → `1`; у
  `set-status.json` є `"action"`, `"at"`, `"leadId"`; `grep -rc 'console\.log' mcp/leaddesk-server/src` → `0` в обох
  файлах; `cmp materials/leads.json mcp/leaddesk-server/fixtures/leads.json` — без різниці.
- **Додатково перевірили тими самими командами Inspector'а** (виводи не комітили): той самий статус (`lead_0003` →
  `contacted`), невідомий лід (`lead_9999`), повернення в `new` і `limit=51` — усі чотири дають `isError: true` з
  підказкою; запити 1–3 з `materials/ab-prompts.md` збігаються з ключем (3 qualified; п'ять найновіших new —
  `lead_0002`, `0005`, `0004`, `0018`, `0012`; won — 9000 USD/міс., один без бюджету, `lead_0006`). Фікстура з битою
  датою зупиняє сервер на старті: `Фікстура, рядок 0: невалідна дата в lead_0001`. Після всіх викликів файл фікстури
  не змінився.
- **Що було найважче в описах інструментів і параметрів:** рубрика вимагає в `status` рівно п'ять статусів
  застосунку, тож `new` лишився в `enum`, хоча вручну його ставити не можна. Це правило довелось записати в трьох
  місцях, що узгоджені між собою: в описі параметра, в описі інструмента й у ресурсі, — а сервер ще й відхиляє `new`
  з `isError`. Друге — «підтвердження людини»: текст в описі лише просить модель, а не змушує клієнта показати
  діалог. Справжній запит на схвалення дає те, що `leaddesk_set_lead_status` не стоїть в `allow`. Третє — щоб
  модель не просила імена й email, яких немає: опис пошуку прямо каже, яких полів він не повертає.

## Task B — що зробили агенти з серверами

Ще не виконано — розділ заповнимо після сесій Task B.

## Task E (бонус)

- **Варіант:** E1 — сервер по HTTP із захистом Host/Origin.
- **Код:** `mcp/leaddesk-server/src/http.mjs` — та сама `factory` з `src/leaddesk.mjs`, що й у stdio-входу:
  `toNodeHandler(createMcpHandler(factory))`. Гварди `localhostHostValidation()` і `localhostOriginValidation()`
  **викликано в обробнику запиту** до `mcp(req, res)` — опцією в `toNodeHandler` їх не передаємо, бо таку
  опцію мовчки проігноровано. Слухає лише `127.0.0.1:3333` (`lsof` показав `TCP 127.0.0.1:3333 (LISTEN)`);
  будь-який шлях, крім `/mcp`, — 404. Пакет `"@modelcontextprotocol/node": "2.1.0"` — точна версія в тому самому
  `package.json`.
- **Запуск:** `node mcp/leaddesk-server/src/http.mjs` → у stderr `leaddesk MCP over HTTP: http://127.0.0.1:3333/mcp`.
- **Чотири відповіді `curl`** — команди дослівно з walkthrough (Task E, E1), bash на macOS. `body.json` лежав у
  тимчасовій теці поза репозиторієм і в git не потрапив.

  ```bash
  printf '%s' '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}}' > body.json
  H=(-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "MCP-Protocol-Version: 2026-07-28" -H "Mcp-Method: tools/list")
  ```

  1. Справжній запит — **HTTP 200**, обидва інструменти з анотаціями (повна відповідь — нижче):

     ```bash
     curl -s -w '\nHTTP %{http_code}\n' "${H[@]}" --data-binary @body.json http://127.0.0.1:3333/mcp
     ```

  2. Підроблений `Host` — **HTTP 403**:

     ```text
     $ curl -s -w '\nHTTP %{http_code}\n' "${H[@]}" -H "Host: evil.example" --data-binary @body.json http://127.0.0.1:3333/mcp
     {"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Host: evil.example"},"id":null}
     HTTP 403
     ```

  3. Підроблений `Origin` — **HTTP 403**:

     ```text
     $ curl -s -w '\nHTTP %{http_code}\n' "${H[@]}" -H "Origin: https://evil.example" --data-binary @body.json http://127.0.0.1:3333/mcp
     {"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Origin: evil.example"},"id":null}
     HTTP 403
     ```

  4. Без заголовка `MCP-Protocol-Version` — **HTTP 400**, код **-32020**:

     ```text
     $ curl -s -w '\nHTTP %{http_code}\n' -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "Mcp-Method: tools/list" --data-binary @body.json http://127.0.0.1:3333/mcp
     {"jsonrpc":"2.0","error":{"code":-32020,"message":"Bad Request: the request headers and body disagree: the body envelope names protocol version 2026-07-28 but the required MCP-Protocol-Version header is absent","data":{"mismatch":{"header":"(missing)","body":"the body envelope names protocol version 2026-07-28 but the required MCP-Protocol-Version header is absent"}}},"id":1}
     HTTP 400
     ```

  <details>
  <summary>Повна відповідь запиту 1 (HTTP 200)</summary>

  ```text
  {"result":{"tools":[{"name":"leaddesk_find_leads","title":"Знайти ліди за статусом","description":"Повертає ліди LeadDesk із заданим статусом, найновіші першими: ідентифікатор, компанію, статус, джерело, бюджет (USD на місяць або null) і дату заявки. Імені, email і тексту заявки не повертає. Застосовуй, щоб побачити, хто на якому етапі, або знайти ідентифікатор ліда перед зміною статусу. Тільки читає, нічого не змінює.","inputSchema":{"type":"object","$schema":"https://json-schema.org/draft/2020-12/schema","properties":{"status":{"type":"string","enum":["new","contacted","qualified","won","lost","any"],"description":"Який статус шукати: new, contacted, qualified, won або lost; any — ліди в усіх статусах"},"limit":{"default":10,"description":"Скільки лідів повернути, від 1 до 50; за замовчуванням 10. Загальну кількість знайдених видно в total","type":"integer","minimum":1,"maximum":50}},"required":["status"]},"annotations":{"readOnlyHint":true,"openWorldHint":false}},{"name":"leaddesk_set_lead_status","title":"Змінити статус ліда","description":"ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит (звідки, куди, коли і чому). Перед викликом покажи людині ідентифікатор, компанію, новий статус і причину та дочекайся її підтвердження. Статус new ставить лише застосунок, вручну його не встановлюють. Що означає кожен статус — у ресурсі leaddesk://reference/statuses.","inputSchema":{"type":"object","$schema":"https://json-schema.org/draft/2020-12/schema","properties":{"leadId":{"type":"string","pattern":"^lead_\\d{4}$","description":"Ідентифікатор ліда у форматі lead_0001, напр. lead_0002. Не знаєте ідентифікатора — знайдіть його через leaddesk_find_leads"},"status":{"type":"string","enum":["new","contacted","qualified","won","lost"],"description":"Новий статус: contacted, qualified, won або lost (new вручну не ставиться). Має відрізнятися від поточного"},"reason":{"type":"string","minLength":3,"maxLength":500,"description":"Чому змінюємо статус, 3–500 символів, напр. «зателефонували, клієнт чекає кошторис». Потрапляє в запис аудиту"}},"required":["leadId","status","reason"]},"annotations":{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}}],"resultType":"complete","ttlMs":0,"cacheScope":"private","_meta":{"io.modelcontextprotocol/serverInfo":{"name":"leaddesk","version":"0.1.0"}}},"jsonrpc":"2.0","id":1}
  HTTP 200
  ```

  </details>

- **Що ще перевірили:** стан спільний для всіх запитів — після `leaddesk_set_lead_status` (`lead_0002` →
  `contacted`) другий такий самий виклик по HTTP повернув `isError: true` «lead_0002 уже має статус contacted».
- **Чого гварди не закривають:** автентифікації немає. Будь-який процес на цій машині, який може відкрити
  `127.0.0.1:3333`, викликає обидва інструменти, зокрема зміну статусу, — і без жодного запиту на схвалення:
  діалог показує клієнт (Claude Code), а не сервер. Тому HTTP-варіант — лише для локальної демонстрації; порт назовні
  не відкриваємо (див. `docs/mcp/threat-model.md`).
