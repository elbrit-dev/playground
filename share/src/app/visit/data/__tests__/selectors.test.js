import { describe, expect, it } from 'vitest';
import {
  activeReps,
  asOfFrom,
  attainment,
  attendance,
  attendanceOf,
  byHq,
  callAverage,
  CHART_HOURS,
  doctorPlan,
  geoSplit,
  happened,
  inPeriod,
  monthEnd,
  periodWindow,
  pobGiven,
  pobTotal,
  repsInAttendanceState,
  rollupFor,
  subtreeOf,
  visitsByHour,
  visitsIn,
} from '../selectors';
import {
  countWorkingDays,
  formatClock,
  formatCurrency,
  formatDayHeading,
  formatHour,
  formatMonthName,
  formatPercent,
  hqLabel,
  periodSuffix,
} from '../format';
import { buildMockDataset } from '../mockData';

/* These are the functions every number on the screen comes from, and they are
   pure — so they get tested directly rather than through a render. The cases
   below are the ones that were wrong at some point, not a checklist. */

function row(over = {}) {
  return {
    eventId: 'EV1',
    plannedDate: '2026-09-05',
    employeeId: 'E1',
    hq: 'HQ-Hubballi',
    pobGiven: false,
    visitTime: null,
    distanceKm: null,
    forceVisit: false,
    ...over,
  };
}

describe('attainment', () => {
  it('is null for an empty plan, not zero', () => {
    // 0% reads as failure; a vacant seat has no plan to fail at.
    expect(attainment([])).toBeNull();
  });

  it('is the completed fraction', () => {
    const rows = [row({ visitTime: '2026-09-05 10:00:00' }), row(), row(), row()];
    expect(attainment(rows)).toBe(0.25);
  });
});

describe('happened / pobGiven', () => {
  it('counts only rows with a visit time', () => {
    const rows = [row({ visitTime: '2026-09-05 10:00:00' }), row()];
    expect(happened(rows)).toBe(1);
  });

  it('measures POB against completed visits, not against the plan', () => {
    const rows = [
      row({ visitTime: '2026-09-05 10:00:00', pobGiven: true }),
      row({ visitTime: '2026-09-05 11:00:00', pobGiven: false }),
      row({ pobGiven: true }), // planned, never happened — must not count either way
    ];
    expect(pobGiven(rows)).toEqual({ given: 1, of: 2 });
  });
});

describe('pobTotal', () => {
  it('sums the real ₹ amount, not a count', () => {
    const pobRows = [{ employeeId: 'E1', amount: 1000 }, { employeeId: 'E1', amount: 500.5 }];
    expect(pobTotal(pobRows)).toBe(1500.5);
  });

  it('is 0 for no entries, not null -- there is nothing to divide by yet, but the total itself is a real zero', () => {
    expect(pobTotal([])).toBe(0);
  });

  it('treats a missing amount as 0 rather than poisoning the sum with NaN', () => {
    expect(pobTotal([{ employeeId: 'E1', amount: undefined }, { employeeId: 'E1', amount: 200 }])).toBe(200);
  });
});

describe('callAverage', () => {
  it('divides by working days so a month is comparable to the daily standard', () => {
    const rows = Array.from({ length: 100 }, () => row({ visitTime: '2026-09-05 10:00:00' }));
    expect(callAverage(rows, 10, 1)).toBe(10);
    expect(callAverage(rows, 10, 5)).toBe(2);
  });

  it('is null with no working reps rather than dividing by zero', () => {
    expect(callAverage([row()], 0, 1)).toBeNull();
  });
});

