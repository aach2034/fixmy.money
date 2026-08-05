'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SEO_PAGES, relatedSeoPages } from '@/lib/seo/config';

/** Contextual crawl links generated from each public page's keyword relationships. */
export default function SeoInternalLinks() {
  const pathname = usePathname();
  if (!SEO_PAGES[pathname] || SEO_PAGES[pathname].type === 'legal') return null;
  const links = relatedSeoPages(pathname);
  if (!links.length) return null;
  return <aside aria-label="Related FixMy.Money resources" className="border-t border-slate-200 bg-slate-50 px-4 py-6">
    <div className="mx-auto max-w-7xl">
      <h2 className="text-sm font-semibold text-slate-700">Related resources</h2>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {links.map(page => <li key={page.path}><Link className="text-blue-700 hover:underline" href={page.path}>{page.title}</Link></li>)}
      </ul>
    </div>
  </aside>;
}
