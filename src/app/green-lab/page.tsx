import type { Metadata } from 'next';
import GreenLabImmersive from '@/components/GreenLabImmersive';

export const metadata: Metadata = {
  title: 'Green Optimization Lab — Graph Simulation System v3.0',
  description: 'Scientific graph-theory based environmental simulation. Compare Greedy, PageRank, Dijkstra, MST, Centrality and Max Coverage algorithms for optimal tree plantation zone selection across Delhi NCR.',
};

export default function GreenLabPage() {
  return <GreenLabImmersive />;
}