describe('visitsByHour', () => {
  it('always returns the full fixed axis, in order', () => {
    const out = visitsByHour([]);
    expect(out.map((b) => b.hour)).toEqual(CHART_HOURS);
  });

  it('splits verified from force', () => {
    const out = visitsByHour([
      row({ visitTime: '2026-09-05 11:30:00' }),
      row({ visitTime: '2026-09-05 11:45:00', forceVisit: true }),
    ]);
    const eleven = out.find((b) => b.hour === 11);
    expect(eleven).toEqual({ hour: 11, verified: 1, force: 1 });
  });

  it('folds out-of-range times into the edge buckets instead of dropping them', () => {
    // A 7am check-in is real and must not silently vanish from the totals.
    const out = visitsByHour([
      row({ visitTime: '2026-09-05 07:15:00' }),
      row({ visitTime: '2026-09-05 21:00:00' }),
    ]);
    expect(out[0].verified).toBe(1);
    expect(out[out.length - 1].verified).toBe(1);
  });

  it('ignores rows that never happened', () => {
    const out = visitsByHour([row()]);
    expect(out.every((b) => b.verified === 0 && b.force === 0)).toBe(true);
  });
});

describe('visitsIn', () => {
  it('returns the rows behind one bar, in clock order', () => {
    const rows = [
      row({ eventId: 'B', visitTime: '2026-09-05 14:40:00', doctorName: 'Dr Late' }),
      row({ eventId: 'A', visitTime: '2026-09-05 14:05:00', doctorName: 'Dr Early' }),
      row({ eventId: 'C', visitTime: '2026-09-05 15:05:00', doctorName: 'Dr Other' }),
    ];
    expect(visitsIn(rows, { hour: 14 }).map((v) => v.doctorName)).toEqual(['Dr Early', 'Dr Late']);
  });

  it('agrees with the bar it was opened from, including the folded edges', () => {
    // The bar counts a 7am call in the 9am bucket; the sheet behind it has
    // to do the same or the list contradicts the number that opened it.
    const rows = [
      row({ eventId: 'A', visitTime: '2026-09-05 07:15:00' }),
      row({ eventId: 'B', visitTime: '2026-09-05 09:30:00' }),
      row({ eventId: 'C', visitTime: '2026-09-05 21:00:00' }),
    ];
    const bars = visitsByHour(rows);
    for (const bar of bars) {
      const behind = visitsIn(rows, { hour: bar.hour });
      expect(behind).toHaveLength(bar.verified + bar.force);
    }
  });

  it('filters to a series when given a tone', () => {
    const rows = [
      row({ eventId: 'A', visitTime: '2026-09-05 10:00:00' }),
      row({ eventId: 'B', visitTime: '2026-09-05 11:00:00', forceVisit: true }),
    ];
    expect(visitsIn(rows, { tone: 'force' }).map((v) => v.eventId ?? v.id)).toHaveLength(1);
    expect(visitsIn(rows, { tone: 'force' })[0].forceVisit).toBe(true);
    expect(visitsIn(rows, { tone: 'verified' })[0].forceVisit).toBe(false);
  });

  it('intersects hour and tone rather than picking one', () => {
    const rows = [
      row({ eventId: 'A', visitTime: '2026-09-05 10:00:00', forceVisit: true }),
      row({ eventId: 'B', visitTime: '2026-09-05 11:00:00', forceVisit: true }),
    ];
    expect(visitsIn(rows, { hour: 11, tone: 'force' })).toHaveLength(1);
  });

  it('never returns a pending call — a plan has no hour to be plotted at', () => {
    expect(visitsIn([row(), row({ visitTime: null })], {})).toEqual([]);
  });

  it('keys rows uniquely when one Event carries two participants', () => {
    const shared = [
      row({ eventId: 'SAME', employeeId: 'A', visitTime: '2026-09-05 10:00:00' }),
      row({ eventId: 'SAME', employeeId: 'B', visitTime: '2026-09-05 10:30:00' }),
    ];
    const out = visitsIn(shared, { hour: 10 });
    expect(new Set(out.map((v) => v.id)).size).toBe(2);
  });

  it('drops a reason left on a row whose force flag is off', () => {
    const rows = [
      row({ visitTime: '2026-09-05 10:00:00', forceVisit: false, forceVisitReason: 'Clinic closed' }),
    ];
    expect(visitsIn(rows, {})[0].forceVisitReason).toBe('');
  });
});

