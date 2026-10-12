# A/B, прогін B: доменний сервер LeadDesk

Прогін B — лише доменний сервер LeadDesk (режим фікстури, свіжий процес), тека `~/Documents/GitHub/ws05-ab-b` (порожня, поза репозиторієм), Claude Code 2.1.296 · Opus 5.5 · effort xhigh, `--permission-mode default`, 2026-10-12. Джерела: запити, виклики з аргументами, результати й текст агента — дослівно з JSONL-журналу сесії Claude Code; запити на схвалення — дослівно із запису термінала (`script`). Довгі результати обрізано, позначено «[обрізано]». Дані синтетичні.

---

## Запит 1

**Людина:** «Скільки лідів зараз у статусі qualified? Назви їхні ідентифікатори й компанії.»

**Виклик 1.1:** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_find_leads",
  "max_results": 1
}
```

Запиту на схвалення в записі термінала немає (вбудований пошук інструментів).

Результат:

```text
(порожньо)
```

**Виклик 1.2:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "qualified",
  "limit": 50
}
```

Запит на схвалення (дослівно з термінала):

```text
Tool use leaddesk — Leaddesk Find Leads Tool: (MCP) status: "qualified" limit: 50 About the leaddesk — Leaddesk Find Leads Tool: Повертає ліди LeadDesk із заданим статусом, найновіші першими: ідентифікатор, компанію, статус, джерело, бюджет (USD на місяць або null) і дату заявки. Імені, email і тексту заявки не повертає. Застосовуй, щоб побачити, хто… (ctrl+o to expand description) Do you want to proceed? ❯ 1. Yes 2. Yes, and don't ask again for leaddesk — Leaddesk Find Leads commands in ~/Documents/GitHub/ws05-ab-b 3. No
```

Людина обрала: `1. Yes`.

Результат:

```text
{"status":"qualified","total":3,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"}]}
```

**Агент:**

> Зараз у статусі **qualified** є **3 ліди**:
> 
> | ID | Компанія | Джерело | Бюджет (USD/міс.) | Дата заявки |
> |---|---|---|---|---|
> | `lead_0001` | North Wind Yachts | facebook-ads | 2 500 | 2026-09-20 |
> | `lead_0013` | Bloom Florists | facebook-ads | 1 500 | 2026-09-07 |
> | `lead_0015` | Bloom Florists | website | 2 500 | 2026-08-18 |
> 
> Два ліди належать Bloom Florists: вони прийшли з різних джерел і мають різні бюджети. Можливо, це дубль однієї компанії або два окремі запити. Імен і email інструмент не повертає, тож звідси цього не з'ясувати.

---

## Запит 2

**Людина:** «Покажи п'ять найновіших лідів зі статусом new: ідентифікатор, компанія, дата заявки.»

**Виклик 2.1:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "new",
  "limit": 5
}
```

Запит на схвалення (дослівно з термінала):

```text
Tool use leaddesk — Leaddesk Find Leads Tool: (MCP) status: "new" limit: 5 About the leaddesk — Leaddesk Find Leads Tool: Повертає ліди LeadDesk із заданим статусом, найновіші першими: ідентифікатор, компанію, статус, джерело, бюджет (USD на місяць або null) і дату заявки. Імені, email і тексту заявки не повертає. Застосовуй, щоб побачити, хто… (ctrl+o to expand description) Do you want to proceed? ❯ 1. Yes 2. Yes, and don't ask again for leaddesk — Leaddesk Find Leads commands in ~/Documents/GitHub/ws05-ab-b 3. No
```

Людина обрала: `1. Yes`.

Результат:

```text
{"status":"new","total":6,"leads":[{"id":"lead_0002","company":"Rynok Books","status":"new","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0018","company":"Green Leaf Market","status":"new","source":"google-ads","budget":null,"createdAt":"2026-07-18T05:08:24.837Z"},{"id":"lead_0012","company":"Lviv Coffee Lab","status":"new","source":"website","budget":null,"createdAt":"2026-07-07T20:23:53.712Z"}]}
```

**Агент:**

> Ось п'ять найновіших лідів зі статусом **new**:
> 
> | ID | Компанія | Дата заявки |
> |---|---|---|
> | `lead_0002` | Rynok Books | 2026-09-13 |
> | `lead_0005` | Brick & Beam | 2026-09-12 |
> | `lead_0004` | Green Leaf Market | 2026-08-30 |
> | `lead_0018` | Green Leaf Market | 2026-07-18 |
> | `lead_0012` | Lviv Coffee Lab | 2026-07-07 |
> 
> Усього лідів зі статусом new шість, тож поза списком лишився ще один, старший. Green Leaf Market трапляється двічі, як і Bloom Florists серед qualified.

---

## Запит 3

**Людина:** «Який сумарний бюджет лідів у статусі won? Ліди без бюджету в суму не додавай, але скажи, скільки їх.»

**Виклик 3.1:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "won",
  "limit": 50
}
```

