import AppLayout from '@/components/AppLayout';
import KnowledgeBaseContent from './components/KnowledgeBaseContent';

export const metadata = {
  title: 'Credit Repair Software Knowledge Base | FixMy.Money',
  description: 'Learn how to use Fix My Money. Guides, tutorials, and best practices for credit repair agencies.',
  alternates: { canonical: 'https://fixmy.money/knowledge-base' },
};

export default function KnowledgeBasePage() {
  return (
    <AppLayout>
      <KnowledgeBaseContent />
    </AppLayout>
  );
}
