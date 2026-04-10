/**
 * Engine 6: Urban Green Optimization Lab
 *
 * Implements 6 graph algorithms over the Delhi 1km² grid to determine
 * optimal tree plantation zones.
 *
 * Node  = 1km² grid cell
 * Edge  = 4-directional adjacency (N/S/E/W)
 * Weight= environmental influence (OSI-based)
 */

import { GridSurvivalData, GraphAlgorithm, AlgorithmResult } from '@/types';

// ─────────────────────────────────────────────
// Graph helpers
// ─────────────────────────────────────────────

/** Build a map from gridId → GridSurvivalData for O(1) lookup */
function buildIndex(grids: GridSurvivalData[]): Map<string, GridSurvivalData> {
  return new Map(grids.map(g => [g.gridId, g]));
}

/**
 * Build adjacency list.
 * Two grids are adjacent if their lat/lng centres are within ~1.05 km
 * (≈ 0.01° in either direction, but not diagonal).
 */
function buildAdjacency(grids: GridSurvivalData[]): Map<string, string[]> {
  const STEP = 0.01; // ~1km in degrees
  const EPS  = 0.005;

  // Index by rounded lat/lng
  const byPos = new Map<string, GridSurvivalData>();
  grids.forEach(g => {
    const key = `${Math.round(g.lat / STEP)}_${Math.round(g.lng / STEP)}`;
    byPos.set(key, g);
  });

  const adj = new Map<string, string[]>();
  grids.forEach(g => {
    const neighbors: string[] = [];
    const latR = Math.round(g.lat / STEP);
    const lngR = Math.round(g.lng / STEP);
    for (const [dLat, dLng] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
      const nKey = `${latR + dLat}_${lngR + dLng}`;
      const nb = byPos.get(nKey);
      if (nb && nb.gridId !== g.gridId) neighbors.push(nb.gridId);
    }
    adj.set(g.gridId, neighbors);
  });

  return adj;
}

/** Normalised impact score: survivalProb × ndviGain × osiReduction */
function impactScore(g: GridSurvivalData): number {
  const osiReduction = Math.max(0, (g.currentOSI - 650) / 250);
  return g.survivalProbability * g.expectedNDVIGain * osiReduction;
}

/** Estimate OSI reduction % from selected grids */
function estimateOSIReduction(selected: GridSurvivalData[], all: GridSurvivalData[]): number {
  if (!all.length) return 0;
  const avgAll     = all.reduce((s, g) => s + g.currentOSI, 0) / all.length;
  const avgSelected= selected.reduce((s, g) => s + g.currentOSI, 0) / (selected.length || 1);
  // Each tree planted reduces local OSI by ~0.5 per grid (heuristic)
  const raw = (avgSelected / avgAll) * selected.length * 0.5 * 100 / all.length;
  return Math.min(Math.round(raw * 10) / 10, 25);
}

function makeResult(
  algorithm: GraphAlgorithm,
  selected: GridSurvivalData[],
  all: GridSurvivalData[],
  topN: number,
  startMs: number,
  highlights: string[],
  edges?: [number, number][][]
): AlgorithmResult {
  const treesRequired  = selected.length * 3200; // 8ha × 400 trees/ha
  const osiReductionPct= estimateOSIReduction(selected, all);
  const coverageArea   = selected.length;         // 1 km² per grid
  const score          = selected.reduce((s, g) => s + impactScore(g), 0);

  return {
    algorithm,
    selectedGridIds: selected.map(g => g.gridId),
    edges,
    treesRequired,
    osiReductionPct,
    coverageArea,
    impactScore: Math.round(score * 1000) / 1000,
    executionTimeMs: Math.round(performance.now() - startMs),
    highlights,
  };
}

// ─────────────────────────────────────────────
// Algorithm 1: Greedy Impact Selection
// ─────────────────────────────────────────────
function runGreedy(grids: GridSurvivalData[], topN: number): AlgorithmResult {
  const t0 = performance.now();
  const sorted = [...grids]
    .filter(g => g.survivalProbability > 0.15)
    .sort((a, b) => impactScore(b) - impactScore(a))
    .slice(0, topN);

  return makeResult('greedy', sorted, grids, topN, t0, [
    `Selected top ${sorted.length} highest-OSI grids`,
    `Avg OSI in selected zone: ${Math.round(sorted.reduce((s,g)=>s+g.currentOSI,0)/sorted.length)}`,
    'Baseline algorithm — fast O(n log n)',
  ]);
}

