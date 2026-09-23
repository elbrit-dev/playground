import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@/app/graphql-playground/constants', () => ({
  getEndpointConfigFromUrlKeyAsync: async () => ({ endpointUrl: 'https://erp.example.com/api/method/graphql' }),
}));

const { fetchVisitDataset, clearVisitCache } = await import('../liveSource');

/* The window is the pagination key: this ERP cannot page by cursor, so a
   range that comes back short is halved and retried. These drive the real
   fetchVisitDataset through a stubbed transport and count the requests. */

function stubErp({ eventsPerDay = 1, pageSize = 20000 } = {}) {
  const windows = [];
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    const { query, variables } = JSON.parse(init.body);
    const from = variables?.f?.find((x) => x.operator === 'GTE')?.value ?? '';
    const to = variables?.f?.find((x) => x.operator === 'LTE')?.value ?? '';

    if (query.includes('Employees(')) {
      return { status: 200, json: async () => ({ data: { Employees: { totalCount: 0, edges: [] } } }) };
    }
    if (query.includes('RoleProfiles(')) {
      return { status: 200, json: async () => ({ data: { RoleProfiles: { totalCount: 0, edges: [] } } }) };
    }
    if (query.includes('LeaveApplications(')) {
      return { status: 200, json: async () => ({ data: { LeaveApplications: { totalCount: 0, edges: [] } } }) };
    }
    if (query.includes('Quotations(')) {
      return { status: 200, json: async () => ({ data: { Quotations: { totalCount: 0, edges: [] } } }) };
    }
    if (query.includes('Events(')) {
      windows.push(`${from.slice(0, 10)}..${to.slice(0, 10)}`);
      const days = Math.round((new Date(to.slice(0, 10)) - new Date(from.slice(0, 10))) / 86400000) + 1;
      const total = Math.max(0, days) * eventsPerDay;
      const edges = Array.from({ length: Math.min(total, pageSize) }, (_, i) => ({
        node: {
          name: `EV${from.slice(0, 10)}-${i}`, subject: '', starts_on: `${from.slice(0, 10)} 00:00:00`,
          custom_employee_id: { name: 'E1' }, custom_doctor: null, custom_hq: null,
          custom_department: null, custom_pob_given: 0, event_participants: [],
        },
      }));
      return { status: 200, json: async () => ({ data: { Events: { totalCount: total, edges } } }) };
    }
    return { status: 200, json: async () => ({ data: {} }) };
  }));
  return windows;
}

const run = () => fetchVisitDataset({
  anchorDate: '2026-09-30', month: '2026-09', monthTo: '2026-09', gqlToken: 'token a:b',
});

afterEach(() => vi.unstubAllGlobals());

describe('date-window pagination', () => {
  it('cuts the window into week-sized requests and asks for today on its own', async () => {
    /* The ERP charges for rows scanned and offers no other lever — no cursor
       paging with a filter, no aggregates — so a month that FITS is still cut
       up and run in parallel. Five week shards over September, plus the
       one-day query wave 1 paints from. */
    const windows = stubErp({ eventsPerDay: 1 });
    const out = await run();

    expect(windows).toContain('2026-09-30..2026-09-30');
    const shards = windows.filter((w) => w !== '2026-09-30..2026-09-30');
    expect(shards).toHaveLength(5);
    for (const shard of shards) {
      const [from, to] = shard.split('..');
      expect(Math.round((new Date(to) - new Date(from)) / 86400000)).toBeLessThan(7);
    }
    expect(out.truncated.visits).toBe(false);
  });

  it('covers the whole window exactly once, with no gap and no overlap', async () => {
    // A shard boundary off by a day is a day of visits missing from a total.
    const windows = stubErp({ eventsPerDay: 1 });
    await run();

    const shards = windows
      .filter((w) => w !== '2026-09-30..2026-09-30')
      .map((w) => w.split('..'))
      .sort((a, b) => a[0].localeCompare(b[0]));

    expect(shards[0][0]).toBe('2026-09-01');
    expect(shards.at(-1)[1]).toBe('2026-09-30');
    for (let i = 1; i < shards.length; i += 1) {
      const gap = Math.round((new Date(shards[i][0]) - new Date(shards[i - 1][1])) / 86400000);
      expect(gap).toBe(1);
    }
  });

  it('splits the window and still returns every row when it does not fit', async () => {
    /* 40 events/day over 30 days against a 100-row page: a single request
       cannot hold it, so the range halves until each page fits. */
    const windows = stubErp({ eventsPerDay: 40, pageSize: 100 });
    const out = await run();
    expect(windows.length).toBeGreaterThan(1);
    expect(out.truncated.visits).toBe(false);
    // Nothing lost: 30 days x 40 = 1200 rows, none dropped by the splitting.
    expect(out.rows).toHaveLength(1200);
  });

  it('reports truncation only when a SINGLE DAY overflows', async () => {
    // Nothing left to split, so the screen is told rather than lying.
    stubErp({ eventsPerDay: 500, pageSize: 100 });
    const out = await run();
    expect(out.truncated.visits).toBe(true);
  });

  it('keeps visits and POB truncation separate', async () => {
    const out = await (async () => { stubErp({ eventsPerDay: 1 }); return run(); })();
    expect(out.truncated).toEqual({ visits: false, pob: false });
  });
});

