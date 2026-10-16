import { seedTickets } from "./data";
import type { Message, Status, Ticket } from "./types";

let tickets: Ticket[] = structuredClone(seedTickets);

function wait(ms = 420) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTickets(): Promise<Ticket[]> {
  await wait();
  return structuredClone(tickets);
}

export async function updateStatus(id: string, status: Status): Promise<Ticket> {
  await wait(260);
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket) throw new Error("Обращение не найдено");
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  return structuredClone(ticket);
}

export async function sendReply(id: string, text: string): Promise<Ticket> {
  await wait(280);
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket) throw new Error("Обращение не найдено");
  const trimmed = text.trim();
  if (trimmed.length < 2) throw new Error("Слишком короткий ответ");
  const message: Message = {
    id: `local-${Date.now()}`,
    author: "Вы",
    at: new Date().toISOString(),
    text: trimmed,
    own: true,
  };
  ticket.messages = [...ticket.messages, message];
  ticket.updatedAt = message.at;
  if (ticket.status === "new") ticket.status = "open";
  return structuredClone(ticket);
}
