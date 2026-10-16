import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchTickets, sendReply, updateStatus } from "./api";
import { priorityLabel, statusLabel } from "./data";
import { filterTickets, parseTicketQuery, sortTickets } from "./filters";
import type { Status, Ticket } from "./types";

const statuses: Array<Status | "all"> = ["all", "new", "open", "waiting", "solved"];
const priorities = ["all", "high", "normal", "low"] as const;

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `сегодня, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `вчера, ${time}`;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function replaceTicket(list: Ticket[] | undefined, next: Ticket) {
  return (list ?? []).map((item) => (item.id === next.id ? next : item));
}

export function App() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = parseTicketQuery(params);
  const ticketsQuery = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const visible = useMemo(() => {
    const filtered = filterTickets(ticketsQuery.data ?? [], query);
    return sortTickets(filtered, query.sort);
  }, [ticketsQuery.data, query]);

  useEffect(() => {
    if (!visible.length) return;
    if (!selectedId || !visible.some((ticket) => ticket.id === selectedId)) {
      setSelectedId(visible[0].id);
    }
  }, [visible, selectedId]);

  const selected = visible.find((ticket) => ticket.id === selectedId) ?? null;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tickets"] });
      const previous = queryClient.getQueryData<Ticket[]>(["tickets"]);
      queryClient.setQueryData<Ticket[]>(["tickets"], (list) =>
        (list ?? []).map((ticket) =>
          ticket.id === id ? { ...ticket, status, updatedAt: new Date().toISOString() } : ticket,
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tickets"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => sendReply(id, text),
    onSuccess: (ticket) => {
      queryClient.setQueryData<Ticket[]>(["tickets"], (list) => replaceTicket(list, ticket));
      setDraft("");
    },
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }
      if (!visible.length || !selected) return;
      const index = visible.findIndex((ticket) => ticket.id === selected.id);
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedId(visible[Math.min(visible.length - 1, index + 1)].id);
      }
      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedId(visible[Math.max(0, index - 1)].id);
      }
      const byKey: Record<string, Status> = { "1": "new", "2": "open", "3": "waiting", "4": "solved" };
      const next = byKey[event.key];
      if (next) statusMutation.mutate({ id: selected.id, status: next });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selected, statusMutation]);

  function setQuery(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "all" || (key === "sort" && value === "updated") || (key === "q" && value === "")) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setParams(next, { replace: true });
  }

  const counts = useMemo(() => {
    const all = ticketsQuery.data ?? [];
    return {
      all: all.length,
      new: all.filter((ticket) => ticket.status === "new").length,
      open: all.filter((ticket) => ticket.status === "open").length,
      waiting: all.filter((ticket) => ticket.status === "waiting").length,
      solved: all.filter((ticket) => ticket.status === "solved").length,
    };
  }, [ticketsQuery.data]);

  return (
    <div className="app">
      <aside className="rail">
        <p className="mark">Relay</p>
        <p className="rail-note">Очередь цеха «Нордлайт»</p>
        <nav>
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              className={query.status === status ? "rail-btn is-on" : "rail-btn"}
              onClick={() => setQuery({ status })}
            >
              <span>{status === "all" ? "все" : statusLabel[status]}</span>
              <span>{counts[status]}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="list">
        <header className="list-head">
          <div>
            <p className="eyebrow">обращения</p>
            <h1>{visible.length}</h1>
          </div>
          <label className="sort">
            <span>порядок</span>
            <select
              value={query.sort}
              onChange={(event) => setQuery({ sort: event.target.value })}
            >
              <option value="updated">сначала свежие</option>
              <option value="priority">сначала срочные</option>
            </select>
          </label>
        </header>
        <input
          className="search"
          value={query.q}
          placeholder="Тема, клиент или текст"
          onChange={(event) => setQuery({ q: event.target.value })}
        />
        <div className="chips">
          {priorities.map((priority) => (
            <button
              key={priority}
              type="button"
              className={query.priority === priority ? "chip is-on" : "chip"}
              onClick={() => setQuery({ priority })}
            >
              {priority === "all" ? "любой приоритет" : priorityLabel[priority]}
            </button>
          ))}
        </div>
        {ticketsQuery.isLoading && <p className="muted pad">Собираю очередь…</p>}
        {ticketsQuery.isError && <p className="error pad">Не удалось загрузить обращения.</p>}
        {!ticketsQuery.isLoading && visible.length === 0 && (
          <p className="muted pad">По этому фильтру пусто. Сбросьте поиск или статус.</p>
        )}
        <ul className="rows">
          {visible.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                className={ticket.id === selected?.id ? "row is-on" : "row"}
                onClick={() => setSelectedId(ticket.id)}
              >
                <i className={`prio prio-${ticket.priority}`} />
                <span>
                  <strong>{ticket.subject}</strong>
                  <em>
                    {ticket.requester} · {ticket.company}
                  </em>
                </span>
                <span className="row-meta">
                  <b className={`st st-${ticket.status}`}>{statusLabel[ticket.status]}</b>
                  <small>{formatWhen(ticket.updatedAt)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="detail">
        {selected ? (
          <>
            <header className="detail-head">
              <p className="eyebrow">
                {selected.id} · {selected.channel}
              </p>
              <h2>{selected.subject}</h2>
              <p className="who">
                {selected.requester}, {selected.company}
              </p>
              <div className="status-row">
                {(["new", "open", "waiting", "solved"] as Status[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={selected.status === status ? "status is-on" : "status"}
                    onClick={() => statusMutation.mutate({ id: selected.id, status })}
                  >
                    {statusLabel[status]}
                  </button>
                ))}
              </div>
            </header>
            <p className="body">{selected.body}</p>
            <ol className="thread">
              {selected.messages.map((message) => (
                <li key={message.id} className={message.own ? "bubble own" : "bubble"}>
                  <strong>{message.author}</strong>
                  <p>{message.text}</p>
                  <small>{formatWhen(message.at)}</small>
                </li>
              ))}
            </ol>
            <form
              className="reply"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                replyMutation.mutate({ id: selected.id, text: draft });
              }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ответ клиенту"
                rows={3}
              />
              <div className="reply-bar">
                <p className="muted">j/k — по списку, 1–4 — статус</p>
                <button type="submit" disabled={replyMutation.isPending || draft.trim().length < 2}>
                  {replyMutation.isPending ? "Отправляю…" : "Ответить"}
                </button>
              </div>
              {replyMutation.isError && <p className="error">Ответ не ушёл. Попробуйте ещё раз.</p>}
            </form>
          </>
        ) : (
          <p className="muted pad">Выберите обращение слева.</p>
        )}
      </section>
    </div>
  );
}
