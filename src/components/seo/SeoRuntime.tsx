'use client';

import { usePathname } from 'next/navigation';
import StructuredData from './StructuredData';
import { SEO_PAGES } from '@/lib/seo/config';
import { routeSchemaGraph } from '@/lib/seo/schema';

/** Adds route-aware breadcrumb and page schema without changing visible UI. */
export default function SeoRuntime() {
  const pathname = usePathname();
  if (!SEO_PAGES[pathname]) return null;
  return <StructuredData data={routeSchemaGraph(pathname)} />;
}
