import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SHEET_ROW_LIMIT, VisitListRow, limitNote } from '../VisitListRow';

/* This row is now the only place the screen decides what green, red and grey
   MEAN, so the mapping is pinned here rather than re-asserted through each
   sheet that uses it. */

function visit(over = {}) {
  return {
    id: 'EV1#0',
    doctorName: 'Dr One',
    employeeName: 'Anil',
    visitTime: '2026-09-05 14:10:00',
    distanceKm: null,
    forceVisit: false,
    forceVisitReason: '',
    ...over,
  };
}

describe('VisitListRow', () => {
  it('calls a completed, on-location visit geo verified', () => {
    render(<VisitListRow visit={visit()} />);
    expect(screen.getByText('Geo verified')).toBeInTheDocument();
  });

  it('calls a forced visit a force visit, even though it is done', () => {
    // A force visit IS completed. The pill must not read as "not done".
    render(<VisitListRow visit={visit({ forceVisit: true, distanceKm: 8.2 })} />);
    expect(screen.getByText('Force visit')).toBeInTheDocument();
  });

  it('calls a visit with no time pending', () => {
    render(<VisitListRow visit={visit({ visitTime: null })} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('lets a caller soften green without changing what it means', () => {
    render(<VisitListRow visit={visit()} verifiedLabel="Visited" />);
    expect(screen.getByText('Visited')).toBeInTheDocument();
  });

  it('puts the distance before the reason', () => {
    render(
      <VisitListRow visit={visit({ forceVisit: true, distanceKm: 8.2, forceVisitReason: 'Camp duty' })} />,
    );
    expect(screen.getByText('8.2 km away · Camp duty')).toBeInTheDocument();
  });

  it('renders no force line at all on an ordinary call', () => {
    render(<VisitListRow visit={visit()} facts={['2:10 PM']} />);
    expect(screen.queryByText(/away/)).not.toBeInTheDocument();
  });

  it('drops empty facts rather than rendering a bare separator', () => {
    render(<VisitListRow visit={visit()} facts={['2:10 PM', null, undefined, '']} />);
    expect(screen.getByText('2:10 PM')).toBeInTheDocument();
  });
});

describe('limitNote', () => {
  it('says nothing when the cap did not bite', () => {
    expect(limitNote(SHEET_ROW_LIMIT)).toBeNull();
  });

  it('admits to the cap out loud once it does', () => {
    expect(limitNote(SHEET_ROW_LIMIT + 1)).toBe(`showing first ${SHEET_ROW_LIMIT}`);
  });
});