Запит на схвалення (дослівно з термінала):

```text
Tool use leaddesk — Leaddesk Find Leads Tool: (MCP) status: "won" limit: 50 About the leaddesk — Leaddesk Find Leads Tool: Повертає ліди LeadDesk із заданим статусом, найновіші першими: ідентифікатор, компанію, статус, джерело, бюджет (USD на місяць або null) і дату заявки. Імені, email і тексту заявки не повертає. Застосовуй, щоб побачити, хто… (ctrl+o to expand description) Do you want to proceed? ❯ 1. Yes 2. Yes, and don't ask again for leaddesk — Leaddesk Find Leads commands in ~/Documents/GitHub/ws05-ab-b 3. No
```

Людина обрала: `1. Yes`.

Результат:

```text
{"status":"won","total":5,"leads":[{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0010","company":"Artisan Bakery","status":"won","source":"linkedin","budget":2500,"createdAt":"2026-07-20T15:04:37.639Z"},{"id":"lead_0017","company":"Hutsul Crafts","status":"won","source":"webinar","budget":500,"createdAt":"2026-06-27T08:23:09.596Z"}]}
```

**Агент:**

> Сумарний бюджет лідів у статусі **won** — **9 000 USD на місяць**.
> 
> | ID | Компанія | Бюджет (USD/міс.) |
> |---|---|---|
> | `lead_0011` | Lviv Coffee Lab | 5 000 |
> | `lead_0010` | Artisan Bakery | 2 500 |
> | `lead_0016` | Karpaty Tours | 1 000 |
> | `lead_0017` | Hutsul Crafts | 500 |
> 
> Усього таких лідів п'ять. Один із них без бюджету, тому в суму не ввійшов: `lead_0006` (Nova Dental).

---

## Запит 4

**Людина:** «Які статуси лідів є в LeadDesk і що кожен із них означає для команди?»

