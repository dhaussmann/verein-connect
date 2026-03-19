export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function parsePagination(query: Record<string, string | undefined>): {
  page: number;
  perPage: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page || '25', 10)));
  return { page, perPage, offset: (page - 1) * perPage };
}

export function buildMeta(total: number, page: number, perPage: number): PaginationMeta {
  return {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  };
}
