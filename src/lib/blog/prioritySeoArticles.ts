import type { Article } from './articles';

const BASE_URL = 'https://fixmy.money';

/**
 * Search Console priority pages restored from the production 404 report.
 * These articles stay separate from the older inventory so they can be reviewed
 * and updated as one evidence-led editorial batch.
 */
export const PRIORITY_SEO_ARTICLES: Article[] = [
  {
    slug: 'croa-compliance-guide',
    title: 'CROA Compliance Workflow Guide for Credit Repair Agencies',
    seoTitle: 'CROA Compliance Workflow Guide for Credit Repair Agencies',
    metaDescription:
      'Build a documented CROA compliance workflow for disclosures, written agreements, cancellation rights, service delivery, billing, and recordkeeping.',
    canonicalUrl: `${BASE_URL}/blog/croa-compliance-guide`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'September 15, 2026',
    updatedDate: 'September 15, 2026',
    readingTime: '11 min read',
    category: 'Compliance',
    focusKeyword: 'CROA compliance workflow',
    secondaryKeywords: [
      'credit repair compliance',
      'Credit Repair Organizations Act',
      'credit repair contract requirements',
      'credit repair cancellation period',
    ],
    excerpt:
      'A practical lifecycle guide for documenting federal CROA disclosures, written agreements, cancellation rights, completed services, billing decisions, and compliance reviews.',
    tableOfContents: [
      'Start by Determining Which Rules Apply',
      'Deliver the Required Pre-Contract Disclosure',
      'Complete the Written Agreement',
      'Protect the Three-Business-Day Cancellation Right',
      'Separate Service Delivery from Payment Collection',
      'Build a Defensible Documentation Record',
      'Audit the Workflow and Know When to Seek Counsel',
    ],
    sections: [
      {
        heading: 'Start by Determining Which Rules Apply',
        level: 2,
        content: `A CROA compliance workflow begins before a prospective client signs an agreement or pays anything. The federal Credit Repair Organizations Act, found at 15 U.S.C. §§ 1679–1679j, applies to many people and businesses that use interstate commerce or the mail to sell, provide, perform, or represent that they can provide services intended to improve a consumer’s credit record, credit history, or credit rating in exchange for money or other valuable consideration.

An agency should not decide coverage from its business name alone. Marketing language, sales channels, actual services, compensation, affiliates, and state law may all matter. Document which services are offered, how they are described, how prospects reach the business, and when the agency requests or receives payment. Have qualified counsel determine which federal and state requirements apply to the specific model.

CROA is a federal baseline, not necessarily the complete rulebook. State credit-services laws may require registration, bonding, particular contract terms, fee restrictions, or additional cancellation rights. Telemarketing can also bring the Federal Trade Commission’s Telemarketing Sales Rule into the analysis. That rule can impose payment conditions beyond CROA’s general advance-payment restriction.

A useful workflow therefore starts with a written applicability review. Record the jurisdictions served, sales channels used, services promised, contract structure, billing model, and legal sources reviewed. Revisit that assessment whenever the agency changes its marketing, service definition, pricing, or method of selling.`,
      },
      {
        heading: 'Deliver the Required Pre-Contract Disclosure',
        level: 2,
        content: `CROA requires a credit repair organization to provide the consumer with the prescribed “Consumer Credit File Rights Under State and Federal Law” statement before the consumer executes a contract or agreement. Under 15 U.S.C. § 1679c, this statement must be separate from the contract and other written material. It is not a summary that an agency should casually rewrite.

The workflow should treat disclosure delivery as its own gated step:

1. Present the current legally reviewed disclosure as a separate document.
2. Give the consumer an opportunity to read it before presenting the agreement for signature.
3. Capture the consumer’s signed and dated acknowledgment of receipt.
4. Preserve the exact version delivered, the delivery time, and the acknowledgment.
5. Prevent contract execution when the acknowledgment is missing or the sequence is out of order.

CROA requires the organization to retain a copy of the signed acknowledgment for two years after the consumer signs it. An agency may need to retain related records for a different period under other laws, contracts, litigation holds, insurance requirements, or counsel-approved policies.

Do not rely only on a checked box in the browser. The server-side record should establish which document version was delivered and when the acknowledgment occurred. Staff should not be able to backdate the event or mark it complete without the required record. If delivery fails or the document cannot be displayed, the workflow should stop rather than advancing the consumer to the agreement.`,
      },
      {
        heading: 'Complete the Written Agreement',
        level: 2,
        content: `CROA requires a written and dated contract signed by the consumer before services may be provided. Under 15 U.S.C. § 1679d, the contract must contain the terms and conditions of payment, including the total amount of all payments; a full and detailed description of the services; any promised performance terms; an estimate of the completion date or the time needed to perform the services; and the organization’s name and principal business address.

The statute also requires a conspicuous cancellation statement in bold type near the consumer’s signature. Each contract must be accompanied by the statutory notice-of-cancellation form in duplicate. The consumer must receive the completed contract, the required disclosure, and copies of other documents the organization requires the consumer to sign.

Translate those requirements into verifiable checkpoints rather than a single “contract complete” status. Store the agreement version, service description, payment terms, total payment amount, estimated performance period, business identity, signature evidence, cancellation language, and delivery evidence. Record when the consumer received their copies.

Avoid open-ended descriptions such as “repair credit” when the actual work can be described more precisely. The written terms should match the sales conversation and operational process. Staff should not promise an outcome that the evidence, agreement, or law does not support. Material changes to services, price, timing, or promised performance should return to counsel-approved contracting procedures rather than being inserted informally into notes or messages.`,
      },
      {
        heading: 'Protect the Three-Business-Day Cancellation Right',
        level: 2,
        content: `CROA gives a consumer the right to cancel without penalty or obligation before the statutory deadline associated with the third business day after the agreement is signed. The Act also prohibits a credit repair organization from providing services before the end of the three-business-day period. The exact deadline should be calculated under a counsel-approved rule that accounts for the contract date, applicable business days, and any additional state requirement.

A safe workflow records the contract execution time, calculates the cancellation deadline, and places the client in a waiting state. During that state, the system should not silently treat the client as eligible for credit repair services. Automated dispute activity, substantive report analysis, correspondence generation, and other contracted service work should remain blocked until the waiting period ends.

The cancellation channel should be clear and usable. Preserve the consumer’s notice, the time received, the method received, the agreement it concerns, and the staff action that followed. A timely cancellation should stop downstream tasks, prevent new service work, and route any financial handling for review under the applicable agreement and law.

Do not represent a three-business-day right as merely seventy-two hours. Do not shorten the period based on a sales call, verbal discussion, account creation, or payment-card entry. If the date or deadline is uncertain, pause the workflow and obtain legal guidance instead of selecting the earlier date.`,
      },
      {
        heading: 'Separate Service Delivery from Payment Collection',
        level: 2,
        content: `CROA’s advance-payment provision states that a credit repair organization may not charge or receive money or other valuable consideration for a service it agreed to perform before that service is fully performed. This makes the agreement’s definition of services and the agency’s evidence of completion important. Software cannot decide, on its own, that a charge is lawful simply because a task changed status.

Before a payment request is released, the workflow should identify the contracted service, its completion criteria, the evidence showing what was performed, the completion time, and the reviewer who approved the billing decision. A generated task, draft letter, automated status change, or elapsed month is not necessarily proof that an agreed service was fully performed.

Agencies that sell through telemarketing need additional review. The Telemarketing Sales Rule can impose stricter conditions on requesting or receiving payment for credit-repair services. Labels such as setup fees, monthly charges, or pay-per-delete fees do not change which rules apply to the underlying activity.

Configure billing only after counsel has reviewed the actual marketing, agreement, service definitions, fulfillment evidence, and collection timing. When completion evidence is missing, disputed, or inconsistent with the agreement, the workflow should hold the charge for human review rather than treating the uncertainty as approval.`,
      },
      {
        heading: 'Build a Defensible Documentation Record',
        level: 2,
        content: `A useful compliance record reconstructs the client lifecycle without relying on an employee’s memory. Preserve the source documents and the events connecting them: disclosure delivery, acknowledgment, contract presentation, signature, delivery of copies, cancellation deadline, cancellation notices, service authorization, work performed, evidence reviewed, communications, completion review, billing decision, and payment activity.

Use distinct fields for facts that serve different purposes. “Agreement signed,” “cancellation period ended,” “service performed,” and “eligible for billing review” should not be interchangeable statuses. Each event should have a timestamp, responsible actor, supporting record, and reason for any override or exception.

Access should follow job responsibility and tenant boundaries. A staff member working for one agency should not see another agency’s consumers or documents. Changes to material records should remain attributable, and corrected records should not erase the earlier history. Retention and deletion schedules should account for CROA’s specific two-year requirement for signed disclosure acknowledgments as well as other applicable obligations identified by counsel.

Run exception reports for missing acknowledgments, contracts without delivery evidence, service activity during cancellation periods, billing decisions without completion records, and payments received before documented eligibility. An exception report is a review tool, not proof of compliance. Each exception needs an owner, resolution, and documented decision.`,
      },
      {
        heading: 'Audit the Workflow and Know When to Seek Counsel',
        level: 2,
        content: `Review the process periodically using synthetic cases and a sample of appropriately authorized records. Test the normal sequence and failure paths: missing disclosure, unsigned agreement, changed agreement version, uncertain cancellation deadline, timely cancellation, incomplete service evidence, disputed completion, and a blocked payment request. Confirm that staff permissions and automated rules do not bypass required gates.

Primary sources should anchor the review. Start with the current text of 15 U.S.C. §§ 1679–1679j, the Federal Trade Commission’s Credit Repair Organizations Act materials, applicable provisions of the Telemarketing Sales Rule, and relevant Consumer Financial Protection Bureau guidance or enforcement materials. Then add the laws and regulator guidance for each state served.

Seek qualified counsel before launching the service, entering a new state, changing contract language, adopting telemarketing, redefining deliverables, changing fee timing, using affiliates, or responding to a regulatory complaint. Escalate individual cases when a cancellation deadline is disputed, a consumer challenges a charge, staff performed work prematurely, required documents are missing, or the agency cannot determine whether its evidence satisfies the agreement.

Technology can enforce an approved sequence and preserve records, but it cannot interpret every fact-specific legal issue. The safest design makes uncertainty visible, stops risky progression, and gives an authorized reviewer enough evidence to decide what should happen next.`,
      },
    ],
    faqs: [
      {
        question: 'Does using compliance software make a credit repair agency CROA compliant?',
        answer:
          'No. Software can enforce configured steps and preserve records, but applicability, contract language, service definitions, payment timing, state requirements, and individual exceptions require qualified human review. Agencies should have counsel evaluate their actual business model and documents.',
      },
      {
        question: 'Can an agency collect payment after completing one task for a client?',
        answer:
          'CROA ties payment to full performance of the service the organization agreed to perform. Whether a task constitutes a fully performed agreed service depends on the contract and facts, and telemarketing or state law may impose stricter limits. A qualified attorney should review the service and billing structure before collection.',
      },
      {
        question: 'What records should an agency keep for a CROA workflow?',
        answer:
          'CROA specifically requires retaining the consumer’s signed disclosure acknowledgment for two years. A documented workflow should also preserve the relevant contract, cancellation materials, delivery evidence, service records, communications, completion review, and billing decisions according to a counsel-approved retention policy.',
      },
    ],
    relatedSlugs: [
      'how-croa-billing-workflows-work',
      'credit-repair-client-onboarding-checklist',
      'credit-repair-audit-logs-explained',
    ],
    disclaimer:
      'This guide is for general educational purposes and is not legal advice. CROA, the Telemarketing Sales Rule, and state credit-services laws are fact-specific. Consult qualified counsel about your organization, contracts, marketing, services, billing, and record-retention duties.',
    cta: {
      heading: 'Prepare your workflow before reopening',
      body: 'FixMy.Money is currently closed to new signups. Join the reopening list for product updates while you review your compliance process with qualified counsel.',
    },
  },
  {
    slug: 'dispute-letter-best-practices',
    title: 'Dispute Letter Best Practices: Evidence, Bureau Isolation, and Human Review',
    seoTitle: 'Dispute Letter Best Practices: Evidence and Review',
    metaDescription:
      'Learn dispute letter best practices for bureau-specific facts, evidence provenance, verified enclosures, human review, and response tracking.',
    canonicalUrl: `${BASE_URL}/blog/dispute-letter-best-practices`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'September 15, 2026',
    updatedDate: 'September 15, 2026',
    readingTime: '11 min read',
    category: 'Disputes',
    focusKeyword: 'dispute letter best practices',
    secondaryKeywords: [
      'credit dispute letter evidence',
      'bureau-specific dispute letter',
      'credit dispute documentation',
      'credit bureau response tracking',
    ],
    excerpt:
      'A practical framework for drafting bureau-specific dispute letters from verified report data, preserving evidence provenance, excluding unsupported claims, and tracking each response.',
    tableOfContents: [
      'Start with the Exact Information Being Disputed',
      'Keep Every Letter Specific to Its Recipient Bureau',
      'Preserve Paragraph-Level Evidence Provenance',
      'Exclude Unsupported or Low-Confidence Allegations',
      'List Only Verified Enclosures and Protect Account Data',
      'Complete Human Review and Track the Response',
    ],
    sections: [
      {
        heading: 'Start with the Exact Information Being Disputed',
        level: 2,
        content: `A useful dispute letter begins with the source report, not a generic allegation. Before drafting a paragraph, identify the consumer reporting company, furnisher or account name, masked account reference, disputed field, exact reported value, source report date, and the fact or document that appears to contradict it.

For example, “this account is inaccurate” does not tell a reviewer which part of the tradeline needs investigation. A more reviewable factual basis might record that Equifax reports the account status as Paid/Closed while the same Equifax record reports a current balance of $1,284. If a payment confirmation shows a different balance, the record should identify that document and the value it supports. The draft should not add dates, balances, ownership claims, payment history, or account details that are absent from the stored evidence.

Current Consumer Financial Protection Bureau and Federal Trade Commission guidance centers a mailed dispute on each item believed to be wrong, an explanation of why, the requested correction, and copies of supporting documents when appropriate. The Fair Credit Reporting Act’s reinvestigation provisions address disputes about the completeness or accuracy of information and the consideration of relevant information submitted by the consumer.

Those provisions do not turn a category label or software suggestion into proof. A careful workflow therefore keeps the allegation no broader than the evidence. Specific legal questions or unusual facts should be referred to qualified counsel rather than resolved by a letter template.`,
      },
      {
        heading: 'Keep Every Letter Specific to Its Recipient Bureau',
        level: 2,
        content: `Experian, Equifax, and TransUnion can display different information for what appears to be the same account. A dispute letter should preserve those differences instead of collapsing them into one blended record.

Suppose the stored reports show these values for the same masked account:

- Equifax: Paid/Closed, current balance $1,284, last reported August 1.
- Experian: Paid/Closed, current balance $0, last reported August 3.
- TransUnion: no matching tradeline located in the saved report.

A letter addressed to Equifax may state that Equifax reports a $1,284 balance and that the saved Experian report shows $0 for the corresponding masked account. It should make clear which bureau reported each value and ask Equifax to investigate its own reported information. It must not say that Equifax reported both balances, accuse TransUnion of reporting a value that is not present, or convert the absence of a tradeline into an allegation against TransUnion.

Dates also matter. A difference between reports generated months apart may reflect timing rather than an error. The comparison record should therefore retain each bureau’s report date, last-reported date, field label, and value. When dates or account identifiers do not support a reliable match, the possible discrepancy belongs in a human-review queue rather than a letter.

Bureau isolation should apply to every paragraph, attachment, and requested action. Evidence concerning an Experian-only inquiry should not appear in an Equifax letter. A supporting statement for one furnisher should not be attached to an unrelated account. Separating evidence by recipient reduces factual mistakes and makes later responses easier to connect to the correct bureau and issue.`,
      },
      {
        heading: 'Preserve Paragraph-Level Evidence Provenance',
        level: 2,
        content: `Every substantive paragraph should have an internal provenance record showing why it exists. Provenance is the connection between the text and the stored information that supports it. It allows a reviewer to trace a statement back to evidence without reconstructing the case from memory.

A practical paragraph record includes:

- The account or furnisher.
- The recipient bureau.
- The exact disputed field.
- The bureau’s reported value.
- The contradictory or expected value, if one is supported.
- The source evidence identifier and source date.
- The evidence type, such as a saved report page, statement, correspondence, or consumer-supplied record.
- The selected factual dispute reason.
- The reviewer and approval status.

The source identifier is primarily an internal audit reference; it does not have to be printed in the consumer’s letter. Its purpose is to prove that the paragraph came from a real source and to let an authorized reviewer inspect that source. If the supporting evidence is replaced or rejected, the draft should be reevaluated rather than retaining text whose provenance no longer exists.

Provenance should survive the full workflow from report import through analysis, drafting, approval, delivery, and response tracking. Converting structured evidence into an untraceable block of prose loses an important control. It becomes difficult to determine which value came from which bureau, whether a reviewer changed a fact, or whether a later version added an unsupported statement.

Deterministic drafting is useful here: the same approved structured evidence should produce the same substantive factual statements regardless of which authorized workflow starts the draft. Formatting may change, but facts should not drift among a primary workflow, a round-based workflow, or a regenerated copy.`,
      },
      {
        heading: 'Exclude Unsupported or Low-Confidence Allegations',
        level: 2,
        content: `A letter builder should fail closed when the evidence is missing, ambiguous, or too weak to support a factual statement. It is safer to return “human review required” than to fill a gap with plausible-sounding language.

Identity theft and fraud claims deserve particular care. A mismatched name, unfamiliar account, or client question does not by itself establish identity theft or fraud. Those assertions should appear only when the consumer has provided and approved facts that support them, and the workflow should direct identity-theft situations to the appropriate specialized process. A general credit-report dispute template should never invent such a claim.

The same rule applies to payment history, ownership, legal violations, prior correspondence, account dates, and balances. If the source record says only that two balances differ, the draft can accurately describe the stored values and request investigation. It should not infer that a payment was made, that a furnisher acted unlawfully, or that one bureau’s value is necessarily correct.

Confidence scores can organize review, but they are not evidence. A high-confidence extraction still needs comparison with its source. A low-confidence extraction should not become a letter paragraph automatically. Missing fields should remain missing, and ambiguous account matches should remain separate until a person verifies them.

The distinction also protects useful disputes from becoming vague. A consumer reporting company may determine a dispute is frivolous or irrelevant when it lacks enough information to investigate. That is another reason to make each disputed item specific and source-grounded, while avoiding legal conclusions the evidence does not establish.`,
      },
      {
        heading: 'List Only Verified Enclosures and Protect Account Data',
        level: 2,
        content: `An enclosure list is a statement about what is actually being sent. A letter should name a document only after an authorized reviewer selects a verified file for that specific recipient and confirms it will accompany the correspondence.

The drafting system should not infer enclosures from filenames, notes, document categories, or prior rounds. If a payment receipt exists in the client workspace but was not reviewed and selected for the current Equifax letter, the letter should not say “enclosed is my payment receipt.” If no enclosure is selected, the enclosure section should be omitted rather than populated with generic language.

When documents are included, current CFPB and FTC consumer guidance recommends copies rather than originals. Review every page for relevance and unintended disclosure. A document for one account may contain unrelated balances, full account numbers, Social Security numbers, medical details, or another person’s information. Include only what is necessary for the identified dispute and follow the organization’s approved redaction and document-handling process.

Account references in drafts, review screens, exports, and audit views should remain masked—for example, an account ending in 1234—unless the approved submission method genuinely requires more information and an authorized person confirms that requirement. A system should not recover or invent hidden digits.

Enclosures must also obey tenant boundaries. An attachment from another client or workspace must never be selectable, even if its filename or document type appears to match. The letter, its provenance, and every selected document should resolve to the same authorized consumer, workspace, account, and recipient context before final approval.`,
      },
      {
        heading: 'Complete Human Review and Track the Response',
        level: 2,
        content: `Human review is the final factual control, not a ceremonial click. The reviewer should compare the draft with the source report and each selected document, then verify the consumer’s identifying information, recipient bureau, masked account reference, disputed field, actual reported value, contradictory evidence, requested action, and enclosure list.

The reviewer should also ask what the draft does not know. Is the bureau comparison from the same report period? Does a newer statement explain the difference? Are two similar tradelines actually the same obligation? Did the consumer confirm a personal fact? Is an allegation broader than the evidence? If an answer is uncertain, return the item for clarification rather than approving the paragraph.

After submission, retain a copy of the final letter, the exact enclosures, the delivery method, and evidence of receipt when available. FTC and CFPB consumer guidance recommends keeping copies of what was sent and notes that certified mail with a return receipt can provide a record of receipt when a dispute is mailed. These are documentation practices, not predictions about the result.

Connect each response to its bureau, letter version, disputed items, and evidence. Record the date received and the result the bureau actually reported. Do not describe a temporary change as permanent, assume silence means success, or attribute a credit-score movement to a particular letter without supporting evidence.

If a response leaves the issue unresolved, preserve it for the next human review. The reviewer can compare the new report or explanation with the original evidence and decide what, if any, supported next step is appropriate. A reliable dispute workflow is a traceable cycle of evidence, review, correspondence, and response—not a volume contest and not a promise of a particular outcome.`,
      },
    ],
    faqs: [
      {
        question: 'Should one dispute letter include every difference found across all three bureaus?',
        answer:
          'No. Each letter should contain only evidence relevant to its recipient. A cross-bureau comparison can be included when it is supported, but the wording must identify the actual value and source bureau separately and must not imply that every bureau reported every conflicting value.',
      },
      {
        question: 'Can software turn a possible discrepancy into a dispute allegation automatically?',
        answer:
          'A possible discrepancy is a review signal, not proof. Software can organize bureau fields and supporting records, but missing, ambiguous, unsupported, or low-confidence evidence should be excluded or sent for human review before it becomes substantive letter text.',
      },
      {
        question: 'When should a document appear in the enclosure list?',
        answer:
          'Only after the document has been verified, selected for the specific letter, and confirmed for delivery. A document that merely exists in a workspace should not be claimed as an enclosure, and unrelated client or account documents must never cross tenant boundaries.',
      },
    ],
    relatedSlugs: [
      'evidence-for-credit-dispute',
      'credit-repair-dispute-documentation-checklist',
      'equifax-experian-transunion-disputes',
    ],
    disclaimer:
      'This article is for educational and operational-planning purposes only and does not constitute legal, financial, or credit-repair advice. Dispute facts and applicable requirements vary, so organizations and consumers should obtain qualified guidance for their circumstances.',
    cta: {
      heading: 'Build a source-grounded dispute workflow',
      body: 'Join the FixMy.Money reopening list for updates on evidence review, bureau-specific drafting, and documented dispute workflows.',
    },
  },
];