describe('geoSplit', () => {
  it('counts completed visits only', () => {
    expect(
      geoSplit([
        row({ visitTime: '2026-09-05 10:00:00' }),
        row({ visitTime: '2026-09-05 10:00:00', forceVisit: true }),
        row({ forceVisit: true }), // planned but not done
      ]),
    ).toEqual({ verified: 1, force: 1 });
  });
});

describe('attendance', () => {
  const team = [
    { id: 'A', short: 'BE', vacant: false, onLeave: false, hq: 'HQ-Hubballi' },
    { id: 'B', short: 'BE', vacant: false, onLeave: false, hq: 'HQ-Hubballi' },
    { id: 'C', short: 'BE', vacant: false, onLeave: true, hq: 'HQ-Hubballi' },
    { id: 'D', short: 'BE', vacant: true, onLeave: false, hq: 'HQ-Hubballi' },
    { id: 'M', short: 'ABM', vacant: false, onLeave: false, hq: 'HQ-Hubballi' },
  ];

  it('resolves one state per rep in priority order', () => {
    const worked = new Set(['A']);
    expect(attendanceOf(team[0], worked)).toBe('working');
    expect(attendanceOf(team[1], worked)).toBe('notReporting');
    expect(attendanceOf(team[2], worked)).toBe('onLeave');
    expect(attendanceOf(team[3], worked)).toBe('vacant');
  });

  it('counts reps only, never managers', () => {
    const { counts } = attendance([row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' })], team);
    expect(counts.working + counts.notReporting + counts.onLeave + counts.vacant).toBe(4);
  });

  it('excludes vacancies from the in-field denominator', () => {
    // "17 of 19 in field" must not count seats nobody sits in as absentees.
    const { working, inScope } = attendance(
      [row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' })],
      team,
    );
    expect(working).toBe(1);
    expect(inScope).toBe(3);
  });

  it('does not count a planned-but-unvisited row as working', () => {
    const { counts } = attendance([row({ employeeId: 'A' })], team);
    expect(counts.working).toBe(0);
  });
});

describe('activeReps', () => {
  const team = [
    { id: 'A', short: 'BE' },
    { id: 'B', short: 'BE' },
    { id: 'M', short: 'ABM' },
  ];

  it('counts distinct reps who logged at least one visit', () => {
    expect(
      activeReps([
        row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' }),
        row({ employeeId: 'A', visitTime: '2026-09-05 11:00:00' }),
        row({ employeeId: 'B' }),
      ], team),
    ).toBe(1);
  });

  it('excludes a manager even if an Event is mistakenly tagged to one', () => {
    expect(
      activeReps([
        row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' }),
        row({ employeeId: 'M', visitTime: '2026-09-05 10:00:00' }),
      ], team),
    ).toBe(1);
  });
});

describe('subtreeOf', () => {
  const team = [
    { id: 'SM', reportsTo: null, short: 'SM' },
    { id: 'RBM', reportsTo: 'SM', short: 'RBM' },
    { id: 'ABM', reportsTo: 'RBM', short: 'ABM' },
    { id: 'BE', reportsTo: 'ABM', short: 'BE' },
    { id: 'OTHER', reportsTo: null, short: 'SM' },
  ];

  it('includes the root and everything under it', () => {
    expect(subtreeOf(team, 'RBM').map((m) => m.id).sort()).toEqual(['ABM', 'BE', 'RBM']);
  });

  it('returns empty for an unknown root rather than throwing', () => {
    expect(subtreeOf(team, 'nobody')).toEqual([]);
  });

  it('terminates on a reports_to cycle', () => {
    // ERPNext does not prevent one, and a recursive walk would blow the stack.
    const cyclic = [
      { id: 'X', reportsTo: 'Y' },
      { id: 'Y', reportsTo: 'X' },
    ];
    expect(subtreeOf(cyclic, 'X').map((m) => m.id).sort()).toEqual(['X', 'Y']);
  });
});

describe('byHq', () => {
  const team = [
    { id: 'A', short: 'BE', hq: 'HQ-Hubballi', vacant: false },
    { id: 'B', short: 'BE', hq: 'HQ-Hubballi', vacant: false },
    { id: 'V', short: 'BE', hq: 'HQ-Hubballi', vacant: true },
    { id: 'M', short: 'ABM', hq: 'HQ-Hubballi', vacant: false },
  ];

  it('counts non-vacant reps, and active ones by their visits', () => {
    const [hub] = byHq([row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' }), row({ employeeId: 'B' })], team);
    expect(hub.totalReps).toBe(2);
    expect(hub.activeReps).toBe(1);
    expect(hub.planned).toBe(2);
    expect(hub.happened).toBe(1);
  });

  it('splits completed visits into verified and force', () => {
    const [hub] = byHq(
      [
        row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' }),
        row({ employeeId: 'A', visitTime: '2026-09-05 11:00:00', forceVisit: true }),
        // A force flag on a row that never happened must not subtract from
        // verified, which deriving it as `happened - force` would do.
        row({ employeeId: 'B', forceVisit: true }),
      ],
      team,
    );
    expect(hub.happened).toBe(2);
    expect(hub.verified).toBe(1);
    expect(hub.force).toBe(1);
    expect(hub.verified + hub.force).toBe(hub.happened);
  });

  it('sorts by completed visits, descending', () => {
    const t = [...team, { id: 'C', short: 'BE', hq: 'HQ-Erode', vacant: false }];
    const rows = [
      row({ employeeId: 'C', hq: 'HQ-Erode', visitTime: '2026-09-05 10:00:00' }),
      row({ employeeId: 'C', hq: 'HQ-Erode', visitTime: '2026-09-05 11:00:00' }),
      row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' }),
    ];
    expect(byHq(rows, t).map((h) => h.hq)).toEqual(['HQ-Erode', 'HQ-Hubballi']);
  });
});

describe('periodWindow', () => {
  it('today is a single day', () => {
    expect(periodWindow('today', '2026-09-05')).toEqual({ from: '2026-09-05', to: '2026-09-05' });
  });

  it('the month still running stops at today, not at the 30th', () => {
    // Month-till-date is not a mode; it is this clamp. Without it,
    // callAverage divides five days of visits by a full month of days.
    expect(periodWindow('month', '2026-09-05')).toEqual({ from: '2026-09-01', to: '2026-09-05' });
  });

  it('defaults to the month today falls in', () => {
    expect(periodWindow('month', '2026-09-05')).toEqual(
      periodWindow('month', '2026-09-05', '2026-09'),
    );
  });

  it('treats one month as a one-month range', () => {
    expect(periodWindow('month', '2026-09-05', '2026-08')).toEqual(
      periodWindow('month', '2026-09-05', '2026-08', '2026-08'),
    );
  });

  it('spans a range, and still stops at today when it ends this month', () => {
    expect(periodWindow('month', '2026-09-05', '2026-07', '2026-09')).toEqual({
      from: '2026-07-01',
      to: '2026-09-05',
    });
  });

  it('runs a range that is entirely over to its last month end', () => {
    expect(periodWindow('month', '2026-09-05', '2026-06', '2026-07')).toEqual({
      from: '2026-06-01',
      to: '2026-07-31',
    });
  });

  it('runs a past month to its own last day', () => {
    expect(periodWindow('month', '2026-09-05', '2026-08')).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('spans a range, and still stops at today when it ends this month', () => {
    expect(periodWindow('month', '2026-09-05', '2026-07', '2026-09')).toEqual({
      from: '2026-07-01',
      to: '2026-09-05',
    });
  });

  it('runs a range that is entirely over to its last month end', () => {
    expect(periodWindow('month', '2026-09-05', '2026-06', '2026-07')).toEqual({
      from: '2026-06-01',
      to: '2026-07-31',
    });
  });

  it('gets February right, leap year and not', () => {
    expect(periodWindow('month', '2026-09-05', '2024-02').to).toBe('2024-02-29');
    expect(periodWindow('month', '2026-09-05', '2026-02').to).toBe('2026-02-28');
  });

  it('filters inclusively at both ends', () => {
    const rows = [
      row({ plannedDate: '2026-08-31' }),
      row({ plannedDate: '2026-09-01' }),
      row({ plannedDate: '2026-09-05' }),
      row({ plannedDate: '2026-09-06' }),
    ];
    expect(inPeriod(rows, periodWindow('month', '2026-09-05'))).toHaveLength(2);
  });
});

describe('asOfFrom', () => {
  it('is the latest visit we actually have, not the wall clock', () => {
    expect(
      asOfFrom([
        row({ visitTime: '2026-09-05 09:10:00' }),
        row({ visitTime: '2026-09-05 15:59:00' }),
        row(),
      ]),
    ).toBe('2026-09-05 15:59:00');
  });

  it('is null when nothing has happened yet', () => {
    expect(asOfFrom([row(), row()])).toBeNull();
  });
});

describe('rollupFor', () => {
  const team = [
    { id: 'ABM', reportsTo: null, short: 'ABM', vacant: false, onLeave: false },
    { id: 'A', reportsTo: 'ABM', short: 'BE', vacant: false, onLeave: false },
    { id: 'V', reportsTo: 'ABM', short: 'BE', vacant: true, onLeave: false },
  ];

  it('aggregates the whole subtree and excludes vacancies from the rep count', () => {
    const roll = rollupFor(team[0], team, [
      row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' }),
      row({ employeeId: 'A' }),
    ]);
    expect(roll).toMatchObject({ planned: 2, happened: 1, workingReps: 1, totalReps: 1, isLeaf: false });
    expect(roll.attainment).toBe(0.5);
  });

  it('sums the subtree POB and ignores money earned outside it', () => {
    const roll = rollupFor(team[1], team, [row({ employeeId: 'A' })], [
      { employeeId: 'A', doctorId: 'DR-1', amount: 1000, plannedDate: '2026-09-05' },
      { employeeId: 'A', doctorId: 'DR-2', amount: 500, plannedDate: '2026-09-05' },
      { employeeId: 'OUTSIDE', doctorId: 'DR-3', amount: 9999, plannedDate: '2026-09-05' },
    ]);
    expect(roll.pobAmount).toBe(1500);
  });

  it('is 0, not NaN, when the dataset carries no POB at all', () => {
    // The mock fixture has none, and a token that cannot read Quotation
    // returns none -- the tree row still has to render a subtitle.
    expect(rollupFor(team[0], team, [row({ employeeId: 'A' })]).pobAmount).toBe(0);
  });
});

describe('format', () => {
  it('does not shift the date by a timezone', () => {
    // `new Date('2026-09-05')` is UTC midnight, which is the 4th in IST.
    expect(formatDayHeading('2026-09-05')).toBe('Sat, 5 Sep 2026');
  });

  it('reads the clock off the string', () => {
    expect(formatClock('2026-09-05 15:59:00')).toBe('3:59 PM');
    expect(formatClock('2026-09-05 12:05:00')).toBe('12:05 PM');
    expect(formatClock('2026-09-05 00:30:00')).toBe('12:30 AM');
    expect(formatClock(null)).toBeNull();
  });

  it('abbreviates chart hours', () => {
    expect([9, 12, 17].map(formatHour)).toEqual(['9a', '12p', '5p']);
  });

  it('renders a missing ratio as an em dash, never 0%', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(0.714)).toBe('71%');
  });

  it('strips the HQ- naming prefix', () => {
    expect(hqLabel('HQ-Hubballi')).toBe('Hubballi');
  });

  it('counts a six-day working week', () => {
    // Mon 2026-08-31 .. Sat 2026-09-05 is six days, Sunday excluded.
    expect(countWorkingDays('2026-08-31', '2026-09-06')).toBe(6);
  });

  it('formats rupees in Indian lakh/crore grouping, matching the reference design', () => {
    expect(formatCurrency(1800)).toBe('₹1,800');
    expect(formatCurrency(180000)).toBe('₹1.8 L');
    expect(formatCurrency(12000000)).toBe('₹1.20 Cr');
  });

  it('renders a missing amount as an em dash, never ₹0', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(0)).toBe('₹0');
  });
});

describe('mock dataset', () => {
  const opts = { anchorDate: new Date(2026, 8, 5), cutoffHour: 16 };

  it('is deterministic', () => {
    // Without this a screenshot baseline is impossible.
    const a = buildMockDataset(opts);
    const b = buildMockDataset(opts);
    expect(a.rows).toEqual(b.rows);
  });

  it('honours the as-of cutoff on the anchor day', () => {
    const { rows, today } = buildMockDataset(opts);
    const late = rows.filter(
      (r) => r.plannedDate === today && r.visitTime && Number(r.visitTime.slice(11, 13)) >= 16,
    );
    expect(late).toHaveLength(0);
  });

  it('leaves past days complete', () => {
    const { rows, today } = buildMockDataset(opts);
    const past = rows.filter((r) => r.plannedDate < today && r.visitTime);
    expect(past.length).toBeGreaterThan(0);
  });

  it('gives vacant seats no plan at all', () => {
    const { rows, team } = buildMockDataset(opts);
    const vacantIds = new Set(team.filter((m) => m.vacant).map((m) => m.id));
    expect(vacantIds.size).toBeGreaterThan(0);
    expect(rows.some((r) => vacantIds.has(r.employeeId))).toBe(false);
  });

  it('keeps force visits and distance consistent', () => {
    // A force visit is force BECAUSE the rep was far from the planned point.
    const { rows } = buildMockDataset(opts);
    const done = rows.filter((r) => r.visitTime);
    expect(done.every((r) => (r.forceVisit ? r.distanceKm > 1 : r.distanceKm <= 1))).toBe(true);
  });

  it('never marks POB on a visit that did not happen', () => {
    const { rows } = buildMockDataset(opts);
    expect(rows.every((r) => !r.pobGiven || r.visitTime)).toBe(true);
  });
});

describe('repsInAttendanceState', () => {
  const team = [
    { id: 'M', name: 'Manager', short: 'ABM', reportsTo: null, hq: 'HQ-Hubballi' },
    { id: 'A', name: 'Anil', short: 'BE', reportsTo: 'M', hq: 'HQ-Hubballi' },
    { id: 'B', name: 'Bala', short: 'BE', reportsTo: 'M', hq: 'HQ-Hubballi' },
    { id: 'C', name: 'Chandra', short: 'BE', reportsTo: 'M', hq: 'HQ-Hubballi', onLeave: true },
    { id: 'D', name: 'Vacant seat', short: 'BE', reportsTo: 'M', hq: 'HQ-Hubballi', vacant: true },
  ];

  const rows = [
    row({ employeeId: 'A', visitTime: '2026-09-05 10:00:00' }),
    row({ employeeId: 'A', visitTime: '2026-09-05 11:00:00' }),
    row({ employeeId: 'A' }),
    row({ employeeId: 'B', visitTime: '2026-09-05 10:00:00' }),
    row({ employeeId: 'B' }),
    row({ employeeId: 'C' }),
  ];

  it('agrees with the count on the chip it opens from', () => {
    // The whole point of sharing attendanceOf: a chip reading 2 must not
    // open a list of 1.
    const { counts } = attendance(rows, team);
    for (const state of ['working', 'notReporting', 'onLeave', 'vacant']) {
      expect(repsInAttendanceState(team, rows, state)).toHaveLength(counts[state]);
    }
  });

  it('never lists a manager', () => {
    const all = ['working', 'notReporting', 'onLeave', 'vacant'].flatMap((s) =>
      repsInAttendanceState(team, rows, s),
    );
    expect(all.some((p) => p.id === 'M')).toBe(false);
  });

  it('orders by calls done, descending', () => {
    const working = repsInAttendanceState(team, rows, 'working');
    expect(working.map((p) => p.name)).toEqual(['Anil', 'Bala']);
    expect(working.map((p) => p.happened)).toEqual([2, 1]);
  });

  it('carries the plan and the manager for each row', () => {
    const [anil] = repsInAttendanceState(team, rows, 'working');
    expect(anil).toMatchObject({ planned: 3, happened: 2, managerName: 'Manager' });
  });

  it('gives a vacant seat no plan rather than a zero one', () => {
    const [seat] = repsInAttendanceState(team, rows, 'vacant');
    expect(seat.planned).toBe(0);
  });
});

describe('doctorPlan', () => {
  const team = [
    { id: 'M', name: 'Manager', short: 'ABM', reportsTo: null, hq: 'HQ-Hubballi' },
    { id: 'A', name: 'Anil', short: 'BE', reportsTo: 'M', hq: 'HQ-Hubballi' },
    { id: 'B', name: 'Bala', short: 'BE', reportsTo: 'M', hq: 'HQ-Hubballi' },
    { id: 'X', name: 'Outsider', short: 'BE', reportsTo: null, hq: 'HQ-Erode' },
  ];

  const rows = [
    row({ eventId: '1', employeeId: 'A', employeeName: 'Anil', doctorId: 'DR-1', doctorName: 'Dr One' }),
    row({
      eventId: '2', employeeId: 'A', employeeName: 'Anil', doctorId: 'DR-2', doctorName: 'Dr Two',
      visitTime: '2026-09-05 14:00:00',
    }),
    row({
      eventId: '3', employeeId: 'B', employeeName: 'Bala', doctorId: 'DR-3', doctorName: 'Dr Three',
      visitTime: '2026-09-05 09:00:00',
    }),
    row({ eventId: '4', employeeId: 'X', employeeName: 'Outsider', doctorId: 'DR-4', doctorName: 'Dr Four' }),
  ];

  it('covers the whole subtree and nothing outside it', () => {
    const plan = doctorPlan(team[0], team, rows);
    expect(plan.map((v) => v.doctorName).sort()).toEqual(['Dr One', 'Dr Three', 'Dr Two']);
  });

  it('scopes to one rep when the node is a rep', () => {
    const plan = doctorPlan(team[1], team, rows);
    expect(plan.map((v) => v.doctorName).sort()).toEqual(['Dr One', 'Dr Two']);
  });

  it('puts completed calls first, in the order they happened', () => {
    const plan = doctorPlan(team[0], team, rows);
    expect(plan.map((v) => v.doctorName)).toEqual(['Dr Three', 'Dr Two', 'Dr One']);
  });

  it('sums POB per (rep, doctor, day) rather than taking the first', () => {
    const pob = [
      { employeeId: 'A', doctorId: 'DR-2', plannedDate: '2026-09-05', amount: 400 },
      { employeeId: 'A', doctorId: 'DR-2', plannedDate: '2026-09-05', amount: 600 },
      { employeeId: 'X', doctorId: 'DR-2', plannedDate: '2026-09-05', amount: 999 },
    ];
    const plan = doctorPlan(team[0], team, rows, pob);
    expect(plan.find((v) => v.doctorName === 'Dr Two').pob).toBe(1000);
  });

  it('keys every row uniquely when one Event carries two participants', () => {
    // An Event with two participants flattens to two rows sharing an
    // eventId -- React saw duplicate keys and dropped a visit from the list.
    const shared = [
      row({ eventId: 'SAME', employeeId: 'A', employeeName: 'Anil', doctorId: 'DR-9', doctorName: 'Dr Nine' }),
      row({ eventId: 'SAME', employeeId: 'B', employeeName: 'Bala', doctorId: 'DR-9', doctorName: 'Dr Nine' }),
    ];
    const plan = doctorPlan(team[0], team, shared);
    expect(plan).toHaveLength(2);
    expect(new Set(plan.map((v) => v.id)).size).toBe(2);
  });

  it('leaves POB null on a call no quotation matched', () => {
    const plan = doctorPlan(team[0], team, rows, []);
    expect(plan.every((v) => v.pob === null)).toBe(true);
  });

  it('carries the force visit reason through to the row', () => {
    const forced = [
      row({
        eventId: '9', employeeId: 'A', employeeName: 'Anil', doctorId: 'DR-9', doctorName: 'Dr Nine',
        visitTime: '2026-09-05 10:00:00', forceVisit: true, forceVisitReason: 'Camp duty at a nearby PHC',
      }),
    ];
    expect(doctorPlan(team[0], team, forced)[0].forceVisitReason).toBe('Camp duty at a nearby PHC');
  });

  it('drops a reason left on a row whose force flag is off', () => {
    // A half-edited record: showing the reason would tell the reader the
    // call was forced when the flag says it was not.
    const stale = [
      row({
        eventId: '9', employeeId: 'A', employeeName: 'Anil', doctorId: 'DR-9', doctorName: 'Dr Nine',
        visitTime: '2026-09-05 10:00:00', forceVisit: false, forceVisitReason: 'Clinic closed',
      }),
    ];
    expect(doctorPlan(team[0], team, stale)[0].forceVisitReason).toBe('');
  });

  it('gives a forced call with no reason an empty string, not undefined', () => {
    // The field is not mandatory and the fixture omits it entirely; the
    // sheet renders on truthiness, so undefined would be a silent hole.
    const bare = [
      row({
        eventId: '9', employeeId: 'A', employeeName: 'Anil', doctorId: 'DR-9', doctorName: 'Dr Nine',
        visitTime: '2026-09-05 10:00:00', forceVisit: true,
      }),
    ];
    expect(doctorPlan(team[0], team, bare)[0].forceVisitReason).toBe('');
  });
});

describe('monthEnd', () => {
  it('is the last real day of the month, not always the 31st', () => {
    expect(monthEnd('2026-01')).toBe('2026-01-31');
    expect(monthEnd('2026-04')).toBe('2026-04-30');
    expect(monthEnd('2026-02')).toBe('2026-02-28');
    expect(monthEnd('2024-02')).toBe('2024-02-29');
  });

  it('does not slip a day on a timezone east of UTC', () => {
    // new Date('2026-08-01') is parsed as UTC and is July 31st in IST.
    // Every month here must end on its own last day regardless.
    expect(monthEnd('2026-08').startsWith('2026-08')).toBe(true);
  });
});


describe('period labels', () => {
  it('names a month with its year', () => {
    expect(formatMonthName('2026-08')).toBe('Aug 2026');
  });

  it('keeps MTD for the current month, because the figures are partial', () => {
    expect(periodSuffix('month', '2026-09', '2026-09-05')).toBe('MTD');
    expect(periodSuffix('month', undefined, '2026-09-05')).toBe('MTD');
  });

  it('drops the year on a past month in the same year, keeps it otherwise', () => {
    expect(periodSuffix('month', '2026-08', '2026-09-05')).toBe('Aug');
    expect(periodSuffix('month', '2025-08', '2026-09-05')).toBe('Aug 2025');
  });

  it('is "today" whatever month is picked, when the period is today', () => {
    expect(periodSuffix('today', '2025-08', '2026-09-05')).toBe('today');
  });
});

describe('periodSuffix over a range', () => {
  it('joins the ends and keeps MTD while the range is still running', () => {
    expect(periodSuffix('month', '2026-07', '2026-09-05', '2026-09')).toBe('Jul–Sep MTD');
  });

  it('drops MTD once the range is entirely in the past', () => {
    expect(periodSuffix('month', '2026-06', '2026-09-05', '2026-07')).toBe('Jun–Jul');
  });
});
