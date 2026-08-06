export type ComparisonPage = {
  slug: string;
  kind: 'alternative' | 'versus' | 'guide' | 'migration';
  title: string;
  eyebrow: string;
  description: string;
  competitor?: string;
  suitedFor: string;
  pricing: string;
  source?: string;
  sourceLabel?: string;
  differences: string[];
  migration: string[];
};

const verified = 'Pricing checked August 6, 2026. Prices can change; confirm on the vendor’s site.';

const vendors = {
  'credit-repair-cloud': {
    name: 'Credit Repair Cloud',
    pricing: '$49/month Personal; business plans start at $179/month. Annual billing is advertised at 20% off.',
    source: 'https://www.creditrepaircloud.com/pricing',
    suitedFor: 'Agencies that want a long-established platform with lead capture, dispute tools, client access, billing, and a broad education ecosystem.',
    differences: ['FixMy.Money centers each case on source-linked evidence and named human verification.', 'FixMy.Money Start is $99/month for up to 300 active clients; Credit Repair Cloud Start is publicly listed at $179/month.', 'Both products publicly document report imports, client workflows, dispute tools, billing, and client access.'],
  },
  disputefox: {
    name: 'DisputeFox',
    pricing: 'DisputeFox publicly lists a 30-day free trial and a Scaling tier at $499/month for 10 users and up to 2,000 clients. Lower-tier pricing was not captured in the public page reviewed.',
    source: 'https://www.disputefox.com/pricing',
    suitedFor: 'Agencies prioritizing a white-label portal, branded mobile experience, integrated billing, print-and-mail, SMS, and high client limits.',
    differences: ['FixMy.Money emphasizes evidence provenance, source-page review, and explicit approval before a dispute moves forward.', 'DisputeFox publicly documents mobile branding, Twilio SMS, print-and-mail, Zapier, and commission tracking.', 'Where a DisputeFox capability or tier price is not stated on its public pricing page, this comparison marks it not publicly documented.'],
  },
  scoreceo: {
    name: 'ScoreCEO',
    pricing: 'Monthly plans are publicly listed at $149 Kickstart, $199 Essential, and $299 Advanced; Executive pricing requires a call.',
    source: 'https://scoreceo.com/plans-pricing-of-scoreceo-credit-repair-software/',
    suitedFor: 'Agencies seeking extensive sales, marketing, contract, integration, and customizable workflow capabilities in one platform.',
    differences: ['FixMy.Money leads with source-linked evidence, named verification, and approval history.', 'ScoreCEO publicly documents a wider named integration catalog and configurable sales/marketing workflows.', 'FixMy.Money Start is $99/month for up to 300 active clients; ScoreCEO Kickstart is $149/month for up to 50 active clients.'],
  },
  disputepanda: {
    name: 'Dispute Panda',
    pricing: '$1 for 14 days, then $197/month; annual pricing is publicly listed at $1,970.',
    source: 'https://disputepanda.com/',
    suitedFor: 'Operators focused primarily on fast AI-assisted, factual and Metro 2 letter generation.',
    differences: ['FixMy.Money is an agency operating workspace spanning clients, evidence review, approvals, billing, and outcomes.', 'Dispute Panda prominently positions AI-powered unique letter generation and faster dispute processing.', 'Features outside Dispute Panda’s public site description are treated as not publicly documented.'],
  },
  disputebee: {
    name: 'DisputeBee',
    pricing: '$49/month Individual and $129/month Business.',
    source: 'https://disputebee.com/',
    suitedFor: 'Individuals and agencies that want a straightforward report-to-letter workflow with bulk letters and unlimited clients on Business.',
    differences: ['FixMy.Money adds a visible verification and approval layer between analysis and dispute creation.', 'DisputeBee publicly documents unlimited clients and team members, bulk letters, mail API, e-contracts, Zapier, client billing, and a portal on Business.', 'FixMy.Money emphasizes traceable outcomes and source provenance across a case timeline.'],
  },
  'client-dispute-manager': {
    name: 'Client Dispute Manager',
    pricing: 'Monthly plans are publicly listed at $107 Starting, $169 Growing, and $329 Enterprise.',
    source: 'https://clientdisputemanagersoftware.com/pricing/',
    suitedFor: 'Agencies that value built-in training, masterminds, structured dispute playbooks, and a broad business operating suite.',
    differences: ['FixMy.Money Start is $99/month and centers the workflow on evidence review and named approval.', 'Client Dispute Manager publicly documents certifications, training, dispute playbooks, AI and Metro 2 workflows, CRM, billing, and portals.', 'FixMy.Money keeps source facts, reviewer decisions, delivery, responses, and outcomes in one traceable chain.'],
  },
  'credit-admiral': {
    name: 'Credit Admiral',
    pricing: 'Monthly plans are publicly listed at $199 for 250 clients, $299 for 500, $399 for 1,000, and $599 for 2,000.',
    source: 'https://creditadmiral.com/pricing/',
    suitedFor: 'Established agencies that specifically need built-in arbitration workflows, automated billing, print-and-mail, and a mobile app.',
    differences: ['Credit Admiral publicly documents arbitration, notary, debt-settlement, mobile-app, and furnisher-contact capabilities.', 'FixMy.Money focuses on source-linked evidence, named verification, human approval, and traceable bureau outcomes.', 'FixMy.Money Start is $99/month for up to 300 active clients; Credit Admiral starts at $199/month for up to 250.'],
  },
} as const;

