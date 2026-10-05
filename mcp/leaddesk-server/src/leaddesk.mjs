// LeadDesk as an MCP server: two business verbs over the lead list instead of SQL on the whole database.
// Offline on purpose: reads fixtures/leads.json once (an unchanged copy of materials/leads.json), keeps
// status changes in process memory and never writes the file back. A restart brings the fixture back.
//
// factory() is shared by the stdio entry (server.mjs) and the HTTP entry (http.mjs). The leads and the
// audit log live at module level, so every McpServer the factory builds sees the same state.
import { McpServer } from "@modelcontextprotocol/server";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// The app's vocabulary: LEAD_STATUSES in lib/types.ts, ids from leadId() in lib/db.ts.
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const LEAD_ID = /^lead_\d{4}$/;

// Resolved from this module, not from the cwd: Claude Code does not start the server from your terminal.
const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

// Only the fields the two verbs need. Name, e-mail and the request text never leave the fixture.
const pick = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });

// Every field the tools sort, filter or print is checked here, so a broken fixture fails at start-up
// with the row number instead of crashing a tool call later. Messages carry ids only, no personal data.
function loadLeads(rows) {
  if (!Array.isArray(rows)) throw new Error("Фікстура має бути масивом лідів");
  const leads = new Map();
  rows.forEach((row, i) => {
    const bad = (what) => new Error(`Фікстура, рядок ${i}: ${what}`);
    if (typeof row?.id !== "string" || !LEAD_ID.test(row.id)) throw bad("id не у форматі lead_0001");
    if (leads.has(row.id)) throw bad(`id ${row.id} повторюється`);
    if (!LEAD_STATUSES.includes(row.status)) throw bad(`невідомий статус у ${row.id}`);
    if (typeof row.company !== "string" || row.company === "") throw bad(`немає компанії в ${row.id}`);
    if (typeof row.source !== "string" || row.source === "") throw bad(`немає джерела в ${row.id}`);
    if (row.budget !== null && !Number.isFinite(row.budget)) throw bad(`бюджет не число і не null у ${row.id}`);
    if (typeof row.createdAt !== "string" || Number.isNaN(Date.parse(row.createdAt))) throw bad(`невалідна дата в ${row.id}`);
    leads.set(row.id, pick(row));
  });
  return leads;
}

const leads = loadLeads(JSON.parse(await readFile(FIXTURE, "utf8")));
const auditLog = [];

const day = (iso) => iso.slice(0, 10);
const money = (budget) => (budget === null ? "без бюджету" : `${budget} USD/міс.`);
const line = (l) => `${l.id} · ${l.company} · ${l.status} · ${l.source} · ${money(l.budget)} · ${day(l.createdAt)}`;

const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

const STATUSES_MD = `# Статуси лідів LeadDesk

Статус показує, де лід у воронці Studio Nova. Статусів рівно п'ять — ті самі, що в застосунку (\`LEAD_STATUSES\`).

| Статус | Що означає для команди | Хто і коли ставить |
|---|---|---|
| \`new\` | Заявка надійшла з форми на сайті, з клієнтом ще ніхто не говорив. | Лише застосунок, коли приходить заявка. Вручну в \`new\` лід не повертаємо. |
| \`contacted\` | Ми вже зв'язалися з клієнтом щодо заявки: зателефонували або написали. | Менеджер — одразу після першого дзвінка чи листа. |
| \`qualified\` | Підтверджено потребу, бюджет і людину, яка ухвалює рішення; можна готувати кошторис. | Менеджер — після розмови, у якій це підтвердилось. |
| \`won\` | Клієнт погодив кошторис або підписав договір. | Керівник проєктів — коли кошторис погоджено чи договір підписано. |
| \`lost\` | Клієнт відмовився, обрав іншу агенцію або перестав відповідати. | Будь-хто з команди — обов'язково з причиною. |

## Правила зміни статусу

- Статус змінює лише \`leaddesk_set_lead_status\` і лише після підтвердження людини.
- Кожна зміна пише запис в аудит: \`action\`, \`leadId\`, \`at\`, а також звідки, куди і чому.
- Той самий статус повторно не ставиться: це помилка, а не «успішна» зміна.
- Помилково змінений статус виправляємо новою зміною з причиною «виправлення помилки».
`;

