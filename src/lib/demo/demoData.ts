/**
 * DEMO MODE SYNTHETIC DATA FIXTURES
 * 
 * All data is completely fictional. No real SSNs, account numbers, or consumer data.
 * This file is static — it never queries production database records.
 */

export const DEMO_AGENCY = {
  id: 'demo-agency-001',
  name: 'Northstar Credit Solutions',
  subtitle: 'Demo Workspace',
  owner: 'Alex Northstar',
  email: 'demo@northstarcredit.example',
  phone: '(555) 010-0100',
  website: 'northstarcredit.example',
  plan: 'Agency',
  memberSince: 'January 2025',
  totalClients: 5,
  activeDisputes: 12,
  lettersGenerated: 47,
  itemsRemoved: 23,
};

export const DEMO_CLIENTS = [
  {
    id: 'demo-client-001',
    name: 'Jordan Bennett',
    email: 'jordan.bennett@example.invalid',
    phone: '(555) 100-0001',
    ssn: 'XXX-XX-1234',
    dob: 'March 15, 1988',
    address: '123 Maple Street, Austin, TX 78701',
    status: 'active',
    stage: 'Disputes',
    startDate: 'February 1, 2026',
    creditScore: { equifax: 612, experian: 608, transunion: 619 },
    initialScore: { equifax: 571, experian: 568, transunion: 574 },
    improvement: 41,
    activeDisputes: 4,
    completedRounds: 2,
    billingStatus: 'eligible',
    monthlyFee: 129,
    tags: ['Priority', 'Round 3'],
  },
  {
    id: 'demo-client-002',
    name: 'Taylor Brooks',
    email: 'taylor.brooks@example.invalid',
    phone: '(555) 100-0002',
    ssn: 'XXX-XX-5678',
    dob: 'July 22, 1992',
    address: '456 Oak Avenue, Denver, CO 80201',
    status: 'active',
    stage: 'Monitoring',
    startDate: 'January 15, 2026',
    creditScore: { equifax: 688, experian: 692, transunion: 685 },
    initialScore: { equifax: 631, experian: 628, transunion: 634 },
    improvement: 58,
    activeDisputes: 1,
    completedRounds: 3,
    billingStatus: 'eligible',
    monthlyFee: 129,
    tags: ['Monitoring Phase'],
  },
  {
    id: 'demo-client-003',
    name: 'Morgan Ellis',
    email: 'morgan.ellis@example.invalid',
    phone: '(555) 100-0003',
    ssn: 'XXX-XX-9012',
    dob: 'November 8, 1985',
    address: '789 Pine Road, Nashville, TN 37201',
    status: 'active',
    stage: 'Active Client',
    startDate: 'March 1, 2026',
    creditScore: { equifax: 554, experian: 549, transunion: 558 },
    initialScore: { equifax: 554, experian: 549, transunion: 558 },
    improvement: 0,
    activeDisputes: 6,
    completedRounds: 1,
    billingStatus: 'pending',
    monthlyFee: 129,
    tags: ['New Client', 'Round 1'],
  },
  {
    id: 'demo-client-004',
    name: 'Cameron Reed',
    email: 'cameron.reed@example.invalid',
    phone: '(555) 100-0004',
    ssn: 'XXX-XX-3456',
    dob: 'April 30, 1979',
    address: '321 Elm Boulevard, Phoenix, AZ 85001',
    status: 'completed',
    stage: 'Completed',
    startDate: 'September 1, 2025',
    creditScore: { equifax: 724, experian: 718, transunion: 721 },
    initialScore: { equifax: 601, experian: 598, transunion: 604 },
    improvement: 120,
    activeDisputes: 0,
    completedRounds: 5,
    billingStatus: 'completed',
    monthlyFee: 129,
    tags: ['Completed', 'Success Story'],
  },
  {
    id: 'demo-client-005',
    name: 'Avery Monroe',
    email: 'avery.monroe@example.invalid',
    phone: '(555) 100-0005',
    ssn: 'XXX-XX-7890',
    dob: 'August 14, 1995',
    address: '654 Cedar Lane, Charlotte, NC 28201',
    status: 'onboarding',
    stage: 'Agreement',
    startDate: 'June 20, 2026',
    creditScore: { equifax: 0, experian: 0, transunion: 0 },
    initialScore: { equifax: 0, experian: 0, transunion: 0 },
    improvement: 0,
    activeDisputes: 0,
    completedRounds: 0,
    billingStatus: 'not_started',
    monthlyFee: 129,
    tags: ['Onboarding'],
  },
];