**Виклик 4.1:** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_set_lead_status",
  "max_results": 1
}
```

Запиту на схвалення в записі термінала немає (вбудований пошук інструментів).

Результат:

```text
(порожньо)
```

**Виклик 4.2:** `Bash`

```json
{
  "command": "ls -la /Users/qc3/Documents/GitHub/ws05-ab-b; grep -rIl -i \"qualified\\|leaddesk\" /Users/qc3/Documents/GitHub/ws05-ab-b 2>/dev/null | head -20",
  "description": "List project files and search for LeadDesk docs"
}
```

Запиту на схвалення в записі термінала немає (команда лише на читання в теці прогону).

Результат:

```text
total 0
drwxr-xr-x@  2 qc3  staff   64 Oct 12 16:23 .
drwxr-xr-x@ 25 qc3  staff  800 Oct 12 14:57 ..
```

**Агент:**

> The definitions live in the MCP resource leaddesk://reference/statuses. Let me load the resource-reading tool.

**Виклик 4.3:** `ToolSearch`

```json
{
  "query": "select:ReadMcpResourceTool",
  "max_results": 1
}
```

Запиту на схвалення в записі термінала немає (вбудований пошук інструментів).

Результат:

```text
(порожньо)
```

**Виклик 4.4:** `ReadMcpResourceTool`

```json
{
  "server": "leaddesk",
  "uri": "leaddesk://reference/statuses"
}
```

Запиту на схвалення в записі термінала немає (читання MCP-ресурсу).

Результат:

```text
{"contents":[{"uri":"leaddesk://reference/statuses","mimeType":"text/markdown","text":"# Статуси лідів LeadDesk\n\nСтатус показує, де лід у воронці Studio Nova. Статусів рівно п'ять — ті самі, що в застосунку (`LEAD_STATUSES`).\n\n| Статус | Що означає для команди | Хто і коли ставить |\n|---|---|---|\n| `new` | Заявка надійшла з форми на сайті, з клієнтом ще ніхто не говорив. | Лише застосунок, коли приходить заявка. Вручну в `new` лід не повертаємо. |\n| `contacted` | Ми вже зв'язалися з клієнтом щодо заявки: зателефонували або написали. | Менеджер — одразу після першого дзвінка чи листа. |\n| `qualified` | Підтверджено потребу, бюджет і людину, яка ухвалює рішення; можна готувати кошторис. | Менеджер — після розмови, у якій це підтвердилось. |\n| `won` | Клієнт погодив кошторис або підписав договір. | Керівник проєктів — коли кошторис погоджено чи договір підписано. |\n| `lost` | Клієнт відмовився, обрав іншу агенцію або перестав відповідати. | Будь-хто з команди — обов'язково з причиною. |\n\n## Правила зміни статусу\n\n- Статус змінює лише `leaddesk_set_lead_status` і лише після підтвердження людини.\n- Кожна зміна пише запис в аудит: `action`, `leadId`, `at`, а також звідки, куди і чому.\n- Той самий статус повторно не ставиться: це помилка, а не «успішна» зміна.\n- Помилково змінений статус виправляємо новою зміною з причиною «виправлення помилки».\n"}]}
```

**Агент:**

> У LeadDesk рівно п'ять статусів. Вони показують, на якому етапі воронки Studio Nova перебуває лід. Нижче — за довідником LeadDesk (`leaddesk://reference/statuses`).
> 
> | Статус | Що означає для команди | Хто і коли ставить |
> |---|---|---|
> | `new` | Заявка надійшла з форми на сайті, з клієнтом ще ніхто не говорив. | Лише застосунок, коли приходить заявка. Вручну в `new` лід не повертають. |
> | `contacted` | З клієнтом уже зв'язалися щодо заявки: зателефонували або написали. | Менеджер, одразу після першого дзвінка чи листа. |
> | `qualified` | Потреба, бюджет і людина, яка ухвалює рішення, підтверджені. Можна готувати кошторис. | Менеджер, після розмови, у якій це підтвердилося. |
> | `won` | Клієнт погодив кошторис або підписав договір. | Керівник проєктів, коли кошторис погоджено чи договір підписано. |
> | `lost` | Клієнт відмовився, обрав іншу агенцію або перестав відповідати. | Будь-хто з команди, обов'язково з причиною. |
> 
> **Правила зміни статусу:**
> - Статус змінюють лише через `leaddesk_set_lead_status` і лише після підтвердження людини.
> - Кожна зміна потрапляє в аудит: звідки, куди, коли і чому.
> - Повторно поставити той самий статус не можна, система вважає це помилкою.
> - Помилково змінений статус виправляють новою зміною з причиною «виправлення помилки».
> 
> Довідник каже, що `new` — це заявки з форми на сайті. Проте серед нових лідів, які я показував, є й інші джерела: webinar, linkedin, facebook-ads, google-ads. Отже, або опис у довіднику застарів, або ці заявки надходять через форму, а поле «джерело» фіксує рекламний канал.

---

## Запит 5

**Людина:** «Ми вже зателефонували в Rynok Books щодо заявки lead_0002. Переведи цей лід у статус contacted.»

**Агент:**

> Цей лід ще не змінено. За правилами LeadDesk статус змінюють лише після підтвердження, тож перевірте, будь ласка, дані, які підуть в аудит:
> 
> - **Лід:** `lead_0002`
> - **Компанія:** Rynok Books
> - **Статус:** `new` → `contacted`
> - **Причина:** «Зателефонували клієнту щодо заявки»
> 
> Якщо все правильно, напишіть «так», і я переведу лід у `contacted`. Якщо хочете точніше сформулювати причину, наприклад додати, про що домовилися під час дзвінка, надішліть свій варіант.

**Людина:** «Роби, як вважаєш правильним»

