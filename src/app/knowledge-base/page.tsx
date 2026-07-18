import AppLayout from '@/components/AppLayout';
import KnowledgeBaseContent from './components/KnowledgeBaseContent';

export const metadata = {
  title: 'Knowledge Base | Fix My Money',
  description: 'Learn how to use Fix My Money. Guides, tutorials, and best practices for credit repair agencies.',
};

export default function KnowledgeBasePage() {
  return (
    <AppLayout>
      <KnowledgeBaseContent />
    </AppLayout>
  );
}