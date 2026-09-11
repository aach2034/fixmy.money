import type { Metadata } from 'next';
import AdminMfaPanel from '@/app/admin/security/AdminMfaPanel';
import { requirePlatformAdminIdentity } from '@/lib/admin/authorization';

export const metadata: Metadata = {
  title: 'Administrator Verification | FixMy.Money',
  robots: { index: false, follow: false },
};

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  await requirePlatformAdminIdentity();
  const { reason } = await searchParams;
  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-xl">
        <AdminMfaPanel reason={reason} />
      </div>
    </section>
  );
}
