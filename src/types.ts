export type Status = "new" | "open" | "waiting" | "solved";
export type Priority = "low" | "normal" | "high";

export type Message = {
  id: string;
  author: string;
  at: string;
  text: string;
  own?: boolean;
};

export type Ticket = {
  id: string;
  subject: string;
  requester: string;
  company: string;
  status: Status;
  priority: Priority;
  channel: "почта" | "чат" | "форма";
  updatedAt: string;
  body: string;
  messages: Message[];
};

export type TicketQuery = {
  status: Status | "all";
  priority: Priority | "all";
  q: string;
  sort: "updated" | "priority";
};
