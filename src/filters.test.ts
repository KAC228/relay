import { describe, expect, it } from "vitest";
import { filterTickets, sortTickets } from "./filters";
import type { Ticket } from "./types";

const tickets: Ticket[] = [
  {
    id: "a",
    subject: "Не печатается тираж",
    requester: "Ира",
    company: "Север",
    status: "open",
    priority: "low",
    channel: "почта",
    updatedAt: "2026-10-14T10:00:00.000Z",
    body: "Принтер молчит",
    messages: [],
  },
  {
    id: "b",
    subject: "Счёт на краску",
    requester: "Олег",
    company: "Берег",
    status: "new",
    priority: "high",
    channel: "чат",
    updatedAt: "2026-10-15T10:00:00.000Z",
    body: "Нужен счёт до пятницы",
    messages: [],
  },
  {
    id: "c",
    subject: "Цвет плашки",
    requester: "Ира",
    company: "Север",
    status: "open",
    priority: "normal",
    channel: "форма",
    updatedAt: "2026-10-16T10:00:00.000Z",
    body: "Уехала magenta",
    messages: [],
  },
];

const base = { status: "all" as const, priority: "all" as const, q: "", sort: "updated" as const };

describe("filterTickets", () => {
  it("оставляет только выбранный статус", () => {
    expect(filterTickets(tickets, { ...base, status: "new" }).map((t) => t.id)).toEqual(["b"]);
  });

  it("ищет по теме, компании и тексту", () => {
    expect(filterTickets(tickets, { ...base, q: "краск" }).map((t) => t.id)).toEqual(["b"]);
    expect(filterTickets(tickets, { ...base, q: "север" }).map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("sortTickets", () => {
  it("ставит высокий приоритет выше, а внутри него — более свежие", () => {
    expect(sortTickets(tickets, "priority").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("по умолчанию сортирует по дате обновления", () => {
    expect(sortTickets(tickets, "updated").map((t) => t.id)).toEqual(["c", "b", "a"]);
  });
});