const standardMigration = ['Export active and archived clients from your current platform.', 'Collect documents, dispute histories, templates, billing status, and open deadlines.', 'Map the export to the FixMy.Money CSV template and run a test import.', 'Verify client counts, documents, open rounds, and next actions before cutover.', 'Keep the old system read-only during a 30-day parallel-access period.'];

export const comparisonPages: Record<string, ComparisonPage> = {};

for (const [key, vendor] of Object.entries(vendors)) {
  const slug = `${key}-alternative`;
  comparisonPages[slug] = {
    slug, kind: 'alternative', competitor: vendor.name, eyebrow: `${vendor.name} alternative`,
    title: `A ${vendor.name} alternative built around verifiable evidence.`,
    description: `Compare ${vendor.name} with FixMy.Money using public pricing, documented capabilities, workflow differences, and a practical migration plan.`,
    suitedFor: vendor.suitedFor, pricing: `${vendor.pricing} ${verified}`, source: vendor.source, sourceLabel: `${vendor.name} official pricing`, differences: [...vendor.differences], migration: standardMigration,
  };
}

const versus = [
  ['fixmy-money-vs-credit-repair-cloud', 'Credit Repair Cloud'],
  ['fixmy-money-vs-disputefox', 'DisputeFox'],
  ['fixmy-money-vs-scoreceo', 'ScoreCEO'],
  ['fixmy-money-vs-dispute-panda', 'Dispute Panda'],
] as const;
for (const [slug, name] of versus) {
  const key = Object.keys(vendors).find(k => vendors[k as keyof typeof vendors].name === name)! as keyof typeof vendors;
  const vendor = vendors[key];
  comparisonPages[slug] = { slug, kind: 'versus', competitor: name, eyebrow: `FixMy.Money vs ${name}`, title: `FixMy.Money vs ${name}: choose the workflow that fits your agency.`, description: `A factual comparison of pricing, audience, documented features, evidence review, and migration considerations.`, suitedFor: vendor.suitedFor, pricing: `${vendor.pricing} ${verified}`, source: vendor.source, sourceLabel: `${name} official pricing`, differences: [...vendor.differences], migration: standardMigration };
}

comparisonPages['credit-repair-cloud-vs-disputefox-vs-fixmy-money'] = {
  slug: 'credit-repair-cloud-vs-disputefox-vs-fixmy-money', kind: 'versus', eyebrow: 'Three-way comparison',
  title: 'Credit Repair Cloud vs DisputeFox vs FixMy.Money', description: 'Compare three agency platforms by operating style—not by an endless checklist.',
  suitedFor: 'Credit Repair Cloud suits buyers seeking an established all-in-one ecosystem. DisputeFox suits agencies prioritizing branding, communications, and scale. FixMy.Money suits teams that want evidence review and accountable approvals at the center.',
  pricing: `Credit Repair Cloud business plans start at $179/month. DisputeFox publicly lists Scaling at $499/month; complete lower-tier pricing was not captured. FixMy.Money Start is $99/month. ${verified}`,
  differences: ['Choose Credit Repair Cloud for its long-established ecosystem and broad agency toolset.', 'Choose DisputeFox when branded client experiences, communications, and high limits are central.', 'Choose FixMy.Money when source-linked evidence, named review, approval, and traceable outcomes matter most.'], migration: standardMigration,
};

const guides = [
  ['best-credit-repair-software-for-solo-operators', 'Best credit-repair software for solo operators', 'Solo buyers should prioritize a fast learning curve, affordable entry price, report imports, a client portal, billing, and a workflow that does not require extra staff.'],
  ['best-credit-repair-software-under-150-per-month', 'Best credit-repair software under $150 per month', 'Compare the real operating limits below $150—not just headline prices. Client caps, users, storage, billing, report imports, and review controls determine value.'],
  ['best-evidence-based-credit-dispute-software', 'Best evidence-based credit-dispute software', 'Evidence-based software should preserve the source, separate a suspected issue from a verified fact, record who approved it, and connect the decision to the eventual outcome.'],
] as const;
for (const [slug, title, suitedFor] of guides) comparisonPages[slug] = { slug, kind: 'guide', eyebrow: 'Buyer guide', title, description: 'A practical selection guide for credit-repair agencies comparing software by workflow, documented capability, and cost.', suitedFor, pricing: `FixMy.Money plans are $39, $99, and $199 per month. Competitor prices referenced on this site are verified against public vendor pages and dated.`, differences: ['Start with the operating constraint you need to solve.', 'Confirm each must-have on the vendor’s current plan page or in a live demo.', 'Run the same sample client through every shortlisted product before migrating.'], migration: standardMigration };