export const DEMO_DISPUTES = [
  { id: 'demo-disp-001', clientId: 'demo-client-001', clientName: 'Jordan Bennett', bureau: 'Equifax', account: 'Capital One — Acct ending XXXX-1234', reason: 'Account not mine', status: 'pending_response', round: 3, sentDate: 'May 15, 2026', dueDate: 'June 14, 2026' },
  { id: 'demo-disp-002', clientId: 'demo-client-001', clientName: 'Jordan Bennett', bureau: 'Experian', account: 'Midland Funding — Collection XXXX-5678', reason: 'Inaccurate information', status: 'pending_response', round: 3, sentDate: 'May 15, 2026', dueDate: 'June 14, 2026' },
  { id: 'demo-disp-003', clientId: 'demo-client-001', clientName: 'Jordan Bennett', bureau: 'TransUnion', account: 'Synchrony Bank — Acct ending XXXX-9012', reason: 'Balance incorrect', status: 'resolved', round: 2, sentDate: 'April 1, 2026', dueDate: 'May 1, 2026' },
  { id: 'demo-disp-004', clientId: 'demo-client-002', clientName: 'Taylor Brooks', bureau: 'Equifax', account: 'Portfolio Recovery — Collection XXXX-3456', reason: 'Statute of limitations expired', status: 'resolved', round: 3, sentDate: 'March 20, 2026', dueDate: 'April 19, 2026' },
  { id: 'demo-disp-005', clientId: 'demo-client-003', clientName: 'Morgan Ellis', bureau: 'Experian', account: 'LVNV Funding — Collection XXXX-7890', reason: 'Cannot verify debt', status: 'in_progress', round: 1, sentDate: 'June 1, 2026', dueDate: 'July 1, 2026' },
  { id: 'demo-disp-006', clientId: 'demo-client-003', clientName: 'Morgan Ellis', bureau: 'TransUnion', account: 'Comenity Bank — Acct ending XXXX-2345', reason: 'Late payment — never late', status: 'in_progress', round: 1, sentDate: 'June 1, 2026', dueDate: 'July 1, 2026' },
];

export const DEMO_LETTERS = [
  { id: 'demo-letter-001', clientId: 'demo-client-001', clientName: 'Jordan Bennett', bureau: 'Equifax', type: 'Initial Dispute', status: 'sent', createdDate: 'February 10, 2026', sentDate: 'February 12, 2026', round: 1 },
  { id: 'demo-letter-002', clientId: 'demo-client-001', clientName: 'Jordan Bennett', bureau: 'Experian', type: 'Follow-Up Dispute', status: 'sent', createdDate: 'April 1, 2026', sentDate: 'April 3, 2026', round: 2 },
  { id: 'demo-letter-003', clientId: 'demo-client-002', clientName: 'Taylor Brooks', bureau: 'TransUnion', type: 'Debt Validation', status: 'sent', createdDate: 'January 20, 2026', sentDate: 'January 22, 2026', round: 1 },
  { id: 'demo-letter-004', clientId: 'demo-client-003', clientName: 'Morgan Ellis', bureau: 'Equifax', type: 'Initial Dispute', status: 'draft', createdDate: 'June 18, 2026', sentDate: null, round: 1 },
];

export const DEMO_DOCUMENTS = [
  { id: 'demo-doc-001', clientId: 'demo-client-001', clientName: 'Jordan Bennett', name: 'Credit Report — Equifax — Feb 2026', type: 'credit_report', uploadDate: 'February 5, 2026', size: '1.2 MB' },
  { id: 'demo-doc-002', clientId: 'demo-client-001', clientName: 'Jordan Bennett', name: 'Service Agreement — Signed', type: 'agreement', uploadDate: 'February 1, 2026', size: '245 KB' },
  { id: 'demo-doc-003', clientId: 'demo-client-002', clientName: 'Taylor Brooks', name: 'Credit Report — Experian — Jan 2026', type: 'credit_report', uploadDate: 'January 16, 2026', size: '980 KB' },
  { id: 'demo-doc-004', clientId: 'demo-client-003', clientName: 'Morgan Ellis', name: 'Client Intake Form', type: 'intake', uploadDate: 'March 2, 2026', size: '128 KB' },
];

