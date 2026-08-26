import type { Article } from './articles';

const BASE_URL = 'https://fixmy.money';
const AUTHOR = 'Adam Hamilton';
const AUTHOR_TITLE = 'Founder, FixMy.Money';
const PUBLISHED = 'August 26, 2026';

interface AuditTopic {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  excerpt: string;
  discrepancy: string;
  fields: string[];
  example: string;
  whyItMatters: string;
  consumerChecks: string[];
  softwareAngle: string;
  relatedSlugs: string[];
}

const topics: AuditTopic[] = [
  {
    slug: 'equifax-experian-transunion-disputes',
    title: 'Experian, Equifax, and TransUnion Disputes: What to Compare',
    seoTitle: 'Experian, Equifax, and TransUnion Disputes',
    metaDescription: 'Compare Experian, Equifax, and TransUnion reporting before preparing a dispute, including balances, statuses, dates, and account identifiers.',
    focusKeyword: 'Experian, Equifax, and TransUnion disputes',
    secondaryKeywords: ['credit bureau disputes', 'Equifax dispute', 'Experian dispute', 'TransUnion dispute'],
    excerpt: 'Each bureau can report a tradeline differently. A useful dispute review compares the exact fields each bureau shows before deciding what needs investigation.',
    discrepancy: 'A consumer sees different account information across Experian, Equifax, and TransUnion, such as different balances, statuses, dates, remarks, or account identifiers for what appears to be the same tradeline.',
    fields: ['Bureau', 'Creditor Name', 'Account Number Masked', 'Account Status', 'Current Balance', 'Date Opened', 'Date Closed', 'Last Reported Date'],
    example: 'Experian may report an account as Paid/Closed with a $0 balance while Equifax reports Open with a $1,284 balance and TransUnion does not report the account at all. The review should preserve each bureau’s exact values and dates.',
    whyItMatters: 'Bureau differences can affect the scope of a dispute. The consumer may need to contact one bureau, multiple bureaus, or a furnisher depending on where the inconsistency appears and what evidence supports it.',
    consumerChecks: ['Download or save all three bureau sections from the same report period when possible.', 'Match creditor names and masked account numbers before comparing values.', 'Keep bureau-specific screenshots or PDF pages.', 'Confirm whether the issue is missing data, conflicting data, or stale data.'],
    softwareAngle: 'FixMy.Money keeps bureau-specific tradeline fields visible so reviewers can decide whether a dispute should go to Experian, Equifax, TransUnion, or a furnisher.',
    relatedSlugs: ['conflicting-bureau-balance-information', 'paid-closed-account-showing-balance', 'incorrect-credit-report-dates'],
  },
  {
    slug: 'paid-closed-account-showing-balance',
    title: 'Paid or Closed Account Showing a Balance: What to Check',
    seoTitle: 'Paid or Closed Account Showing a Balance',
    metaDescription: 'Learn why a paid or closed credit account can still show a balance, which report fields to compare, and how to prepare evidence before disputing.',
    focusKeyword: 'Paid or Closed Account Showing a Balance',
    secondaryKeywords: ['paid account with balance', 'closed account reporting balance', 'credit report balance error'],
    excerpt: 'A paid, settled, or closed account with a positive current balance may deserve review. Compare status, balance, dates, and bureau reporting before deciding what to do.',
    discrepancy: 'The account status says the obligation is paid, settled, closed, or otherwise no longer active, while the same tradeline reports a current balance greater than zero.',
    fields: ['Account Status', 'Current Balance', 'Amount Past Due', 'Date Closed', 'Last Reported Date', 'Remarks'],
    example: 'Equifax reports Status: Paid/Closed and Current Balance: $1,284 on the same tradeline. That does not prove the report is wrong by itself, but the status and balance should be investigated together because they describe different account conditions.',
    whyItMatters: 'A positive balance can affect how the account is interpreted by a reviewer, lender, or internal agency workflow. If the balance is stale, assigned incorrectly, or inconsistent with the status, the consumer may need a clearer explanation from the bureau or furnisher.',
    consumerChecks: ['Look for a closing, settlement, or payoff letter.', 'Compare the balance against the most recent statement.', 'Check whether one bureau reports zero while another reports a balance.', 'Confirm the last reported date so an old update is not mistaken for a current claim.'],
    softwareAngle: 'FixMy.Money audits the saved tradeline fields and can surface this issue only when the actual status and balance values are present in the report data. The draft should name the bureau, status, and balance rather than using a generic category label.',
    relatedSlugs: ['credit-report-balance-errors', 'conflicting-bureau-balance-information', 'evidence-for-credit-dispute'],
  },
  {
    slug: 'conflicting-bureau-balance-information',
    title: 'Conflicting Balance Information Across Credit Bureaus',
    seoTitle: 'Conflicting Credit Bureau Balance Information',
    metaDescription: 'See how to compare balance values across Experian, Equifax, and TransUnion and decide whether a bureau discrepancy needs investigation.',
    focusKeyword: 'Conflicting Credit Bureau Balance Information',
    secondaryKeywords: ['credit bureau balance discrepancy', 'Experian Equifax TransUnion balance mismatch', 'credit report balance errors'],
    excerpt: 'Different bureaus may report different account balances. The useful question is whether the values, dates, and statuses conflict in a way that needs review.',
    discrepancy: 'Two or more bureaus report materially different balances for what appears to be the same tradeline, especially when the account identifiers, creditor name, and dates indicate the same obligation.',
    fields: ['Bureau', 'Creditor Name', 'Account Number Masked', 'Current Balance', 'Amount Past Due', 'Last Reported Date', 'Account Status'],
    example: 'Experian reports the account as Paid/Closed with a $0 balance, while TransUnion reports the same creditor and masked account as Closed with a $1,284 balance. The two reports contain different balance values for a tradeline that appears to describe the same account.',
    whyItMatters: 'A bureau mismatch can reflect different reporting dates, delayed updates, or a genuine inconsistency. The dates matter because a newer report may legitimately differ from an older one, while same-period conflicting values may require closer review.',
    consumerChecks: ['Match the creditor and masked account number before comparing balances.', 'Compare the last reported date for each bureau.', 'Check whether past-due amount changed along with current balance.', 'Keep screenshots or report pages showing each bureau value.'],
    softwareAngle: 'FixMy.Money groups likely matching tradelines and keeps bureau-specific values separate, so a reviewer can see both balances and decide whether the difference is meaningful enough to include in a dispute basis.',
    relatedSlugs: ['paid-closed-account-showing-balance', 'credit-report-balance-errors', 'equifax-experian-transunion-disputes'],
  },
  {
    slug: 'credit-report-balance-errors',
    title: 'Credit Report Balance Errors: Fields Consumers Should Compare',
    seoTitle: 'Credit Report Balance Errors and Evidence',
    metaDescription: 'Understand common credit report balance errors, the fields to compare, and the evidence that can support a careful dispute review.',
    focusKeyword: 'Credit Report Balance Errors',
    secondaryKeywords: ['incorrect balance on credit report', 'credit report current balance', 'past due amount error'],
    excerpt: 'Balance errors are easier to review when current balance, past-due amount, account status, and reporting dates are compared together.',
    discrepancy: 'The reported balance, past-due amount, or balance-related status appears inconsistent with another field on the same account or with another bureau’s version of the same tradeline.',
    fields: ['Current Balance', 'High Balance', 'Credit Limit', 'Amount Past Due', 'Account Status', 'Payment Status', 'Last Reported Date'],
    example: 'A report may show Current Balance: $0 and Amount Past Due: $428, or Status: Paid/Closed with Current Balance: $1,284. Either pattern requires the reviewer to preserve the exact values before explaining the issue.',
    whyItMatters: 'Balance fields influence how an account is understood. A stale past-due amount, mismatched status, or inconsistent bureau value can make it harder for a consumer or agency to know what the report is actually saying.',
    consumerChecks: ['Compare balance and past-due fields on the same bureau record.', 'Review statements, settlement confirmations, and payment receipts.', 'Check whether the report date predates the payment.', 'Avoid assuming every balance difference is an error without date context.'],
    softwareAngle: 'FixMy.Money’s audit queue is designed to show the fields side by side. Strong dispute language should cite the actual balance, status, bureau, and date values available from the saved report.',
    relatedSlugs: ['paid-closed-account-showing-balance', 'conflicting-bureau-balance-information', 'evidence-for-credit-dispute'],
  },
  {
    slug: 'duplicate-credit-report-accounts',
    title: 'Duplicate Accounts on a Credit Report: Evidence to Review',
    seoTitle: 'Duplicate Credit Report Accounts: What to Compare',
    metaDescription: 'Learn how to review possible duplicate tradelines by comparing creditor name, account number, dates, balances, status, and bureau reporting.',
    focusKeyword: 'Duplicate Credit Report Accounts',
    secondaryKeywords: ['duplicate tradelines', 'same debt reported twice', 'duplicate collection account'],
    excerpt: 'Possible duplicate accounts should be reviewed carefully. Similar names alone are not enough; compare account references, dates, balances, and ownership details.',
    discrepancy: 'Two tradelines appear to describe the same obligation because key fields overlap, such as creditor name, original creditor, masked account number, balance, dates, and account type.',
    fields: ['Creditor Name', 'Original Creditor', 'Account Number Masked', 'Account Type', 'Date Opened', 'Date Closed', 'Current Balance', 'Remarks'],
    example: 'A report lists 1ST DIGITAL/SYNOVUS/VT twice with the same masked account ending, same date opened, same balance, and similar collection remarks. Those shared fields suggest the records may represent one obligation, but a reviewer should verify before calling them duplicates.',
    whyItMatters: 'Duplicate reporting can make one obligation look like multiple separate accounts. At the same time, transferred or sold accounts can legitimately appear in more than one form, so the evidence must show why the records look duplicative.',
    consumerChecks: ['Compare masked account numbers and original creditor names.', 'Look for transfer, sold, or purchased-by remarks.', 'Check whether one record has a zero balance and another carries the active balance.', 'Preserve both tradelines as separate evidence.'],
    softwareAngle: 'FixMy.Money can group possible duplicates when multiple identifying fields match. The letter should identify the specific duplicate tradelines and the shared fields, not merely state “duplicate reporting.”',
    relatedSlugs: ['evidence-for-credit-dispute', 'credit-report-review-workflow-for-agencies', 'credit-repair-dispute-documentation-checklist'],
  },
  {
    slug: 'incorrect-credit-report-dates',
    title: 'Incorrect Credit Report Dates: Which Fields Matter',
    seoTitle: 'Incorrect Credit Report Dates and Dispute Evidence',
    metaDescription: 'Review Date Opened, Date Closed, Date of First Delinquency, Last Payment Date, and Last Reported Date before disputing credit-report date errors.',
    focusKeyword: 'Incorrect Credit Report Dates',
    secondaryKeywords: ['date opened error', 'date of first delinquency', 'last payment date credit report'],
    excerpt: 'Date errors are not all the same. A careful review names the exact date field, the reported value, and the conflicting value or timeline.',
    discrepancy: 'One date field conflicts with another field, another bureau’s value, or the expected sequence of account events. The exact field name matters because Date Opened and Date of First Delinquency mean different things.',
    fields: ['Date Opened', 'Date Closed', 'Date of First Delinquency', 'Last Payment Date', 'Last Activity Date', 'Last Reported Date'],
    example: 'A tradeline may report Date Closed: March 2024 while also reporting Last Payment Date: July 2025, or one bureau may show Date Opened: 2021 while another shows Date Opened: 2024 for the same masked account.',
    whyItMatters: 'Dates can affect account sequencing, dispute review, aging analysis, and follow-up work. A vague statement that “dates are wrong” is weak; the useful evidence is the precise date field and value that caused the concern.',
    consumerChecks: ['Write down the exact field label from each bureau.', 'Compare dates only after confirming the records describe the same account.', 'Review statements, payoff letters, and bureau responses.', 'Do not substitute one date field for another.'],
    softwareAngle: 'FixMy.Money keeps date fields separate so the audit can describe which field triggered the issue. That reduces the risk of mixing Date Opened, Date Reported, and Date of First Delinquency in a letter.',
    relatedSlugs: ['possible-credit-report-reaging', 'evidence-for-credit-dispute', 'credit-report-review-workflow-for-agencies'],
  },
  {
    slug: 'possible-credit-report-reaging',
    title: 'Possible Credit Report Re-Aging: Signals to Review',
    seoTitle: 'Possible Credit Report Re-Aging Indicators',
    metaDescription: 'Learn what possible credit-report re-aging can look like and why Date of First Delinquency, status dates, and reporting dates must be reviewed carefully.',
    focusKeyword: 'Possible Credit Report Re-Aging',
    secondaryKeywords: ['credit report reaging', 'date of first delinquency error', 'collection re-aging indicator'],
    excerpt: 'Possible re-aging is a serious-sounding issue, but it should be reviewed through specific date fields and source evidence rather than assumptions.',
    discrepancy: 'A later activity, reporting, or collection date appears to be treated as if it changed the older delinquency timeline. The audit signal depends on dates that appear to conflict with the account history.',
    fields: ['Date of First Delinquency', 'Date Opened', 'Date Assigned', 'Last Activity Date', 'Last Reported Date', 'Account Status'],
    example: 'A collection account may show an original delinquency in 2019, but a later collection assignment or report update in 2024 appears beside language suggesting the account recently became delinquent. Those dates should be reviewed together before any conclusion is drawn.',
    whyItMatters: 'Consumers and agencies need to distinguish legitimate updates from date handling that may make an old account appear newer. Because the conclusion can depend on facts outside the report, the letter should state only the actual date conflict visible in the saved data.',
    consumerChecks: ['Find the Date of First Delinquency if it is shown.', 'Compare assignment, opened, last activity, and last reported dates.', 'Review older reports or creditor records if available.', 'Avoid claiming re-aging unless the evidence supports that specific concern.'],
    softwareAngle: 'FixMy.Money can flag a possible re-aging indicator when saved date fields conflict. The system should then show the exact dates and ask for review instead of turning the flag into an unsupported legal conclusion.',
    relatedSlugs: ['incorrect-credit-report-dates', 'evidence-for-credit-dispute', 'credit-repair-dispute-documentation-checklist'],
  },
  {
    slug: 'evidence-for-credit-dispute',
    title: 'Evidence for a Credit Dispute: What Belongs in the Factual Basis',
    seoTitle: 'Evidence for a Credit Dispute and Factual Basis',
    metaDescription: 'Learn what factual credit-dispute evidence looks like, including bureau names, field labels, actual values, conflicts, and supporting records.',
    focusKeyword: 'Evidence for a Credit Dispute',
    secondaryKeywords: ['credit dispute factual basis', 'credit report discrepancy evidence', 'dispute letter evidence'],
    excerpt: 'A dispute reason is stronger when it names the exact report data behind the concern: bureau, field, value, conflict, and requested investigation.',
    discrepancy: 'A discrepancy category is not evidence by itself. Evidence is the concrete report data that caused the category to be flagged and any supporting document or client statement connected to that field.',
    fields: ['Bureau', 'Creditor Name', 'Account Number Masked', 'Field Being Evaluated', 'Reported Value', 'Conflicting Value', 'Source Report Date'],
    example: 'Instead of “paid account with positive balance,” a factual basis should say: Equifax reports Status: Paid/Closed while also reporting Current Balance: $1,284. Those values are inconsistent and require investigation.',
    whyItMatters: 'Specific evidence helps the reviewer understand exactly what needs investigation. It also helps avoid unsupported, templated, or exaggerated claims that are disconnected from the consumer’s actual report.',
    consumerChecks: ['Save the original report page or export.', 'Write the bureau and exact field label next to each value.', 'Collect payment receipts, statements, letters, or identity documents tied to the disputed field.', 'Keep unrelated account data out of the explanation.'],
    softwareAngle: 'FixMy.Money’s letter generation is designed to carry structured evidence from the audit into the dispute draft so the factual basis names the values that triggered the issue.',
    relatedSlugs: ['paid-closed-account-showing-balance', 'duplicate-credit-report-accounts', 'credit-report-review-workflow-for-agencies'],
  },
];

