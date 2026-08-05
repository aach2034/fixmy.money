import Link from 'next/link';
import { breadcrumbItems } from '@/lib/seo/config';

export default function SeoBreadcrumbs({ path }: { path: string }) {
  const items = breadcrumbItems(path);
  if (items.length < 2) return null;
  return <nav aria-label="Breadcrumb" className="sr-only"><ol>{items.map((item, index) => <li key={item.url}>{index < items.length - 1 ? <Link href={item.url}>{item.name}</Link> : <span aria-current="page">{item.name}</span>}</li>)}</ol></nav>;
}
