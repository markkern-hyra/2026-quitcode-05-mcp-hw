# LeadDesk MCP server (Task A)

Доменний MCP-сервер LeadDesk: два бізнес-дієслова над лідами замість SQL на всю базу.

| Що | Ім'я | Змінює дані |
|---|---|---|
| Інструмент | `leaddesk_find_leads` — ліди за статусом, найновіші першими; лише `id`, `company`, `status`, `source`, `budget`, `createdAt` | ні (`readOnlyHint: true`) |
| Інструмент | `leaddesk_set_lead_status` — новий статус ліда й запис аудиту `{ action, leadId, at, from, to, reason }` | так (`readOnlyHint: false`) |
| Ресурс | `leaddesk://reference/statuses` (`text/markdown`) — п'ять статусів і що кожен означає для команди | — |

Статуси — рівно `LEAD_STATUSES` застосунку (`new`, `contacted`, `qualified`, `won`, `lost`), ідентифікатор —
`^lead_\d{4}$`. Статус `new` ставить лише застосунок, тому `leaddesk_set_lead_status` його відхиляє.

## Режим роботи

Сервер працює офлайн: один раз читає `fixtures/leads.json` (незмінна копія `materials/leads.json`,
20 лідів `lead_0001`–`lead_0020`) і тримає зміни статусів у пам'яті процесу. Файл фікстури сервер не
переписує ніколи: після перезапуску дані знову ті самі.

| Змінна оточення | Навіщо | За замовчуванням |
|---|---|---|
| `LEADDESK_FIXTURE` | шлях до іншої фікстури того самого формату | `fixtures/leads.json` поруч із сервером |

Секретів сервер не потребує. Журнал — лише в stderr (`console.error`): ідентифікатор ліда й статуси, без
персональних даних. stdout — канал протоколу.

## Встановлення й запуск

З кореня репозиторію:

```bash
(cd mcp/leaddesk-server && npm ci)
node mcp/leaddesk-server/src/server.mjs
```

Сервер чекає на JSON-RPC у stdin; сам по собі нічого не друкує. Зупинка — `Ctrl+C`.

## Перевірка в MCP Inspector

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/list

npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_find_leads --tool-arg status=qualified

npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method resources/read --uri leaddesk://reference/statuses
```

Кожен виклик Inspector'а запускає сервер заново, тож `lead_0002` щоразу починає зі статусу `new`.
Збережені виводи — у [`docs/mcp/`](../../docs/mcp/).

## Підключення до Claude Code

```bash
claude mcp add leaddesk -- node "$(pwd)/mcp/leaddesk-server/src/server.mjs"
```

Шлях — абсолютний: Claude Code запускає сервер не з вашої теки. Після підключення `/mcp` показує
`leaddesk` із двома інструментами. `leaddesk_set_lead_status` не додавайте в `allow`: кожна зміна
статусу має проходити через запит на схвалення.
