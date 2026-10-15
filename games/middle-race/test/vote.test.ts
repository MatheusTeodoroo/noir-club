import { describe, expect, it } from 'vitest';
import { sortGroups, tally } from '../src/vote.ts';

const ids = Array.from({ length: 11 }, (_, i) => `p${i + 1}`);

describe('inverted vote', () => {
  it('places the most voted last and splits ties into new votes (4/3/3/1/0×7)', () => {
    const ballots: Record<string, string> = {
      p1: 'p1', p2: 'p1', p3: 'p1', p4: 'p1',
      p5: 'p2', p6: 'p2', p7: 'p2',
      p8: 'p3', p9: 'p3', p10: 'p3',
      p11: 'p4',
    };
    const r = tally({ cands: ids, lo: 1, hi: 11 }, ballots);
    expect(r.placed).toEqual({ 11: 'p1', 8: 'p4' });
    expect(sortGroups(r.groups)).toEqual([
      { cands: ['p2', 'p3'], lo: 9, hi: 10 },
      { cands: ['p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'], lo: 1, hi: 7 },
    ]);
  });

  it('lets players vote for themselves and ignores votes for non-candidates', () => {
    const r = tally({ cands: ['p2', 'p3'], lo: 9, hi: 10 }, { p2: 'p2', p3: 'p2', p1: 'p9' });
    expect(r.placed).toEqual({ 10: 'p2', 9: 'p3' });
    expect(r.groups).toEqual([]);
  });

  it('repeats the same group when everyone ties again', () => {
    const g = { cands: ['p2', 'p3'], lo: 9, hi: 10 };
    expect(tally(g, { p1: 'p2', p4: 'p3' }).groups).toEqual([g]);
    expect(tally(g, {}).groups).toEqual([g]);
  });
});