export const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди за статусом",
      description:
        "Повертає ліди LeadDesk із заданим статусом, найновіші першими: ідентифікатор, компанію, статус, джерело, бюджет (USD на місяць або null) і дату заявки. Імені, email і тексту заявки не повертає. Застосовуй, щоб побачити, хто на якому етапі, або знайти ідентифікатор ліда перед зміною статусу. Тільки читає, нічого не змінює.",
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Який статус шукати: new, contacted, qualified, won або lost; any — ліди в усіх статусах"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Скільки лідів повернути, від 1 до 50; за замовчуванням 10. Загальну кількість знайдених видно в total"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit }) => {
      const found = [...leads.values()]
        .filter((l) => status === "any" || l.status === status)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const shown = found.slice(0, limit).map(pick);
      const text = shown.length
        ? `Знайдено ${found.length}, показано ${shown.length}, найновіші першими:\n${shown.map(line).join("\n")}`
        : `Лідів зі статусом ${status} немає.`;
      return { content: [{ type: "text", text }], structuredContent: { status, total: found.length, leads: shown } };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда",
      description:
        "ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит (звідки, куди, коли і чому). Перед викликом покажи людині ідентифікатор, компанію, новий статус і причину та дочекайся її підтвердження. Статус new ставить лише застосунок, вручну його не встановлюють. Що означає кожен статус — у ресурсі leaddesk://reference/statuses.",
      inputSchema: {
        leadId: z
          .string()
          .regex(LEAD_ID)
          .describe("Ідентифікатор ліда у форматі lead_0001, напр. lead_0002. Не знаєте ідентифікатора — знайдіть його через leaddesk_find_leads"),
        status: z
          .enum(LEAD_STATUSES)
          .describe("Новий статус: contacted, qualified, won або lost (new вручну не ставиться). Має відрізнятися від поточного"),
        reason: z
          .string()
          .min(3)
          .max(500)
          .describe("Чому змінюємо статус, 3–500 символів, напр. «зателефонували, клієнт чекає кошторис». Потрапляє в запис аудиту"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ leadId, status, reason }) => {
      const lead = leads.get(leadId);
      if (!lead) {
        return fail(`Ліда ${leadId} у LeadDesk немає. Знайдіть правильний ідентифікатор через leaddesk_find_leads зі status: "any".`);
      }
      if (status === "new") {
        return fail(`Статус new ставить лише застосунок, коли надходить заявка; повернути ${leadId} у new вручну не можна. Значення статусів — у ресурсі leaddesk://reference/statuses.`);
      }
      if (lead.status === status) {
        return fail(`${leadId} уже має статус ${status}, змінювати нічого. Поточний стан — через leaddesk_find_leads.`);
      }

      const from = lead.status;
      lead.status = status;
      const audit = { action: "lead.status_changed", leadId, at: new Date().toISOString(), from, to: status, reason };
      auditLog.push(audit);
      // stderr only: stdout is the protocol channel. Ids and statuses, no personal data.
      console.error(`audit #${auditLog.length}: ${audit.action} ${leadId} ${from} -> ${status}`);

      return {
        content: [{ type: "text", text: `${leadId} (${lead.company}): ${from} → ${status}. Запис аудиту: ${audit.action}, ${audit.at}.` }],
        structuredContent: { lead: pick(lead), audit },
      };
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    "leaddesk://reference/statuses",
    {
      title: "Статуси лідів LeadDesk",
      description: "П'ять статусів ліда і що кожен означає для команди: хто і коли переводить лід у статус",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUSES_MD }] }),
  );

  return server;
};
