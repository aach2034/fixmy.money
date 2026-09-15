import Link from 'next/link';
import PublicBrandLink from '@/components/marketing/PublicBrandLink';

export default function PublicFooter() {
  return (
    <footer className="border-t border-[#d9e4df] bg-white px-5 py-10 lg:px-8">
      <div className="mx-auto grid max-w-[1180px] gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <PublicBrandLink label="FixMy.Money" />
          <p className="mt-3 max-w-md text-sm leading-6 text-[#5e6d67]">
            Structured credit-report review and evidence-led dispute workflows, with people in control of every decision.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#43534d] sm:justify-end">
          <Link href="/product-tour" className="transition-colors hover:text-[#267a31]">Product</Link>
          <Link href="/pricing" className="transition-colors hover:text-[#267a31]">Pricing</Link>
          <Link href="/blog" className="transition-colors hover:text-[#267a31]">Resources</Link>
          <Link href="/privacy" className="transition-colors hover:text-[#267a31]">Privacy</Link>
          <Link href="/login" className="transition-colors hover:text-[#267a31]">Sign in</Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-[1180px] flex-col gap-2 border-t border-[#e7eeeb] pt-5 text-xs leading-5 text-[#697872] sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 FixMy.Money. Software tools—not legal or credit-repair advice.</p>
        <p>Human review remains required before action.</p>
      </div>
    </footer>
  );
}