export const DEMO_AUDIT_LOG = [
  { id: 'demo-audit-001', timestamp: '2026-06-20 14:32:11', user: 'Alex Northstar', action: 'Client onboarded', details: 'Avery Monroe added to workspace', category: 'client' },
  { id: 'demo-audit-002', timestamp: '2026-06-18 10:15:44', user: 'Alex Northstar', action: 'Dispute letter sent', details: 'Round 3 letter sent to Equifax for Jordan Bennett', category: 'dispute' },
  { id: 'demo-audit-003', timestamp: '2026-06-15 09:02:33', user: 'Alex Northstar', action: 'Credit report uploaded', details: 'Equifax report uploaded for Morgan Ellis', category: 'document' },
  { id: 'demo-audit-004', timestamp: '2026-06-10 16:45:22', user: 'Alex Northstar', action: 'Invoice generated', details: 'Monthly invoice for Taylor Brooks — $129.00', category: 'billing' },
  { id: 'demo-audit-005', timestamp: '2026-06-05 11:30:00', user: 'Alex Northstar', action: 'Dispute resolved', details: 'Portfolio Recovery collection removed — Taylor Brooks', category: 'dispute' },
  { id: 'demo-audit-006', timestamp: '2026-06-01 08:00:00', user: 'System', action: 'Dispute letters generated', details: 'Round 1 letters generated for Morgan Ellis (6 items)', category: 'dispute' },
];

export const DEMO_ANALYTICS = {
  totalClients: 5,
  activeClients: 3,
  completedClients: 1,
  onboardingClients: 1,
  totalDisputes: 12,
  resolvedDisputes: 8,
  pendingDisputes: 4,
  lettersGenerated: 47,
  itemsRemoved: 23,
  avgScoreImprovement: 55,
  monthlyRevenue: 516,
  totalRevenue: 3612,
  conversionRate: 80,
  avgTimeToCompletion: '4.2 months',
  bureauBreakdown: [
    { bureau: 'Equifax', disputes: 18, resolved: 12 },
    { bureau: 'Experian', disputes: 16, resolved: 10 },
    { bureau: 'TransUnion', disputes: 13, resolved: 8 },
  ],
  monthlyActivity: [
    { month: 'Jan', disputes: 8, resolved: 5, newClients: 1 },
    { month: 'Feb', disputes: 12, resolved: 7, newClients: 1 },
    { month: 'Mar', disputes: 10, resolved: 8, newClients: 1 },
    { month: 'Apr', disputes: 9, resolved: 6, newClients: 0 },
    { month: 'May', disputes: 11, resolved: 9, newClients: 0 },
    { month: 'Jun', disputes: 7, resolved: 3, newClients: 1 },
  ],
};

export const DEMO_TEAM = [
  { id: 'demo-team-001', name: 'Alex Northstar', role: 'Owner', email: 'alex@northstarcredit.example', status: 'active', joinDate: 'January 2025' },
  { id: 'demo-team-002', name: 'Sam Rivera', role: 'Staff', email: 'sam@northstarcredit.example', status: 'active', joinDate: 'March 2025' },
  { id: 'demo-team-003', name: 'Jamie Chen', role: 'Staff', email: 'jamie@northstarcredit.example', status: 'active', joinDate: 'May 2025' },
];

export const DEMO_INVOICES = [
  { id: 'demo-inv-001', clientId: 'demo-client-001', clientName: 'Jordan Bennett', amount: 129, status: 'paid', date: 'June 1, 2026', dueDate: 'June 15, 2026', description: 'Monthly service fee — June 2026' },
  { id: 'demo-inv-002', clientId: 'demo-client-002', clientName: 'Taylor Brooks', amount: 129, status: 'paid', date: 'June 1, 2026', dueDate: 'June 15, 2026', description: 'Monthly service fee — June 2026' },
  { id: 'demo-inv-003', clientId: 'demo-client-003', clientName: 'Morgan Ellis', amount: 129, status: 'pending', date: 'June 1, 2026', dueDate: 'June 15, 2026', description: 'Monthly service fee — June 2026' },
  { id: 'demo-inv-004', clientId: 'demo-client-004', clientName: 'Cameron Reed', amount: 129, status: 'paid', date: 'May 1, 2026', dueDate: 'May 15, 2026', description: 'Final service fee — May 2026' },
];

export const DEMO_CROA_STAGES = [
  { stage: 'Lead', status: 'completed', date: 'January 15, 2026', notes: 'Initial inquiry received via website' },
  { stage: 'Disclosure', status: 'completed', date: 'January 16, 2026', notes: 'CROA disclosure delivered and acknowledged' },
  { stage: 'Agreement', status: 'completed', date: 'January 18, 2026', notes: 'Service agreement signed by client' },
  { stage: 'Cancellation Period', status: 'completed', date: 'January 21, 2026', notes: '3-day cancellation window expired without cancellation' },
  { stage: 'Active Client', status: 'completed', date: 'January 22, 2026', notes: 'Client activated — credit reports ordered' },
  { stage: 'Disputes', status: 'in_progress', date: 'February 1, 2026', notes: 'Round 3 disputes in progress' },
  { stage: 'Monitoring', status: 'pending', date: null, notes: null },
  { stage: 'Completed', status: 'pending', date: null, notes: null },
];