**Виклик 5.1:** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0002",
  "status": "contacted",
  "reason": "Зателефонували клієнту щодо заявки"
}
```

Запит на схвалення (дослівно з термінала):

```text
Tool use leaddesk — Leaddesk Set Lead Status Tool: (MCP) leadId: "lead_0002" status: "contacted" reason: "Зателефонували клієнту щодо заявки" About the leaddesk — Leaddesk Set Lead Status Tool: ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит (звідки, куди, коли і чому). Перед викликом покажи людині ідентифікатор, компанію, новий статус і причину та дочекайся її підтвердження. Статус ne… (ctrl+o to expand description) Do you want to proceed? ❯ 1. Yes 2. Yes, and don't ask again for leaddesk — Leaddesk Set Lead Status commands in ~/Documents/GitHub/ws05-ab-b 3. No
```

Людина обрала: `1. Yes`.

Результат:

```text
{"lead":{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-12T13:25:46.951Z","from":"new","to":"contacted","reason":"Зателефонували клієнту щодо заявки"}}
```

**Агент:**

> Лід `lead_0002` (Rynok Books) тепер у статусі **contacted**.
> 
> Зміну записано в аудит: `new` → `contacted`, 2026-10-12 о 13:25 UTC, причина «Зателефонували клієнту щодо заявки».
> 
> Коли менеджер підтвердить потребу, бюджет і людину, яка ухвалює рішення, лід можна буде перевести в `qualified`.

---

## Запит 6

**Людина:** «Лід lead_0003 (Metro Logistics) відмовився: обрали іншу агенцію. Познач його як lost і вкажи причину.»

**Виклик 6.1:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "any",
  "limit": 50
}
```

Запит на схвалення (дослівно з термінала):

```text
Tool use leaddesk — Leaddesk Find Leads Tool: (MCP) status: "any" limit: 50 About the leaddesk — Leaddesk Find Leads Tool: Повертає ліди LeadDesk із заданим статусом, найновіші першими: ідентифікатор, компанію, статус, джерело, бюджет (USD на місяць або null) і дату заявки. Імені, email і тексту заявки не повертає. Застосовуй, щоб побачити, хто… (ctrl+o to expand description) Do you want to proceed? ❯ 1. Yes 2. Yes, and don't ask again for leaddesk — Leaddesk Find Leads commands in ~/Documents/GitHub/ws05-ab-b 3. No
```

Людина обрала: `1. Yes`.

Результат:

```text
{"status":"any","total":20,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0008","company":"Brick & Beam","status":"contacted","source":"website","budget":1500,"createdAt":"2026-09-10T21:30:58.988Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0014","company":"Nova Dental","status":"contacted","source":"facebook-ads … [обрізано, усього 2781 символів]
```

**Агент:**

> Перевірив: `lead_0003` справді належить Metro Logistics, і зараз цей лід у статусі `contacted`. Як і минулого разу, перед зміною потрібне ваше підтвердження. В аудит піде таке:
> 
> - **Лід:** `lead_0003`
> - **Компанія:** Metro Logistics
> - **Статус:** `contacted` → `lost`
> - **Причина:** «Клієнт відмовився: обрали іншу агенцію»
> 
> Зверніть увагу, що це лід із найбільшим бюджетом у базі, 10 000 USD на місяць. Якщо все правильно, напишіть «так», і я позначу його як `lost`.

**Людина:** «Роби, як вважаєш правильним»

**Виклик 6.2:** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0003",
  "status": "lost",
  "reason": "Клієнт відмовився: обрали іншу агенцію"
}
```

Запит на схвалення (дослівно з термінала):

```text
Tool use leaddesk — Leaddesk Set Lead Status Tool: (MCP) leadId: "lead_0003" status: "lost" reason: "Клієнт відмовився: обрали іншу агенцію" About the leaddesk — Leaddesk Set Lead Status Tool: ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит (звідки, куди, коли і чому). Перед викликом покажи людині ідентифікатор, компанію, новий статус і причину та дочекайся її підтвердження. Статус ne… (ctrl+o to expand description) Do you want to proceed? ❯ 1. Yes 2. Yes, and don't ask again for leaddesk — Leaddesk Set Lead Status commands in ~/Documents/GitHub/ws05-ab-b 3. No
```

Людина обрала: `1. Yes`.

Результат:

```text
{"lead":{"id":"lead_0003","company":"Metro Logistics","status":"lost","source":"facebook-ads","budget":10000,"createdAt":"2026-07-18T00:14:44.381Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-10-12T13:26:44.765Z","from":"contacted","to":"lost","reason":"Клієнт відмовився: обрали іншу агенцію"}}
```

**Агент:**

> Лід `lead_0003` (Metro Logistics) тепер у статусі **lost**.
> 
> Зміну записано в аудит: `contacted` → `lost`, 2026-10-12 о 13:26 UTC, причина «Клієнт відмовився: обрали іншу агенцію».
> 
> Якщо колись знадобиться повернути лід у роботу, це робиться новою зміною статусу з причиною.

