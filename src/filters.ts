import type { Ticket, TicketQuery } from "./types";

const priorityRank = { high: 0, normal: 1, low: 2 } as const;

export function filterTickets(tickets: Ticket[], query: TicketQuery): Ticket[] {
  const needle = query.q.trim().toLowerCase();
  return tickets.filter((ticket) => {
    if (query.status !== "all" && ticket.status !== query.status) return false;
    if (query.priority !== "all" && ticket.priority !== query.priority) return false;
    if (!needle) return true;
    const haystack = [ticket.subject, ticket.requester, ticket.company, ticket.body]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function sortTickets(tickets: Ticket[], sort: TicketQuery["sort"]): Ticket[] {
  return [...tickets].sort((a, b) => {
    if (sort === "priority") {
      const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
      if (byPriority !== 0) return byPriority;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function parseTicketQuery(params: URLSearchParams): TicketQuery {
  const status = params.get("status");
  const priority = params.get("priority");
  const sort = params.get("sort");
  return {
    status:
      status === "new" || status === "open" || status === "waiting" || status === "solved"
        ? status
        : "all",
    priority:
      priority === "low" || priority === "normal" || priority === "high" ? priority : "all",
    q: params.get("q") ?? "",
    sort: sort === "priority" ? "priority" : "updated",
  };
}
