import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  clientListQuerySchema,
  type ClientListQuery,
} from "@/server/validations/pagination";

const clientListInclude = {
  _count: {
    select: {
      appointments: { where: { status: "CHECKED_IN" as const } },
    },
  },
  recurringBookings: {
    where: { status: { in: ["ACTIVE", "PENDING_APPROVAL", "PAUSED"] } },
    select: {
      id: true,
      status: true,
      durationMonths: true,
      startDate: true,
      endDate: true,
      service: { select: { name: true } },
    },
  },
} satisfies Prisma.ClientInclude;

export class InvalidClientListQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidClientListQueryError";
  }
}

export type ClientListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  rut: string | null;
  privateNotes: string | null;
  totalSpent: number;
  noShowCount: number;
  totalAppointments: number;
  completedAppointments: number;
  createdAt: string;
  recurringBookings: {
    id: string;
    status: string;
    serviceName: string;
    durationMonths: number;
    startDate: string;
    endDate: string;
  }[];
};

export type ClientListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ClientListResult = {
  data: ClientListItem[];
  pagination: ClientListPagination;
};

export type ClientListStats = {
  totalClients: number;
  totalRevenue: number;
  flaggedClients: number;
};

export function buildClientListWhere(
  businessId: string,
  search = "",
): Prisma.ClientWhereInput {
  const term = search.trim();
  const where: Prisma.ClientWhereInput = { businessId };

  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

function mapClientListItem(
  client: Prisma.ClientGetPayload<{ include: typeof clientListInclude }>,
  totalAppointments: number,
): ClientListItem {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    rut: client.rut,
    privateNotes: client.privateNotes,
    totalSpent: client.totalSpent,
    noShowCount: client.noShowCount,
    totalAppointments,
    completedAppointments: client._count.appointments,
    createdAt: client.createdAt.toISOString(),
    recurringBookings: client.recurringBookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      serviceName: booking.service.name,
      durationMonths: booking.durationMonths,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
    })),
  };
}

export function buildClientListPagination(
  page: number,
  limit: number,
  total: number,
): ClientListPagination {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function resolveClientListQuery(query: Partial<ClientListQuery> = {}): ClientListQuery {
  const parsed = clientListQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new InvalidClientListQueryError(
      parsed.error.issues[0]?.message ?? "Parámetros inválidos",
    );
  }
  return parsed.data;
}

async function countAppointmentsByClient(clientIds: string[]) {
  if (clientIds.length === 0) return new Map<string, number>();

  const totals = await prisma.appointment.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clientIds } },
    _count: { _all: true },
  });

  return new Map(
    totals.flatMap((row) => (row.clientId ? [[row.clientId, row._count._all] as const] : [])),
  );
}

export async function listClients(
  businessId: string,
  query: Partial<ClientListQuery> = {},
): Promise<ClientListResult> {
  const { page, limit, search } = resolveClientListQuery(query);
  const where = buildClientListWhere(businessId, search);
  const skip = (page - 1) * limit;
  const total = await prisma.client.count({ where });
  const pagination = buildClientListPagination(page, limit, total);

  if (skip >= total) {
    return { data: [], pagination };
  }

  const clients = await prisma.client.findMany({
    where,
    include: clientListInclude,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });
  const totalAppointmentsByClient = await countAppointmentsByClient(clients.map((client) => client.id));

  return {
    data: clients.map((client) =>
      mapClientListItem(client, totalAppointmentsByClient.get(client.id) ?? 0),
    ),
    pagination,
  };
}

export async function getClientListStats(businessId: string): Promise<ClientListStats> {
  const [aggregate, flaggedClients] = await Promise.all([
    prisma.client.aggregate({
      where: { businessId },
      _count: { _all: true },
      _sum: { totalSpent: true },
    }),
    prisma.client.count({
      where: { businessId, noShowCount: { gte: 2 } },
    }),
  ]);

  return {
    totalClients: aggregate._count._all,
    totalRevenue: aggregate._sum.totalSpent ?? 0,
    flaggedClients,
  };
}
