import type {
  ExpenseRequestRecord,
  StatusHistoryRecord,
  UserRecord,
} from "./models.js";

export const seedUsers: UserRecord[] = [
  {
    id: "u_alice",
    name: "Alice",
    role: "employee",
    managerId: "u_carol",
  },
  {
    id: "u_bob",
    name: "Bob",
    role: "employee",
    managerId: "u_mallory",
  },
  {
    id: "u_carol",
    name: "Carol",
    role: "manager",
    managerId: "u_peggy",
  },
  {
    id: "u_mallory",
    name: "Mallory",
    role: "manager",
    managerId: "u_peggy",
  },
  {
    id: "u_peggy",
    name: "Peggy",
    role: "manager",
    managerId: null,
  },
  {
    id: "u_trent",
    name: "Trent",
    role: "finance",
    managerId: "u_peggy",
  },
];

export const seedExpenseRequests: ExpenseRequestRecord[] = [
  {
    id: "REQ-001",
    requesterId: "u_alice",
    values: {
      expenseType: "Travel",
      amountCents: 45000,
      description: "Customer onsite in Chicago",
      billable: false,
      client: null,
      additionalJustification: null,
      otherReason: null,
    },
  },
  {
    id: "REQ-002",
    requesterId: "u_alice",
    values: {
      expenseType: "Meal",
      amountCents: 4200,
      description: "Lunch with prospect",
      billable: false,
      client: null,
      additionalJustification: null,
      otherReason: null,
    },
  },
  {
    id: "REQ-003",
    requesterId: "u_bob",
    values: {
      expenseType: "Software",
      amountCents: 125000,
      description: "Annual design-tool renewal",
      billable: false,
      client: null,
      additionalJustification:
        "Replaces three monthly subscriptions; cheaper annually",
      otherReason: null,
    },
  },
  {
    id: "REQ-004",
    requesterId: "u_mallory",
    values: {
      expenseType: "Travel",
      amountCents: 60000,
      description: "Team offsite venue deposit",
      billable: true,
      client: "Acme",
      additionalJustification: null,
      otherReason: null,
    },
  },
];

export const seedStatusHistory: StatusHistoryRecord[] = [
  {
    requestId: "REQ-001",
    sequence: 1,
    action: "CREATE",
    newStatus: "DRAFT",
    actorId: "u_alice",
    occurredAt: "2026-05-01T09:00:00.000Z",
    assignedApproverId: null,
  },
  {
    requestId: "REQ-002",
    sequence: 1,
    action: "CREATE",
    newStatus: "DRAFT",
    actorId: "u_alice",
    occurredAt: "2026-05-02T09:00:00.000Z",
    assignedApproverId: null,
  },
  {
    requestId: "REQ-002",
    sequence: 2,
    action: "SUBMIT",
    newStatus: "SUBMITTED",
    actorId: "u_alice",
    occurredAt: "2026-05-02T09:05:00.000Z",
    assignedApproverId: "u_carol",
  },
  {
    requestId: "REQ-003",
    sequence: 1,
    action: "CREATE",
    newStatus: "DRAFT",
    actorId: "u_bob",
    occurredAt: "2026-05-03T10:00:00.000Z",
    assignedApproverId: null,
  },
  {
    requestId: "REQ-003",
    sequence: 2,
    action: "SUBMIT",
    newStatus: "SUBMITTED",
    actorId: "u_bob",
    occurredAt: "2026-05-03T10:10:00.000Z",
    assignedApproverId: "u_trent",
  },
  {
    requestId: "REQ-003",
    sequence: 3,
    action: "APPROVE",
    newStatus: "APPROVED",
    actorId: "u_trent",
    occurredAt: "2026-05-03T11:00:00.000Z",
    assignedApproverId: null,
  },
  {
    requestId: "REQ-004",
    sequence: 1,
    action: "CREATE",
    newStatus: "DRAFT",
    actorId: "u_mallory",
    occurredAt: "2026-05-04T13:00:00.000Z",
    assignedApproverId: null,
  },
];
