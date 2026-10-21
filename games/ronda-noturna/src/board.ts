// Metro-style boards: coloured lines of stations on a lattice, joined at interchanges, plus a few
// dashed links. Shared by the logic (adjacency) and the UI (drawing) — the map is public; the
// stars and the thieves are not, and never live here.
//
// A board is fully determined by (seed, size), so views only carry those two numbers.

export interface Board {
  seed: number;
  size: number;
  /** Lattice width and height (node coordinates are lattice points). */
  cols: number;
  rows: number;
  nodes: { x: number; y: number }[];
  /** `line` indexes LINE_COLORS; dashed links are drawn dashed and play like any other link. */
  edges: { a: number; b: number; line: number; dashed: boolean }[];
}

/** The fixed maps: reviewed seeds that draw well at each size. */
export const FIXED_BOARDS = [
  { id: 'm150', seed: 101, size: 150 },
  { id: 'm170', seed: 202, size: 170 },
  { id: 'm190', seed: 303, size: 190 },
  { id: 'm210', seed: 404, size: 210 },
  { id: 'm230', seed: 505, size: 230 },
] as const;

export const LINE_COLORS = [
  '#d4af37', // gold
  '#b3263a', // crimson
  '#2f9e6e', // emerald
  '#3b6fd1', // sapphire
  '#8a5cc7', // amethyst
  '#c7793a', // copper
  '#2aa7a7', // teal
  '#d77a9a', // rose
  '#9aa63c', // olive
  '#8fa3b8', // steel
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 8 directions, clockwise from east.
const DIRS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;

export function generateBoard(seed: number, size: number): Board {
  const rand = mulberry32(seed * 7919 + size);
  const int = (n: number) => Math.floor(rand() * n);
  const points = size / 0.55;
  const cols = Math.round(Math.sqrt((points * 16) / 9));
  const rows = Math.round(points / cols);

  const nodes: Board['nodes'] = [];
  const edges: Board['edges'] = [];
  const at: number[] = new Array(cols * rows).fill(-1);
  const deg: number[] = [];
  const edgeKey = new Set<string>();
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const nodeAt = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? -2 : at[y * cols + x]!);

  const addNode = (x: number, y: number) => {
    const i = nodes.length;
    nodes.push({ x, y });
    at[y * cols + x] = i;
    deg.push(0);
    return i;
  };
  const addEdge = (a: number, b: number, line: number, dashed = false) => {
    edges.push({ a, b, line, dashed });
    edgeKey.add(key(a, b));
    deg[a]! += 1;
    deg[b]! += 1;
  };

  /** A unit step from (x, y) along d: allowed if in bounds, new, and not crossing a diagonal. */
  const canStep = (x: number, y: number, d: number) => {
    const [dx, dy] = DIRS[d]!;
    const nx = x + dx;
    const ny = y + dy;
    const target = nodeAt(nx, ny);
    if (target === -2) return false;
    const from = nodeAt(x, y);
    if (target >= 0 && (edgeKey.has(key(from, target)) || deg[target]! >= 4)) return false;
    if (dx !== 0 && dy !== 0) {
      const p = nodeAt(nx, y);
      const q = nodeAt(x, ny);
      if (p >= 0 && q >= 0 && edgeKey.has(key(p, q))) return false;
    }
    return true;
  };

  let line = 0;
  // First station near the middle; every later line branches from an existing station,
  // so the board is connected by construction.
  addNode(Math.floor(cols / 2) + int(3) - 1, Math.floor(rows / 2) + int(3) - 1);

  let stalls = 0;
  while (nodes.length < size && stalls < 400) {
    const candidates = nodes.map((_, i) => i).filter((i) => deg[i]! <= 2);
    const start = candidates.length ? candidates[int(candidates.length)]! : int(nodes.length);
    let { x, y } = nodes[start]!;
    // Straight lines read better: favour horizontal and vertical starts.
    let d = rand() < 0.65 ? int(4) * 2 : int(4) * 2 + 1;
    const length = 6 + int(14);
    let cur = start;
    let made = 0;
    for (let s = 0; s < length && nodes.length < size; s++) {
      const turn = rand();
      const order =
        turn < 0.72
          ? [d, (d + 1) % 8, (d + 7) % 8]
          : turn < 0.86
            ? [(d + 1) % 8, d, (d + 7) % 8]
            : [(d + 7) % 8, d, (d + 1) % 8];
      const next = order.find((c) => canStep(x, y, c));
      if (next === undefined) break;
      d = next;
      x += DIRS[d]![0];
      y += DIRS[d]![1];
      const existing = nodeAt(x, y);
      const n = existing >= 0 ? existing : addNode(x, y);
      addEdge(cur, n, line % LINE_COLORS.length);
      cur = n;
      made++;
      // Running into an interchange often ends a line, like real metro maps.
      if (existing >= 0 && rand() < 0.35) break;
    }
    if (made === 0) stalls++;
    else line++;
  }

  // Dead ends: join each to a neighbouring station (same colour), else leave it.
  for (let i = 0; i < nodes.length; i++) {
    if (deg[i] !== 1) continue;
    const { x, y } = nodes[i]!;
    const lineOf = edges.find((e) => e.a === i || e.b === i)!.line;
    const options = DIRS.map((_, d) => d).filter((d) => {
      const t = nodeAt(x + DIRS[d]![0], y + DIRS[d]![1]);
      return t >= 0 && canStep(x, y, d);
    });
    if (options.length) {
      const d = options[int(options.length)]!;
      addEdge(i, nodeAt(x + DIRS[d]![0], y + DIRS[d]![1]), lineOf);
    }
  }

  // Dashed links: straight hops of 2–3 lattice steps over empty ground between stations that
  // are far apart on the network, to add a few loops.
  const wanted = Math.round(size / 30);
  let added = 0;
  for (let attempt = 0; attempt < size * 8 && added < wanted; attempt++) {
    const a = int(nodes.length);
    if (deg[a]! >= 4) continue;
    const d = int(8);
    const len = 2 + int(2);
    const [dx, dy] = DIRS[d]!;
    const { x, y } = nodes[a]!;
    let ok = true;
    for (let k = 1; k < len && ok; k++) {
      const mx = x + dx * k;
      const my = y + dy * k;
      if (nodeAt(mx, my) !== -1) ok = false;
      if (ok && dx !== 0 && dy !== 0) {
        const p = nodeAt(mx, my - dy);
        const q = nodeAt(mx - dx, my);
        if (p >= 0 && q >= 0 && edgeKey.has(key(p, q))) ok = false;
      }
    }
    if (!ok) continue;
    if (dx !== 0 && dy !== 0) {
      const ex = x + dx * len;
      const ey = y + dy * len;
      const p = nodeAt(ex, ey - dy);
      const q = nodeAt(ex - dx, ey);
      if (p >= 0 && q >= 0 && edgeKey.has(key(p, q))) continue;
    }
    const b = nodeAt(x + dx * len, y + dy * len);
    if (b < 0 || deg[b]! >= 4 || edgeKey.has(key(a, b))) continue;
    if (distance(nodes.length, edges, a, b) < 6) continue;
    addEdge(a, b, -1, true);
    added++;
  }

  return { seed, size: nodes.length, cols, rows, nodes, edges };
}

function distance(n: number, edges: Board['edges'], from: number, to: number) {
  const adj = adjacencyOf(n, edges);
  const dist = new Array(n).fill(-1);
  dist[from] = 0;
  const queue = [from];
  for (let h = 0; h < queue.length; h++) {
    const u = queue[h]!;
    if (u === to) return dist[u];
    for (const v of adj[u]!) if (dist[v] < 0) (dist[v] = dist[u] + 1), queue.push(v);
  }
  return Infinity;
}

function adjacencyOf(n: number, edges: Board['edges']): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    adj[e.a]!.push(e.b);
    adj[e.b]!.push(e.a);
  }
  for (const list of adj) list.sort((p, q) => p - q);
  return adj;
}

/** Neighbour lists by node index. */
export function adjacency(board: Board): number[][] {
  return adjacencyOf(board.nodes.length, board.edges);
}
