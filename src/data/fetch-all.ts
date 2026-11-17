/** Supabase returns at most this many rows per request, silently truncating the rest. */
export const PAGE_SIZE = 1000;

export type PageResult<T> = { data: T[] | null; error: { message: string; code?: string } | null };

/** Fetches rows `from..to` (inclusive, as `range()` takes them) of one fixed, fully ordered query. */
export type PageFetcher<T> = (from: number, to: number) => PromiseLike<PageResult<T>>;

export class FetchAllError extends Error {
  constructor(
    message: string,
    readonly rowsSoFar: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'FetchAllError';
  }
}

/**
 * Reads every row of a query past the API row limit. The caller orders the query by
 * `recorded_at, id` and bounds it by a fixed upper time captured once, so pages stay stable.
 * A page of exactly `pageSize` rows triggers one more request. Rows that shift across a page
 * boundary (a backfill landing mid-way) arrive twice and are dropped by `id`. Any page error
 * rejects the whole read rather than returning a truncated series.
 */
export async function fetchAll<T extends { id: number }>(
  fetchPage: PageFetcher<T>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const seen = new Set<number>();
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new FetchAllError(error.message, rows.length, error.code);
    const page = data ?? [];
    for (const row of page) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    if (page.length < pageSize) return rows;
  }
}