// ─────────────────────────────────────────────
// Algorithm 2: PageRank
// ─────────────────────────────────────────────
function runPageRank(grids: GridSurvivalData[], topN: number): AlgorithmResult {
  const t0  = performance.now();
  const adj = buildAdjacency(grids);
  const idx = buildIndex(grids);

  const DAMPING  = 0.85;
  const ITERS    = 30;
  const N        = grids.length;

  // Initialise with OSI-weighted scores
  const scores = new Map<string, number>();
  grids.forEach(g => scores.set(g.gridId, g.currentOSI / 800));

  for (let iter = 0; iter < ITERS; iter++) {
    const next = new Map<string, number>();
    grids.forEach(g => {
      const neighbors = adj.get(g.gridId) ?? [];
      let incoming = 0;
      neighbors.forEach(nId => {
        const nNbs = adj.get(nId) ?? [];
        incoming += (scores.get(nId) ?? 0) / Math.max(nNbs.length, 1);
      });
      next.set(g.gridId, (1 - DAMPING) / N + DAMPING * incoming);
    });
    next.forEach((v, k) => scores.set(k, v));
  }

  const sorted = [...grids]
    .filter(g => g.survivalProbability > 0.1)
    .sort((a, b) => (scores.get(b.gridId) ?? 0) - (scores.get(a.gridId) ?? 0))
    .slice(0, topN);

  return makeResult('pagerank', sorted, grids, topN, t0, [
    `PageRank damping factor: ${DAMPING}, iterations: ${ITERS}`,
    'Prioritises grids with high-OSI neighbours (influential hubs)',
    'Analogous to Google\u0027s original ranking algorithm',
  ]);
}

// ─────────────────────────────────────────────
// Algorithm 3: Graph Centrality
// ─────────────────────────────────────────────
function runCentrality(grids: GridSurvivalData[], topN: number): AlgorithmResult {
  const t0  = performance.now();
  const adj = buildAdjacency(grids);
  const idx = buildIndex(grids);

  // Degree centrality weighted by neighbour OSI
  const centrality = new Map<string, number>();
  grids.forEach(g => {
    const neighbors = adj.get(g.gridId) ?? [];
    const weightedDegree = neighbors.reduce((s, nId) => {
      const nb = idx.get(nId);
      return s + (nb ? nb.currentOSI / 800 : 0);
    }, 0);
    centrality.set(g.gridId, weightedDegree);
  });

  const sorted = [...grids]
    .filter(g => g.survivalProbability > 0.1)
    .sort((a, b) => (centrality.get(b.gridId) ?? 0) - (centrality.get(a.gridId) ?? 0))
    .slice(0, topN);

  const avgDeg = sorted.reduce((s, g) => s + (adj.get(g.gridId)?.length ?? 0), 0) / (sorted.length || 1);

  return makeResult('centrality', sorted, grids, topN, t0, [
    `Avg degree of selected nodes: ${avgDeg.toFixed(1)}`,
    'Targets strategically-connected grids that maximise network impact',
    'Uses weighted degree centrality (OSI-influenced)',
  ]);
}

