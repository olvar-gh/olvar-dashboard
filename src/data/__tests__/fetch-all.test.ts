import { fetchAll, FetchAllError, PAGE_SIZE, type PageResult } from '../fetch-all';

type Row = { id: number; recorded_at: string };

function rows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1, recorded_at: new Date(Date.UTC(2026, 10, 1) + i * 60_000).toISOString() }));
}

/** A server that silently caps every response at 1,000 rows, like PostgREST's max-rows. */
function server(data: Row[]) {
  const calls: [number, number][] = [];
  const fetchPage = async (from: number, to: number): Promise<PageResult<Row>> => {
    calls.push([from, to]);
    return { data: data.slice(from, Math.min(to + 1, from + 1000)), error: null };
  };
  return { fetchPage, calls };
}

describe('fetchAll', () => {
  it.each([0, 999, 1000, 1440, 2500])('returns all %i rows exactly once, newest last', async (n) => {
    const data = rows(n);
    const { fetchPage, calls } = server(data);
    const result = await fetchAll(fetchPage);
    expect(result).toHaveLength(n);
    expect(new Set(result.map((r) => r.id)).size).toBe(n);
    expect(result).toEqual(data);
    if (n) expect(result[result.length - 1]).toEqual(data[n - 1]);
    expect(calls).toHaveLength(Math.floor(n / PAGE_SIZE) + 1);
  });

  it('asks for one more page after a page of exactly 1,000 rows', async () => {
    const { fetchPage, calls } = server(rows(1000));
    await fetchAll(fetchPage);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('drops a row repeated across a page boundary', async () => {
    const data = rows(1500);
    // A row inserted before the cursor between requests shifts row 1000 into page 2 as well.
    const fetchPage = async (from: number, to: number): Promise<PageResult<Row>> =>
      from === 0 ? { data: data.slice(0, 1000), error: null } : { data: data.slice(999, to), error: null };
    const result = await fetchAll(fetchPage);
    expect(result.map((r) => r.id)).toEqual(data.map((r) => r.id));
  });

  it('surfaces an error on a later page instead of returning a truncated series', async () => {
    const data = rows(2500);
    const fetchPage = async (from: number, to: number): Promise<PageResult<Row>> =>
      from >= 1000 ? { data: null, error: { message: 'canceling statement due to statement timeout', code: '57014' } } : { data: data.slice(from, to + 1), error: null };
    await expect(fetchAll(fetchPage)).rejects.toMatchObject({
      name: 'FetchAllError',
      code: '57014',
      rowsSoFar: 1000,
    });
    await expect(fetchAll(fetchPage)).rejects.toBeInstanceOf(FetchAllError);
  });

  it('rejects when the request itself throws', async () => {
    await expect(fetchAll(() => Promise.reject(new Error('network down')))).rejects.toThrow('network down');
  });
});