describe('request caching', () => {
  /* Changing the month used to re-issue four requests whose answers could not
     have changed: the 496-row roster, the 441-row role-profile tree, today's
     leave and today's visits. They sit inside a Promise.all, so the whole
     screen waited on them. */
  function countQueries() {
    const seen = [];
    vi.stubGlobal('fetch', vi.fn(async (_u, init) => {
      seen.push((JSON.parse(init.body).query.match(/query (\w+)/) || [, '?'])[1]);
      const empty = { totalCount: 0, edges: [] };
      return { status: 200, json: async () => ({ data: {
        Events: empty, Employees: empty, RoleProfiles: empty, Quotations: empty, LeaveApplications: empty,
      } }) };
    }));
    return seen;
  }
  const load = (month) => fetchVisitDataset({
    anchorDate: '2026-09-23', month, monthTo: month, gqlToken: 'token a:b',
  });

  it('refetches only what the month actually changes', async () => {
    clearVisitCache();
    const seen = countQueries();

    await load('2026-09');
    expect(seen).toContain('ActiveEmployees');
    expect(seen).toContain('RoleProfileTree');

    seen.length = 0;
    await load('2026-08');
    await load('2026-07');

    // The roster and the role tree do not vary by month, so they are asked
    // for once and not again.
    expect(seen).not.toContain('ActiveEmployees');
    expect(seen).not.toContain('RoleProfileTree');
    expect(seen).not.toContain('ApprovedLeaveOn');
  });

  it('keys the cache on the token, so one viewer never sees another roster', async () => {
    clearVisitCache();
    const seen = countQueries();

    await load('2026-09');
    seen.length = 0;
    await fetchVisitDataset({ anchorDate: '2026-09-23', month: '2026-09', monthTo: '2026-09', gqlToken: 'token other:x' });

    // A different token is a different permission scope: serving it the
    // first roster would be a leak, not a stale read.
    expect(seen).toContain('ActiveEmployees');
  });

  it('does not cache a failure', async () => {
    clearVisitCache();
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 500, json: async () => ({ exc_type: 'ServerError' }) })));
    await expect(load('2026-09')).rejects.toThrow();

    const seen = countQueries();
    await load('2026-09');
    // A blip must not keep the screen broken for the whole TTL.
    expect(seen).toContain('ActiveEmployees');
  });
});

/* The screen opens on Today and used to block on a month: 1099 events fetched
   so that ~50 could be shown. The dataset now arrives in three waves, and what
   matters about them is that no wave is allowed to look complete. */
describe('waves', () => {
  it('emits today, then the window, then the money', async () => {
    clearVisitCache();
    stubErp({ eventsPerDay: 1 });
    const waves = [];
    const out = await fetchVisitDataset({
      anchorDate: '2026-09-30', month: '2026-09', monthTo: '2026-09', gqlToken: 'token a:b',
      onWave: (d) => waves.push(d),
    });

    expect(waves.map((w) => w.ready)).toEqual([
      { today: true, window: false, pob: false },
      { today: true, window: true, pob: false },
      { today: true, window: true, pob: true },
    ]);
    // The promise still resolves to the whole thing, for callers that want it.
    expect(out.ready).toEqual({ today: true, window: true, pob: true });
  });

  it('carries only today in the first wave', async () => {
    clearVisitCache();
    stubErp({ eventsPerDay: 1 });
    const waves = [];
    await fetchVisitDataset({
      anchorDate: '2026-09-30', month: '2026-09', monthTo: '2026-09', gqlToken: 'token a:b',
      onWave: (d) => waves.push(d),
    });

    // One day at one event a day; the month behind it is thirty.
    expect(waves[0].rows).toHaveLength(1);
    expect(waves[1].rows).toHaveLength(30);
  });

  it('does not count today twice when it falls inside the window', async () => {
    /* Wave 1 always asks for today on its own — that is what makes the first
       paint cheap — so the window it lands inside must REPLACE it rather than
       add to it, or every one of this morning's visits is counted twice. */
    clearVisitCache();
    stubErp({ eventsPerDay: 1 });
    const out = await fetchVisitDataset({
      anchorDate: '2026-09-30', month: '2026-09', monthTo: '2026-09', gqlToken: 'token a:b',
    });
    expect(out.rows).toHaveLength(30);
  });

  it('keeps today when the window is a past month', async () => {
    /* The DAY view is a right-now fact whichever month is picked: an August
       dataset with no rows for today reports the whole team as not reported
       the moment the reader flips back to Today. */
    clearVisitCache();
    stubErp({ eventsPerDay: 1 });
    const out = await fetchVisitDataset({
      anchorDate: '2026-09-30', month: '2026-08', monthTo: '2026-08', gqlToken: 'token a:b',
    });
    // 31 August days plus the one day of today, which no shard covered.
    expect(out.rows).toHaveLength(32);
    expect(out.rows.some((r) => r.plannedDate === '2026-09-30')).toBe(true);
  });

  it('holds the money back rather than reporting it as zero', async () => {
    clearVisitCache();
    stubErp({ eventsPerDay: 1 });
    const waves = [];
    await fetchVisitDataset({
      anchorDate: '2026-09-30', month: '2026-09', monthTo: '2026-09', gqlToken: 'token a:b',
      onWave: (d) => waves.push(d),
    });
    // Empty AND flagged not-ready: the consumer needs to tell "no orders" from
    // "no orders yet", and an empty array alone cannot say which.
    expect(waves[0].pob).toEqual([]);
    expect(waves[0].ready.pob).toBe(false);
    expect(waves[2].ready.pob).toBe(true);
  });

  it('works with no onWave at all', async () => {
    // The old contract: one promise, everything in it.
    clearVisitCache();
    stubErp({ eventsPerDay: 1 });
    const out = await fetchVisitDataset({
      anchorDate: '2026-09-30', month: '2026-09', monthTo: '2026-09', gqlToken: 'token a:b',
    });
    expect(out.rows).toHaveLength(30);
  });
});
