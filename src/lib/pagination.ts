// Parse ?page&limit into Prisma skip/take, clamped to sane bounds.
export function getPagination(query: { page?: unknown; limit?: unknown }, defaultLimit = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
