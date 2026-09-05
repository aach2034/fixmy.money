import { PLANS_LIST } from '@/lib/stripe/plans';

export const acquisitionUpdatedAt = '2026-08-27';

export const pricingSummary = PLANS_LIST.map(plan => ({
  name: plan.name,
  id: plan.id,
  price: plan.monthlyPrice,
  description: plan.description,
  features: plan.features.slice(0, 5),
}));

export const consumerTools = [
  {
    slug: 'credit-utilization-calculator',
    name: 'Credit Utilization Calculator',
    description: 'Estimate card utilization and see how reported balances compare with available limits.',
    cta: 'Organize My Full Report',
    href: '/signup?plan=starter&utm_source=free_tools&utm_medium=tool&utm_campaign=credit_utilization',
  },
  {
    slug: 'fcra-dispute-deadline-calculator',
    name: 'FCRA Dispute Deadline Calculator',
    description: 'Estimate follow-up dates from a dispute mailing or submission date. Use counsel for legal deadlines.',
    cta: 'Track Dispute Activity',
    href: '/signup?plan=starter&utm_source=free_tools&utm_medium=tool&utm_campaign=fcra_deadlines',
  },
  {
    slug: 'debt-validation-letter-generator',
    name: 'Debt Validation Letter Generator',
    description: 'Draft a starter debt-validation letter from your own facts and review it before sending.',
    cta: 'Generate and Organize Letters',
    href: '/signup?plan=starter&utm_source=free_tools&utm_medium=tool&utm_campaign=debt_validation',
  },
  {
    slug: 'credit-report-error-checklist',
    name: 'Credit Report Error Checklist',
    description: 'Review common identity, balance, status, duplicate-account, and date issues to investigate.',
    cta: 'Upload a Report',
    href: '/credit-report-import?utm_source=free_tools&utm_medium=tool&utm_campaign=error_checklist',
  },
  {
    slug: 'dispute-letter-generator',
    name: 'Dispute Letter Generator',
    description: 'Prepare dispute correspondence from verified report details and supporting information.',
    cta: 'Use the Guided Workflow',
    href: '/signup?plan=starter&utm_source=free_tools&utm_medium=tool&utm_campaign=letter_generator',
  },
];

export const creatorPages: Record<string, {
  name: string;
  headline: string;
  offer: string;
  ref: string;
  audience: 'consumer' | 'professional';
}> = {
  creator123: {
    name: 'Creator Partner',
    headline: 'A guided credit-report workflow for people who want to take action themselves.',
    offer: 'Start with the analyzer, then keep your letters and dispute activity organized.',
    ref: 'creator123',
    audience: 'consumer',
  },
  mortgage: {
    name: 'Mortgage Readiness Partner',
    headline: 'Help applicants review possible credit-report issues before the next milestone.',
    offer: 'A compliance-friendly borrower handoff path with referral tracking.',
    ref: 'mortgage',
    audience: 'professional',
  },
};

