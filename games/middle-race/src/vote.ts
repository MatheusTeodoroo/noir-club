// Inverted vote for the class-picking order. Pure: no ctx, no randomness.
//
// Every vote involves one group of candidates competing for a range of picking slots
// (slot 1 picks first, slot 11 picks last). The most voted candidate takes the highest slot of
// the range. Candidates tied on the same count form a new group for the slots they share, and
// vote again (forever, if they keep tying). Groups holding later slots vote first.

export interface VoteGroup {
  cands: string[];
  /** Lowest and highest picking slot (1-based) this group competes for. */
  lo: number;
  hi: number;
}

export interface TallyResult {
  /** slot → player id, for every candidate placed alone. */
  placed: Record<number, string>;
  /** Tied candidates, each with the slots they now compete for. */
  groups: VoteGroup[];
  counts: Record<string, number>;
}

export function tally(group: VoteGroup, ballots: Record<string, string>): TallyResult {
  const counts: Record<string, number> = Object.fromEntries(group.cands.map((c) => [c, 0]));
  for (const target of Object.values(ballots)) {
    if (target in counts) counts[target]! += 1;
  }
  const levels = [...new Set(Object.values(counts))].sort((a, b) => b - a);
  const placed: Record<number, string> = {};
  const groups: VoteGroup[] = [];
  let hi = group.hi;
  for (const level of levels) {
    const tied = group.cands.filter((c) => counts[c] === level);
    const lo = hi - tied.length + 1;
    if (tied.length === 1) placed[hi] = tied[0]!;
    else groups.push({ cands: tied, lo, hi });
    hi = lo - 1;
  }
  return { placed, groups, counts };
}

/** Pending groups in the order they vote: later slots first. */
export function sortGroups(groups: VoteGroup[]): VoteGroup[] {
  return [...groups].sort((a, b) => b.hi - a.hi);
}
