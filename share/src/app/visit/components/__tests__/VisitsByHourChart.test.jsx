import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitsByHourChart } from '../VisitsByHourChart';
import { VisitsByHourSheet } from '../VisitsByHourSheet';
import { CHART_HOURS } from '../../data/selectors';

/* The bar is a control now, and the two things that can go wrong with it are
   invisible in a screenshot: an empty hour that still takes a tap and opens
   nothing, and a bar whose accessible name is the bare number "14". */

function bars(overrides = {}) {
  return CHART_HOURS.map((hour) => ({ hour, verified: 0, force: 0, ...(overrides[hour] ?? {}) }));
}

describe('VisitsByHourChart', () => {
  it('opens the hour behind a bar', async () => {
    const onSelectHour = vi.fn();
    render(<VisitsByHourChart data={bars({ 14: { verified: 3, force: 1 } })} onSelectHour={onSelectHour} />);

    await userEvent.click(screen.getByRole('button', { name: /^2p:/ }));
    expect(onSelectHour).toHaveBeenCalledWith(14);
  });

  it('names the bar in full, not just its value', () => {
    render(<VisitsByHourChart data={bars({ 14: { verified: 3, force: 1 } })} onSelectHour={vi.fn()} />);
    expect(screen.getByRole('button', { name: '2p: 4 visits, 1 force' })).toBeInTheDocument();
  });

  it('leaves an empty hour unpressable', () => {
    // A tap that opens "no visits" is a dead end the reader paid for.
    render(<VisitsByHourChart data={bars({ 14: { verified: 3 } })} onSelectHour={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('renders no buttons at all when nothing is wired to it', () => {
    render(<VisitsByHourChart data={bars({ 14: { verified: 3 } })} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

function visitRow(over = {}) {
  return {
    eventId: 'EV1',
    plannedDate: '2026-09-05',
    employeeId: 'E1',
    employeeName: 'Anil',
    doctorId: 'DR-1',
    doctorName: 'Dr One',
    hq: 'HQ-Hubballi',
    pobGiven: false,
    visitTime: '2026-09-05 14:10:00',
    distanceKm: 0.2,
    forceVisit: false,
    forceVisitReason: '',
    ...over,
  };
}

describe('VisitsByHourSheet', () => {
  it('lists the calls in the hour it was opened on', () => {
    render(
      <VisitsByHourSheet
        selection={{ hour: 14 }}
        rows={[
          visitRow({ eventId: 'A', doctorName: 'Dr Two PM' }),
          visitRow({ eventId: 'B', visitTime: '2026-09-05 15:10:00', doctorName: 'Dr Three PM' }),
        ]}
        periodLabel="Sep 2026"
        scopeLabel="All HQs"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Dr Two PM')).toBeInTheDocument();
    expect(screen.queryByText('Dr Three PM')).not.toBeInTheDocument();
  });

  it('titles a tone selection as a series rather than an hour', () => {
    render(
      <VisitsByHourSheet
        selection={{ tone: 'force' }}
        rows={[visitRow({ forceVisit: true, distanceKm: 8.2, forceVisitReason: 'Camp duty' })]}
        periodLabel="Sep 2026"
        scopeLabel="All HQs"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Force visits')).toBeInTheDocument();
    // Distance AND reason: the distance is what made it a force visit.
    expect(screen.getByText('8.2 km away · Camp duty')).toBeInTheDocument();
  });

  it('shows the distance on a forced call that carries no reason', () => {
    render(
      <VisitsByHourSheet
        selection={{ hour: 14 }}
        rows={[visitRow({ forceVisit: true, distanceKm: 8.2 })]}
        periodLabel="Sep 2026"
        scopeLabel="All HQs"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('8.2 km away')).toBeInTheDocument();
  });

  it('drops the HQ from each row once the strip is filtered to one', () => {
    // The subtitle already names it; repeating it on every row is noise.
    render(
      <VisitsByHourSheet
        selection={{ hour: 14 }}
        rows={[visitRow()]}
        periodLabel="Sep 2026"
        scopeLabel="Hubballi"
        showHq={false}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('2:10 PM · Anil')).toBeInTheDocument();
  });

  it('keeps the HQ on each row under All HQs, where rows can differ', () => {
    render(
      <VisitsByHourSheet
        selection={{ hour: 14 }}
        rows={[visitRow()]}
        periodLabel="Sep 2026"
        scopeLabel="All HQs"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('2:10 PM · Anil · Hubballi')).toBeInTheDocument();
  });

  it('stays closed when nothing is selected', () => {
    render(
      <VisitsByHourSheet
        selection={null}
        rows={[visitRow()]}
        periodLabel="Sep 2026"
        scopeLabel="All HQs"
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('Dr One')).not.toBeInTheDocument();
  });
});