export const seoTopics = [
  {
    slug: 'how-to-dispute-a-collection',
    title: 'How to Dispute a Collection on Your Credit Report',
    intent: 'Understand what to verify before disputing a collection account.',
    toolSlug: 'debt-validation-letter-generator',
    sections: [
      'Check the collector name, account number, balance, dates, and bureau reporting before deciding what to dispute.',
      'Look for potential issues such as an account you do not recognize, a balance that does not match your records, duplicate collection entries, or missing notices.',
      'Keep copies of your report, correspondence, mailing proof, and any response so your next step is based on the record.',
    ],
  },
  {
    slug: 'how-to-dispute-a-charge-off',
    title: 'How to Dispute a Charge-Off',
    intent: 'Review charge-off reporting for possible factual errors.',
    toolSlug: 'credit-report-error-checklist',
    sections: [
      'A charge-off can still report if it is accurate, so start by checking whether the creditor, balance, status, and dates match your documentation.',
      'Potential issues can include wrong account ownership, incorrect payment status, duplicated reporting, or dates that do not align with the account history.',
      'Use software to organize the evidence before generating correspondence from your own verified facts.',
    ],
  },
  {
    slug: 'duplicate-collection-on-credit-report',
    title: 'Duplicate Collection on a Credit Report',
    intent: 'Identify whether two collection entries may refer to the same debt.',
    toolSlug: 'credit-report-error-checklist',
    sections: [
      'Compare original creditor, collector, account number fragments, balance, dates, and bureau placement.',
      'Two similar entries are not automatically duplicates; debt assignment and sale history can affect reporting.',
      'Document the overlap clearly before asking a bureau or furnisher to investigate.',
    ],
  },
  {
    slug: 'wrong-balance-on-credit-report',
    title: 'Wrong Balance on a Credit Report',
    intent: 'Investigate balances that appear inconsistent or outdated.',
    toolSlug: 'credit-utilization-calculator',
    sections: [
      'Check the report date and last-reported date before assuming a balance is wrong.',
      'Compare statements, payoff letters, payment confirmations, and bureau-specific values.',
      'A good dispute workflow keeps the reported value and your supporting document side by side.',
    ],
  },
  {
    slug: 'account-incorrectly-reported-late',
    title: 'Account Incorrectly Reported Late',
    intent: 'Prepare evidence for a late-payment reporting review.',
    toolSlug: 'fcra-dispute-deadline-calculator',
    sections: [
      'Review the month reported late, payment due date, payment posting date, and any hardship or correction records.',
      'Check whether all bureaus report the same late month or whether only one bureau differs.',
      'Use precise dates and supporting records; avoid broad claims that are not tied to the account history.',
    ],
  },
  {
    slug: 'credit-account-not-mine',
    title: 'Credit Account Not Mine',
    intent: 'Organize identity and account evidence for an account you do not recognize.',
    toolSlug: 'credit-report-error-checklist',
    sections: [
      'Start by checking names, addresses, account opening date, creditor, and any identity-theft documentation.',
      'Collect police reports, FTC identity-theft reports, account correspondence, or proof of address when relevant.',
      'Keep correspondence factual and source-backed so each statement can be verified.',
    ],
  },
  {
    slug: 'hard-inquiry-dispute',
    title: 'Hard Inquiry Dispute',
    intent: 'Review whether a hard inquiry was authorized or recognizable.',
    toolSlug: 'credit-report-error-checklist',
    sections: [
      'Identify the company, inquiry date, bureau, and any related application or prequalification activity.',
      'Some inquiries can be legitimate even if the displayed company name is unfamiliar, so research the furnisher name before disputing.',
      'Track inquiry dates and responses in one place to avoid repeat or unsupported letters.',
    ],
  },
  {
    slug: 'transunion-dispute',
    title: 'TransUnion Dispute Process',
    intent: 'Prepare a TransUnion-specific dispute workflow.',
    toolSlug: 'fcra-dispute-deadline-calculator',
    sections: [
      'Use the source report to identify the TransUnion account fields you want investigated.',
      'Keep copies of submissions, mailing proof if sent by mail, and responses.',
      'FixMy.Money helps organize the workflow, but you remain in control of the action taken.',
    ],
  },
  {
    slug: 'equifax-dispute',
    title: 'Equifax Dispute Process',
    intent: 'Prepare an Equifax-specific dispute workflow.',
    toolSlug: 'fcra-dispute-deadline-calculator',
    sections: [
      'Check Equifax-specific values instead of assuming all bureaus report the same account data.',
      'Document the exact field and supporting evidence before generating correspondence.',
      'Track response dates and next steps so follow-up is based on the actual record.',
    ],
  },
  {
    slug: 'experian-dispute',
    title: 'Experian Dispute Process',
    intent: 'Prepare an Experian-specific dispute workflow.',
    toolSlug: 'fcra-dispute-deadline-calculator',
    sections: [
      'Review Experian account details, dates, remarks, and inquiry data from the source report.',
      'Use supporting documents that address the specific fact being questioned.',
      'Keep each dispute round organized with its source report, letter, delivery, and response.',
    ],
  },
  {
    slug: 'fcra-dispute-process',
    title: 'FCRA Dispute Process',
    intent: 'Understand the basic credit-report dispute workflow under the FCRA.',
    toolSlug: 'fcra-dispute-deadline-calculator',
    sections: [
      'The FCRA gives consumers rights to dispute information they believe is incomplete or inaccurate.',
      'A practical workflow includes report review, evidence collection, correspondence, delivery tracking, response review, and follow-up.',
      'This page is educational, not legal advice; consult qualified counsel for legal questions.',
    ],
  },
  {
    slug: 'debt-validation-letter',
    title: 'Debt Validation Letter',
    intent: 'Draft a debt-validation letter from your own facts.',
    toolSlug: 'debt-validation-letter-generator',
    sections: [
      'Debt validation correspondence should identify the collector, account reference, and request clearly.',
      'Do not include unsupported statements or sensitive documents that are not needed for the request.',
      'Use FixMy.Money to keep drafts, supporting information, and follow-up activity organized.',
    ],
  },
  {
    slug: 'credit-report-error-checklist',
    title: 'Credit Report Error Checklist',
    intent: 'Review common credit-report issues before deciding what to dispute.',
    toolSlug: 'credit-report-error-checklist',
    sections: [
      'Check identity information, account ownership, balances, payment status, duplicate accounts, dates, inquiries, and public records.',
      'Mark only items with a specific potential issue and keep supporting records close to the item.',
      'A checklist is a starting point; the strongest workflow connects every action to evidence.',
    ],
  },
];

export function getSeoTopic(slug: string) {
  return seoTopics.find(topic => topic.slug === slug);
}
