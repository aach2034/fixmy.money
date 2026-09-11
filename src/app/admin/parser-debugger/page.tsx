import AppLayout from '@/components/AppLayout';
import ParserDebuggerContent from './components/ParserDebuggerContent';
import { requirePlatformAdmin } from '@/lib/admin/authorization';

export default async function ParserDebuggerPage() {
  await requirePlatformAdmin();
  return (
    <AppLayout>
      <ParserDebuggerContent />
    </AppLayout>
  );
}
