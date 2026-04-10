import type { Metadata } from 'next';
import UrbanPlanPortal from '@/components/UrbanPlanPortal';

export const metadata: Metadata = {
  title: 'Urban Intervention Planner — Species & Policy Recommendations',
  description: 'Grid-level urban intervention planner for Delhi NCR. Recommends specific tree species (Banyan, Peepal, Neem), oxygen plants, CNG-only and EV zones based on satellite OSI, NDVI and survival analysis.',
};

export default function UrbanPlanPage() {
  return <UrbanPlanPortal />;
}