comparisonPages.switch = {
  slug: 'switch', kind: 'migration', eyebrow: 'Switch to FixMy.Money', title: 'Move platforms without leaving a client behind.', description: 'A guided migration package for agencies moving clients, documents, dispute history, templates, and workflow settings.', suitedFor: 'Agencies moving from Credit Repair Cloud, DisputeFox, ScoreCEO, Dispute Panda, DisputeBee, Client Dispute Manager, Credit Admiral, or spreadsheets.', pricing: 'Migration support is included with eligible agency onboarding. Final scope and promotional terms are confirmed before work begins.', differences: ['Free assisted migration', '30-day parallel-access plan', 'CSV import templates', 'Live onboarding session', 'No-client-left-behind verification report'], migration: standardMigration,
};

const painGuides = [
  ['how-to-automate-credit-report-review', 'How to automate credit-report review', 'Automate extraction, comparison, routing, and reminders—but require a person to verify every source-linked finding before it becomes a dispute assertion.'],
  ['credit-repair-agency-onboarding-checklist', 'Credit-repair agency onboarding checklist', 'Collect identity, authorization, agreements, reports, goals, billing status, communication preferences, and the first documented review assignment.'],
  ['how-to-track-bureau-response-deadlines', 'How to track bureau response deadlines', 'Record the delivery event, calculate the expected response window, assign an owner, preserve incoming correspondence, and escalate overdue cases without overwriting history.'],
  ['croa-billing-workflow', 'CROA billing workflow', 'Separate software configuration from legal judgment. Document agreements, service events, invoices, payment attempts, and exceptions; have qualified counsel review the workflow for your channels and jurisdictions.'],
  ['credit-repair-audit-log-requirements', 'Credit-repair audit-log requirements', 'A useful audit history records who changed what, when it changed, the prior state, the linked client and dispute, and the source or authorization supporting the decision.'],
  ['how-to-document-dispute-authorization', 'How to document dispute authorization', 'Capture the authorization artifact, signer, date, scope, related client, reviewer, version, and any later revocation in a record your team can retrieve.'],
  ['credit-repair-client-portal-software-guide', 'Credit-repair client portal software', 'Evaluate secure uploads, progress visibility, messaging, agreements, billing, mobile usability, branding, access controls, and the boundary between client-visible and internal notes.'],
  ['credit-repair-crm-with-stripe-guide', 'Credit-repair CRM with Stripe', 'Connect customers, subscriptions, invoices, payment status, and service records without treating the payment processor as the complete client history.'],
  ['how-to-migrate-credit-repair-software', 'How to migrate credit-repair software', 'Inventory data first, export in recoverable formats, map fields, test a small batch, reconcile counts, run both systems briefly, and document the final cutover.'],
  ['credit-repair-cloud-import-problems', 'Credit Repair Cloud import problems: a practical checklist', 'Before blaming the platform, check the report provider, file type, password protection, scan quality, supported parser path, browser session, field mapping, and whether a recent provider format changed.'],
  ['disputefox-pricing-explained', 'DisputeFox pricing explained', 'DisputeFox publicly lists a 30-day trial and a $499/month Scaling tier. Confirm lower-tier prices, add-on users, SMS, mail, and client capacity directly before choosing a plan.'],
] as const;
for (const [slug, title, suitedFor] of painGuides) {
  comparisonPages[slug] = {
    slug, kind: 'guide', eyebrow: 'Agency operations guide', title,
    description: `${suitedFor} A practical, evidence-first guide for credit-repair operators.`, suitedFor,
    pricing: slug === 'disputefox-pricing-explained' ? `${vendors.disputefox.pricing} ${verified}` : 'This guide is educational. Product and service costs depend on the workflow and plan selected.',
    source: slug === 'disputefox-pricing-explained' ? vendors.disputefox.source : undefined,
    sourceLabel: slug === 'disputefox-pricing-explained' ? 'DisputeFox official pricing' : undefined,
    differences: ['Preserve the original source or event.', 'Assign a named owner for verification and follow-up.', 'Keep decisions, approvals, deadlines, and outcomes connected.'],
    migration: standardMigration,
  };
}

export const researchNote = verified;
