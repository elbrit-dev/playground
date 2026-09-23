import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoctorPlanSheet } from '../DoctorPlanSheet';

/* The force visit reason is the only thing on this sheet that comes from a
   rep typing free text, so it is the only thing with a genuinely empty case
   worth pinning: the field is not mandatory and most forced calls in the live
   data carry nothing. Driven through the real props rather than the selector
   so the render path — which is where an undefined would silently vanish — is
   the thing under test. */

const TEAM = [
  { id: 'M', name: 'Manager', short: 'ABM', reportsTo: null, hq: 'HQ-Hubballi' },
  { id: 'A', name: 'Anil', short: 'BE', reportsTo: 'M', hq: 'HQ-Hubballi' },
];

function visit(over = {}) {
  return {
    eventId: 'EV1',
    subject: 'Visit',
    plannedDate: '2026-09-05',
    employeeId: 'A',
    employeeName: 'Anil',
    doctorId: 'DR-1',
    doctorName: 'Dr One',
    hq: 'HQ-Hubballi',
    department: 'Elbrit',
    pobGiven: false,
    visitTime: '2026-09-05 10:00:00',
    distanceKm: 0.1,
    forceVisit: false,
    forceVisitReason: '',
    ...over,
  };
}

function renderSheet(rows) {
  render(
    <DoctorPlanSheet
      member={TEAM[0]}
      team={TEAM}
      rows={rows}
      pob={[]}
      periodLabel="Sep 2026"
      onClose={vi.fn()}
    />,
  );
}

describe('DoctorPlanSheet', () => {
  it('shows how far away a forced call was, then why', () => {
    // Word for word what VisitsByHourSheet shows for the same call: two
    // sheets describing one fact differently reads as two facts.
    renderSheet([
      visit({ forceVisit: true, distanceKm: 8.2, forceVisitReason: 'Camp duty at a nearby PHC' }),
    ]);
    expect(screen.getByText('Force visit')).toBeInTheDocument();
    expect(screen.getByText('8.2 km away · Camp duty at a nearby PHC')).toBeInTheDocument();
  });

  it('shows the distance on a forced call with no reason given', () => {
    renderSheet([visit({ forceVisit: true, distanceKm: 8.2 })]);
    expect(screen.getByText('8.2 km away')).toBeInTheDocument();
  });

  it('shows no distance on an ordinary verified call', () => {
    // 0.2km on every geo-verified row is noise, not information.
    renderSheet([visit({ distanceKm: 0.2 })]);
    expect(screen.queryByText(/away/)).not.toBeInTheDocument();
  });

  it('renders a forced call that carries no reason', () => {
    renderSheet([visit({ forceVisit: true, distanceKm: 8.2 })]);
    expect(screen.getByText('Force visit')).toBeInTheDocument();
    expect(screen.getByText('Dr One')).toBeInTheDocument();
  });

  it('shows no reason line on an ordinary verified call', () => {
    renderSheet([visit({ forceVisitReason: 'Clinic closed' })]);
    expect(screen.getByText('Visited')).toBeInTheDocument();
    expect(screen.queryByText('Clinic closed')).not.toBeInTheDocument();
  });
});
