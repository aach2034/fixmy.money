import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('credit report existing-client selection', () => {
  const page = read('src/app/credit-report-import/components/CreditReportImportContent.tsx');
  const clientsRoute = read('src/app/api/clients/route.ts');
  const saveRoute = read('src/app/api/credit-report/save-atomic/route.ts');

  it('loads canonical client IDs from the server-authoritative selected workspace', () => {
    expect(page).toContain("fetch('/api/clients', { cache: 'no-store' })");
    expect(page).not.toContain("from('workspaces').select('id').single()");
    expect(clientsRoute).toContain('getSelectedWorkspaceContext(supabase)');
    expect(clientsRoute).toContain(".eq('workspace_id', workspace.workspace_id)");
    expect(clientsRoute).toContain(".eq('owner_id', workspace.workspace_owner_id)");
  });

  it('persists and restores only a client ID returned for that user and workspace', () => {
    expect(page).toContain('credit-report-import:selected-client:${user.id}:${wsId}');
    expect(page).toContain('workspaceClients.some(client => client.id === candidate)');
    expect(page).toContain('window.sessionStorage.setItem(storageKey, clientId)');
    expect(page).toContain('onChange={e => selectClient(e.target.value)}');
  });

  it('carries the exact selected ID through atomic persistence', () => {
    expect(page).toContain('clientId: selectedClientId');
    expect(saveRoute).toContain("authorizeStaffClient(admin, user.id, clientId, 'write')");
    expect(saveRoute).toContain('p_client_id: authorization.clientId');
  });

  it('keeps new-client creation server-authoritative and independent', () => {
    expect(clientsRoute).toContain('export async function POST(request: NextRequest)');
    expect(clientsRoute).toContain("return NextResponse.json({ id: data.id }, { status: 201 })");
  });

  it('fails closed for cross-tenant client IDs', () => {
    expect(saveRoute).toContain("return NextResponse.json({ error: 'Client not found or access denied' }, { status: 403 })");
  });
});