function makeAuditArticle(topic: AuditTopic): Article {
  return {
    slug: topic.slug,
    title: topic.title,
    seoTitle: topic.seoTitle,
    metaDescription: topic.metaDescription,
    canonicalUrl: `${BASE_URL}/blog/${topic.slug}`,
    author: AUTHOR,
    authorTitle: AUTHOR_TITLE,
    publishedDate: PUBLISHED,
    updatedDate: PUBLISHED,
    readingTime: '7 min read',
    category: 'Credit Report Errors',
    focusKeyword: topic.focusKeyword,
    secondaryKeywords: topic.secondaryKeywords,
    excerpt: topic.excerpt,
    tableOfContents: [
      'What the discrepancy means',
      'Fields to compare',
      'Illustrative example',
      'Why the issue matters',
      'What consumers can check',
      'How FixMy.Money uses this audit signal',
    ],
    sections: [
      {
        heading: 'What the discrepancy means',
        level: 2,
        content: `${topic.discrepancy}

This type of review should start with the source report, not with a template. The account name, bureau, field label, reported value, conflicting value, and report date should be preserved before anyone decides whether the issue belongs in a letter. A category such as “balance discrepancy” or “possible duplicate” can help organize work, but it is not the factual basis. The factual basis is the actual data that caused the concern to appear.

There may also be ordinary explanations. Furnishers and bureaus may update at different times, and a report can contain stale information that has since changed. That is why a careful review states what the report says and asks for investigation or correction of unverifiable information instead of promising a specific outcome.`,
      },
      {
        heading: 'Fields to compare',
        level: 2,
        content: `For this issue, compare these fields:
- ${topic.fields.join('\n- ')}

Keep each value tied to its bureau. If Experian and TransUnion report different values, write both values down separately. If the conflict is within one bureau record, identify both fields from that same record. Do not fill missing fields from another account, another client, or a guessed value.

The strongest review notes the creditor or account name, the masked account reference if available, the field being evaluated, the reported value, and the reason the values appear inconsistent. When a value is missing, the explanation should say what is missing rather than inventing a substitute.`,
      },
      {
        heading: 'Illustrative example',
        level: 2,
        content: `${topic.example}

An example is useful only when it teaches the comparison method. A real dispute draft should use the consumer’s actual report data. If the report does not show a date, balance, status, or bureau value, that value should not appear in the factual basis. If two accounts look similar but do not share enough identifying information, the draft should stop short of calling them the same obligation.

A concise factual-basis paragraph can usually do the job: identify the bureau, name the field, quote or summarize the actual value, name the conflicting field or bureau value, and explain why the combination needs investigation.`,
      },
      {
        heading: 'Why the issue matters',
        level: 2,
        content: `${topic.whyItMatters}

The point is not to argue from a label. The point is to make the report easier to verify. A bureau or furnisher can investigate a specific field conflict more readily than a broad statement that an account is “wrong.” Specificity also helps the consumer or agency avoid mixing unrelated accounts, leaking another creditor’s address into the wrong section, or sending a letter that cannot be matched back to the report.

Good evidence is narrow. It names the problem and nothing more than the supporting data requires. That makes the resulting letter shorter, clearer, and safer to review.`,
      },
      {
        heading: 'What consumers can check',
        level: 2,
        content: `A consumer reviewing this issue can:
- ${topic.consumerChecks.join('\n- ')}

If documents are available, connect them to the exact field they support. A payment receipt may relate to a balance, while an account closure letter may relate to status or date closed. A prior credit report may help compare how a date or balance changed over time. Keep copies of the source pages and any supporting records in the same case folder.

If the facts are unclear, the better next step may be more review, not a stronger claim. A useful system should make uncertainty visible so the consumer or reviewer can decide what evidence is still missing.`,
      },
      {
        heading: 'How FixMy.Money uses this audit signal',
        level: 2,
        content: `${topic.softwareAngle}

The audit workflow is built around traceability. Report import captures structured fields, the evidence engine evaluates actual values, internal review keeps source data visible, and generated letters should carry only the values tied to the selected item. Organic visitors reading about this issue can use the same principle: upload a report, run a credit audit, review the fields, and decide whether the facts support a dispute.

FixMy.Money helps organize report data, evidence, review steps, and dispute workflow so the person responsible for the file can work from facts rather than guesswork. Outcomes depend on the facts, furnishers, bureaus, and applicable dispute process.`,
      },
    ],
    faqs: [
      {
        question: `Is ${topic.focusKeyword} always a credit-report error?`,
        answer: 'No. It is a signal for review. Reporting dates, account transfers, missing context, and bureau update timing can explain some differences.',
      },
      {
        question: 'What should a dispute letter include?',
        answer: 'It should identify the creditor or account, bureau, field being evaluated, actual reported value, conflicting actual value when available, and a concise explanation of why the values need investigation.',
      },
      {
        question: 'Can FixMy.Money analyze this automatically?',
        answer: 'FixMy.Money can flag possible discrepancies from saved credit-report fields and carry the supporting evidence into review-ready drafts, but a person should still verify the source report and supporting records.',
      },
    ],
    relatedSlugs: topic.relatedSlugs,
    disclaimer: 'This article is educational and does not constitute legal, financial, or credit-repair advice. Credit-report facts and applicable requirements vary, and outcomes are not promised.',
    cta: {
      heading: 'Find factual discrepancies in your credit report',
      body: 'Upload a report to FixMy.Money, run a credit audit, and review the actual fields behind each potential issue before creating a dispute workflow.',
    },
  };
}

export const AUDIT_EDUCATION_ARTICLES: Article[] = topics.map(makeAuditArticle);
