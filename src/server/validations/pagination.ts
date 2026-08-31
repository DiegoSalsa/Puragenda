import { z } from "zod";

export const CLIENT_LIST_DEFAULT_PAGE = 1;
export const CLIENT_LIST_DEFAULT_LIMIT = 20;
export const CLIENT_LIST_MAX_LIMIT = 100;
export const CLIENT_LIST_MAX_SEARCH_LENGTH = 100;

const integerQuery = (message: string) =>
  z.coerce
    .number({ message })
    .int(message)
    .refine((value) => Number.isFinite(value), message);

export const clientListQuerySchema = z.object({
  page: integerQuery("La página debe ser un número entero")
    .min(1, "La página debe ser mayor o igual a 1")
    .default(CLIENT_LIST_DEFAULT_PAGE),
  limit: integerQuery("El límite debe ser un número entero")
    .min(1, "El límite debe ser mayor o igual a 1")
    .max(CLIENT_LIST_MAX_LIMIT, `El límite no puede superar ${CLIENT_LIST_MAX_LIMIT}`)
    .default(CLIENT_LIST_DEFAULT_LIMIT),
  search: z
    .string()
    .trim()
    .max(
      CLIENT_LIST_MAX_SEARCH_LENGTH,
      `La búsqueda no puede superar ${CLIENT_LIST_MAX_SEARCH_LENGTH} caracteres`,
    )
    .optional()
    .default(""),
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

function firstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseClientListQuery(input: {
  page?: string | string[];
  limit?: string | string[];
  search?: string | string[];
}) {
  return clientListQuerySchema.safeParse({
    page: firstQueryValue(input.page),
    limit: firstQueryValue(input.limit),
    search: firstQueryValue(input.search),
  });
}

export function buildClientListPath(
  page: number,
  search = "",
  limit = CLIENT_LIST_DEFAULT_LIMIT,
) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (limit !== CLIENT_LIST_DEFAULT_LIMIT) params.set("limit", String(limit));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/dashboard/clients?${query}` : "/dashboard/clients";
}
