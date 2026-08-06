import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ComparisonLandingPage from '@/components/ComparisonLandingPage';
import { comparisonPages } from '@/lib/comparisons/pages';

export function generateStaticParams() { return Object.keys(comparisonPages).map(slug => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const page = comparisonPages[slug]; if (!page) return {};
  return { title: page.eyebrow, description: page.description, alternates: { canonical: `https://fixmy.money/${slug}` }, openGraph: { title: page.title, description: page.description, url: `https://fixmy.money/${slug}`, type: 'website' } };
}
export default async function DynamicComparisonPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const page = comparisonPages[slug]; if (!page) notFound(); return <ComparisonLandingPage page={page}/>; }
