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

Ще не виконано — варіант E1 (HTTP-сервер).
