import Image from 'next/image';
import Link from 'next/link';

export default function PublicBrandLink({
  compact = false,
  label = 'FixMy.Money home',
}: {
  compact?: boolean;
  label?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={label}
      className="group inline-flex min-h-11 items-center gap-2.5 rounded-xl pr-2 text-[#0b1742] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#267a31]/30"
    >
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#073c34] shadow-[0_8px_18px_rgba(7,60,52,.18)] ring-1 ring-[#073c34]/10 transition-transform duration-200 group-hover:-translate-y-0.5">
        <Image
          src="/assets/images/fixmy-money-mark-v2.png"
          alt=""
          width={36}
          height={36}
          priority
          unoptimized
          className="size-9 object-cover"
        />
      </span>
      <span className={compact ? 'hidden text-[17px] font-extrabold tracking-[-.04em] sm:inline' : 'text-[17px] font-extrabold tracking-[-.04em]'}>
        FixMy<span className="text-[#267a31]">.Money</span>
      </span>
    </Link>
  );
}