// ─────────────────────────────────────────────
// Algorithm 4: Dijkstra (Pollution Propagation Blocking)
// ─────────────────────────────────────────────
function runDijkstra(grids: GridSurvivalData[], topN: number): AlgorithmResult {
  const t0  = performance.now();
  const adj = buildAdjacency(grids);

  // Source nodes: top 10% highest OSI grids (pollution sources)
  const sources = [...grids]
    .sort((a, b) => b.currentOSI - a.currentOSI)
    .slice(0, Math.ceil(grids.length * 0.1))
    .map(g => g.gridId);

  // Run BFS/Dijkstra from sources; distance = inverse OSI (lower OSI = closer to clean)
  const dist = new Map<string, number>();
  grids.forEach(g => dist.set(g.gridId, Infinity));
  const queue: { id: string; d: number }[] = [];
  sources.forEach(id => { dist.set(id, 0); queue.push({ id, d: 0 }); });

  // Simple Dijkstra with array-based priority queue (sufficient for ≤5000 nodes)
  queue.sort((a, b) => a.d - b.d);
  let qi = 0;
  while (qi < queue.length) {
    const { id, d } = queue[qi++];
    if (d > (dist.get(id) ?? Infinity)) continue;
    const neighbors = adj.get(id) ?? [];
    neighbors.forEach(nId => {
      const nGrid = grids.find(g => g.gridId === nId);
      if (!nGrid) return;
      // Edge weight = inverse of OSI (polluted grids are "closer")
      const w = 1 - nGrid.currentOSI / 1000;
      const nd = d + Math.max(0.001, w);
      if (nd < (dist.get(nId) ?? Infinity)) {
        dist.set(nId, nd);
        queue.push({ id: nId, d: nd });
        queue.sort((a, b) => a.d - b.d);
      }
    });
  }

  // Select grids at medium distance (choke points on pollution paths)
  const scored = grids
    .filter(g => g.survivalProbability > 0.1 && !sources.includes(g.gridId))
    .map(g => ({ g, score: 1 / Math.max(dist.get(g.gridId) ?? 1, 0.001) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.g);

  // Return edges from source to selected (simplified)
  const resultEdges: [number, number][][] = [];
  scored.forEach(g => {
    // Find nearest source
    let nearest: GridSurvivalData | null = null;
    let minDist = Infinity;
    sources.slice(0, 5).forEach(sId => {
      const s = grids.find(x => x.gridId === sId)!;
      const d = Math.sqrt(Math.pow(s.lat - g.lat, 2) + Math.pow(s.lng - g.lng, 2));
      if (d < minDist) { minDist = d; nearest = s; }
    });
    if (nearest) resultEdges.push([[nearest.lng, nearest.lat], [g.lng, g.lat]]);
  });

  return makeResult('dijkstra', scored, grids, topN, t0, [
    `${sources.length} pollution source nodes identified`,
    'Plants trees at choke-points on fastest pollution spread paths',
    'Based on Dijkstra shortest-path with OSI-weighted edges',
  ], resultEdges);
}

// ─────────────────────────────────────────────
// Algorithm 5: Minimum Spanning Tree (Green Corridors)
// ─────────────────────────────────────────────
function runMST(grids: GridSurvivalData[], topN: number): AlgorithmResult {
  const t0 = performance.now();

  // Build edges sorted by weight (lower OSI diff = prefer connecting similar-stress areas)
  const edges: { u: string; v: string; w: number }[] = [];
  const adj = buildAdjacency(grids);
  const idx = buildIndex(grids);

  grids.forEach(g => {
    (adj.get(g.gridId) ?? []).forEach(nId => {
      const nb = idx.get(nId);
      if (!nb) return;
      // Weight = cost to create green corridor (lower = prefer)
      const w = Math.abs(g.currentOSI - nb.currentOSI) + 1;
      edges.push({ u: g.gridId, v: nId, w });
    });
  });

  edges.sort((a, b) => a.w - b.w);

  // Union-Find
  const parent = new Map<string, string>();
  grids.forEach(g => parent.set(g.gridId, g.gridId));

  function find(x: string): string {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  function union(x: string, y: string): boolean {
    const px = find(x), py = find(y);
    if (px === py) return false;
    parent.set(px, py);
    return true;
  }

  // Kruskal's MST — collect MST edge nodes
  const mstNodes = new Set<string>();
  const resultEdges: [number, number][][] = [];
  for (const e of edges) {
    if (union(e.u, e.v)) {
      mstNodes.add(e.u);
      mstNodes.add(e.v);
      const u = idx.get(e.u)!;
      const v = idx.get(e.v)!;
      resultEdges.push([[u.lng, u.lat], [v.lng, v.lat]]);
    }
    if (mstNodes.size >= topN * 2) break;
  }

  // From MST nodes, pick those with highest OSI (most in need of green corridors)
  const selected = [...mstNodes]
    .map(id => idx.get(id))
    .filter((g): g is GridSurvivalData => !!g && g.survivalProbability > 0.1)
    .sort((a, b) => b.currentOSI - a.currentOSI)
    .slice(0, topN);

  return makeResult('mst', selected, grids, topN, t0, [
    `MST green corridor covers ${selected.length} km²`,
    "Connects high-stress zones with minimum plantation cost",
    "Uses Kruskal's algorithm — ideal for urban green corridors",
  ], resultEdges);
}

// ─────────────────────────────────────────────
// Algorithm 6: Maximum Coverage
// ─────────────────────────────────────────────
function runMaxCoverage(grids: GridSurvivalData[], topN: number): AlgorithmResult {
  const t0  = performance.now();
  const adj = buildAdjacency(grids);

  const covered = new Set<string>();
  const selected: GridSurvivalData[] = [];
  const remaining = new Set(grids.filter(g => g.survivalProbability > 0.1).map(g => g.gridId));

  while (selected.length < topN && remaining.size > 0) {
    // Pick uncovered grid that covers the most uncovered neighbors
    let bestId = '';
    let bestScore = -1;

    remaining.forEach(id => {
      const neighbors = adj.get(id) ?? [];
      const newCoverage = neighbors.filter(n => !covered.has(n)).length;
      const grid = grids.find(g => g.gridId === id)!;
      // Weight by OSI as well
      const score = newCoverage * (grid.currentOSI / 800);
      if (score > bestScore) { bestScore = score; bestId = id; }
    });

    if (!bestId) break;
    const bestGrid = grids.find(g => g.gridId === bestId)!;
    selected.push(bestGrid);
    covered.add(bestId);
    (adj.get(bestId) ?? []).forEach(n => covered.add(n));
    remaining.delete(bestId);
  }

  const uniquelyCovered = covered.size;

  return makeResult('maxcoverage', selected, grids, topN, t0, [
    `${uniquelyCovered} km² total coverage achieved`,
    `Each selected grid covers avg ${(uniquelyCovered / selected.length).toFixed(1)} neighbours`,
    'Greedy set-cover — maximises area with fewest plantation sites',
  ]);
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export function runAlgorithm(
  algorithm: GraphAlgorithm,
  grids: GridSurvivalData[],
  topN: number
): AlgorithmResult {
  switch (algorithm) {
    case 'greedy':      return runGreedy(grids, topN);
    case 'pagerank':    return runPageRank(grids, topN);
    case 'centrality':  return runCentrality(grids, topN);
    case 'dijkstra':    return runDijkstra(grids, topN);
    case 'mst':         return runMST(grids, topN);
    case 'maxcoverage': return runMaxCoverage(grids, topN);
  }
}

export const ALGORITHM_META: Record<GraphAlgorithm, {
  label: string;
  icon: string;
  description: string;
  color: string;
  complexity: string;
  bestFor: string;
}> = {
  greedy: {
    label: 'Greedy Impact',
    icon: '⚡',
    description: 'Selects grids with highest raw impact score. Fast baseline.',
    color: '#ffc107',
    complexity: 'O(n log n)',
    bestFor: 'Quick wins in highest-stress zones',
  },
  pagerank: {
    label: 'PageRank',
    icon: '🔗',
    description: 'Treats environmental influence as information flow. Finds most influential nodes.',
    color: '#00e5ff',
    complexity: 'O(n × k)',
    bestFor: 'Maximising network-wide impact',
  },
  centrality: {
    label: 'Centrality',
    icon: '🕸️',
    description: 'Weighted degree centrality. Finds strategically connected hubs.',
    color: '#b388ff',
    complexity: 'O(n + e)',
    bestFor: 'Strategic placement at connectivity hubs',
  },
  dijkstra: {
    label: 'Dijkstra',
    icon: '🗺️',
    description: 'Plants trees at choke points along pollution propagation paths.',
    color: '#ff5983',
    complexity: 'O((n + e) log n)',
    bestFor: 'Blocking pollution spread corridors',
  },
  mst: {
    label: 'Green Corridors (MST)',
    icon: '🌿',
    description: "Kruskal's MST creates connected green corridors with minimum cost.",
    color: '#00f59d',
    complexity: 'O(e log e)',
    bestFor: 'Urban ecology green corridor design',
  },
  maxcoverage: {
    label: 'Max Coverage',
    icon: '📡',
    description: 'Greedy set-cover: few grids that influence the largest area.',
    color: '#ff9100',
    complexity: 'O(n²)',
    bestFor: 'Maximum area coverage with limited sites',
  },
};
