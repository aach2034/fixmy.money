/**
 * Centralized blog article data structure.
 * CMS-compatible: articles can be moved to Supabase without rebuilding routes.
 */

export interface ArticleSection {
  heading: string;
  level: 2 | 3;
  content: string;
}

export interface ArticleFAQ {
  question: string;
  answer: string;
}

export interface Article {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  author: string;
  authorTitle: string;
  publishedDate: string;
  updatedDate: string;
  readingTime: string;
  category: string;
  excerpt: string;
  tableOfContents: string[];
  sections: ArticleSection[];
  faqs: ArticleFAQ[];
  relatedSlugs: string[];
  disclaimer: string;
  cta: { heading: string; body: string };
}

const BASE_URL = 'https://fixmy.money';

export const ARTICLES: Article[] = [
  {
    slug: 'how-to-start-a-credit-repair-business-2026',
    title: 'How to Start a Credit Repair Business in 2026',
    seoTitle: 'How to Start a Credit Repair Business in 2026 | FixMy.Money',
    metaDescription: 'A practical guide to launching a credit repair agency in 2026 — covering CROA compliance, software selection, client onboarding, and building a sustainable operation.',
    canonicalUrl: `${BASE_URL}/blog/how-to-start-a-credit-repair-business-2026`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 1, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '12 min read',
    category: 'Getting Started',
    excerpt: 'A practical guide to launching a credit repair agency in 2026 — covering CROA compliance, software selection, client onboarding, and building a sustainable operation.',
    tableOfContents: [
      'What Is a Credit Repair Business?',
      'Understanding CROA Before You Start',
      'Business Formation and Licensing',
      'Choosing Credit Repair Software',
      'Building Your Client Onboarding Process',
      'Pricing Your Services',
      'Marketing Your Agency',
      'Common Mistakes to Avoid',
    ],
    sections: [
      {
        heading: 'What Is a Credit Repair Business?',
        level: 2,
        content: `A credit repair business helps consumers identify inaccurate, unverifiable, or outdated information on their credit reports and assists them in disputing those items with the three major credit bureaus — Equifax, Experian, and TransUnion.

Credit repair agencies do not guarantee results. They provide a service: reviewing credit reports, preparing dispute correspondence, tracking bureau responses, and documenting the process. The outcome of any dispute depends on the bureau's investigation and the underlying accuracy of the information.

In 2026, the credit repair industry continues to grow as more consumers seek professional help navigating complex credit reporting systems. Agencies that operate transparently, document their work carefully, and use modern software to manage workflows are better positioned to build sustainable businesses.`,
      },
      {
        heading: 'Understanding CROA Before You Start',
        level: 2,
        content: `The Credit Repair Organizations Act (CROA) is the primary federal law governing credit repair businesses. Before you accept a single client or collect a single dollar, you need to understand what CROA requires.

**Key CROA requirements include:**

- You cannot charge fees before services are fully performed. This is the completed-service billing requirement — one of the most important rules in the industry.
- You must provide clients with a written disclosure statement before they sign any contract.
- Clients have a three-day right to cancel any contract without penalty.
- You cannot make false or misleading statements about your services.
- You cannot advise clients to make false statements to credit bureaus or creditors.
- Contracts must be in writing and must include specific disclosures.

CROA violations can result in civil liability, including actual damages, punitive damages, and attorney fees. Some states have additional credit services organization laws that impose further requirements.

**This guide does not constitute legal advice.** Consult a qualified attorney before launching your business to ensure your contracts, disclosures, and billing practices comply with CROA and applicable state laws.`,
      },
      {
        heading: 'Business Formation and Licensing',
        level: 2,
        content: `Most credit repair business owners form a limited liability company (LLC) to separate personal and business liability. The specific requirements vary by state.

**Steps typically involved:**

1. Choose a business name and verify it is available in your state.
2. File articles of organization with your state's secretary of state office.
3. Obtain an Employer Identification Number (EIN) from the IRS.
4. Open a dedicated business bank account.
5. Research whether your state requires a surety bond or registration for credit services organizations.
6. Consult an attorney to draft compliant client contracts and disclosure documents.

Several states — including Georgia, Louisiana, and others — require credit repair businesses to register as credit services organizations and post a surety bond before operating. Requirements change, so verify current rules with your state's regulatory agency or an attorney.`,
      },
      {
        heading: 'Choosing Credit Repair Software',
        level: 2,
        content: `Modern credit repair software handles the operational complexity that would otherwise require multiple disconnected tools. When evaluating platforms in 2026, look for:

**Core features to require:**
- Client management with secure document storage
- Credit report upload and analysis
- Dispute letter generation and tracking
- CROA workflow support (disclosure delivery, cancellation period tracking, completed-service documentation)
- Audit logging with immutable records
- Billing that supports completed-service requirements
- Client portal for communication and document sharing

**Features that differentiate platforms:**
- AI-assisted dispute analysis
- Automation for routine tasks
- White-label options for branded client experiences
- Analytics and reporting
- Team management with role-based access

Avoid platforms that promise guaranteed deletions or score increases — those claims are not legally supportable and should be a red flag about the vendor's compliance posture.

FixMy.Money is designed specifically for credit repair agencies and includes all of the above features in a single platform.`,
      },
      {
        heading: 'Building Your Client Onboarding Process',
        level: 2,
        content: `A well-designed onboarding process protects both your clients and your business. Every client should go through the same documented steps before any dispute work begins.

**A compliant onboarding sequence typically includes:**

1. **Initial consultation** — Understand the client's situation and set realistic expectations.
2. **CROA disclosure delivery** — Provide the required written disclosure before any contract is signed.
3. **Contract execution** — Have the client sign a written service agreement that includes all CROA-required disclosures.
4. **Three-day cancellation period** — Do not begin work until the cancellation window has passed.
5. **Credit report collection** — Obtain copies of the client's reports from all three bureaus.
6. **Report analysis** — Review the reports and identify items to dispute.
7. **Client activation** — Begin dispute work after all prerequisites are complete.

Software like FixMy.Money can automate the tracking of each step, timestamp every action, and generate the documentation you need to demonstrate compliance.`,
      },
      {
        heading: 'Pricing Your Services',
        level: 2,
        content: `CROA's completed-service billing requirement means you cannot charge clients upfront for work you have not yet performed. This shapes how credit repair agencies structure their pricing.

**Common compliant pricing models:**

- **Monthly service fee after completed work** — Charge a monthly fee after demonstrating that services were performed during that period. This requires careful documentation of what was done each month.
- **Per-item fee after deletion or update** — Charge only when a specific item is successfully addressed. This model requires clear documentation of what constitutes a completed service.
- **Flat fee for completed service packages** — Charge after delivering a defined set of services (e.g., a complete dispute round).

Typical monthly fees in 2026 range from $79 to $199 per month depending on the market, service level, and client complexity. Some agencies charge initial setup fees for work performed during onboarding.

**Never charge fees before services are performed.** This is the most common CROA violation and the one most likely to result in legal action.`,
      },
      {
        heading: 'Marketing Your Agency',
        level: 2,
        content: `Building a credit repair business requires building trust. Consumers are understandably skeptical of the industry because of a history of bad actors. Your marketing should emphasize transparency, process, and realistic expectations.

**Effective marketing approaches:**

- **Content marketing** — Publish useful guides about credit reports, dispute processes, and financial literacy. This builds credibility and organic search traffic.
- **Referral partnerships** — Mortgage brokers, real estate agents, and auto dealers regularly work with clients who need credit improvement. These referral relationships can be a consistent source of qualified leads.
- **Social proof** — Authentic client testimonials (with permission) and case studies build trust. Avoid fabricated reviews or inflated claims.
- **Clear service descriptions** — Explain exactly what you do and what you do not do. Transparency reduces refund requests and disputes.

**What to avoid in marketing:**
- Guarantees of specific score increases
- Promises of specific deletions
- Claims of legal compliance without verification
- Fake testimonials or fabricated results`,
      },
      {
        heading: 'Common Mistakes to Avoid',
        level: 2,
        content: `Many credit repair businesses fail in the first year due to avoidable mistakes. The most common include:

1. **Charging fees before services are performed** — This is a CROA violation and can result in civil liability.
2. **Using non-compliant contracts** — Generic contracts downloaded from the internet may not meet CROA requirements. Have an attorney review your contracts.
3. **Failing to document completed services** — If you cannot demonstrate what services were performed, you cannot justify your billing.
4. **Making guarantees** — Never guarantee deletions, score increases, or specific outcomes.
5. **Inadequate client communication** — Clients who feel ignored become complainants. Build regular communication into your process.
6. **Ignoring state law** — CROA is federal law, but many states have additional requirements. Research your state's rules.
7. **Using manual processes at scale** — Spreadsheets and email break down as client volume grows. Invest in proper software early.`,
      },
    ],
    faqs: [
      {
        question: 'Do I need a license to start a credit repair business?',
        answer: 'Licensing requirements vary by state. Some states require credit services organizations to register and post a surety bond. Research your state\'s specific requirements and consult an attorney before launching.',
      },
      {
        question: 'Can I charge clients upfront for credit repair services?',
        answer: 'CROA generally prohibits charging fees before services are fully performed. This is one of the most important rules in the industry. Consult an attorney to structure your billing model correctly.',
      },
      {
        question: 'How long does it take to build a profitable credit repair business?',
        answer: 'This varies significantly based on marketing, pricing, client retention, and operational efficiency. We cannot make income projections. Focus on building compliant processes and delivering genuine value to clients.',
      },
      {
        question: 'What software do I need to run a credit repair business?',
        answer: 'You need software that handles client management, credit report analysis, dispute letter generation, CROA workflow tracking, audit logging, and billing. FixMy.Money is designed specifically for this use case.',
      },
    ],
    relatedSlugs: ['credit-repair-client-onboarding-checklist', 'how-croa-billing-workflows-work', 'best-credit-repair-software-2026'],
    disclaimer: 'This article is for informational purposes only and does not constitute legal advice. Credit repair agencies are responsible for their own compliance with CROA, FCRA, TSR, and applicable state laws. Consult a qualified attorney before launching your business.',
    cta: {
      heading: 'Ready to run your agency from one platform?',
      body: 'FixMy.Money includes client management, CROA workflow tracking, dispute letter generation, audit logging, and billing — everything you need to operate a compliant credit repair agency.',
    },
  },
  {
    slug: 'best-credit-repair-software-2026',
    title: 'Best Credit Repair Software in 2026',
    seoTitle: 'Best Credit Repair Software in 2026 | FixMy.Money',
    metaDescription: 'An honest comparison of credit repair software platforms in 2026. What features matter, what to avoid, and how to evaluate platforms for your agency size.',
    canonicalUrl: `${BASE_URL}/blog/best-credit-repair-software-2026`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 2, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '10 min read',
    category: 'Software',
    excerpt: 'An honest comparison of credit repair software platforms in 2026. What features matter, what to avoid, and how to evaluate platforms for your agency size.',
    tableOfContents: [
      'What Credit Repair Software Actually Does',
      'Core Features Every Platform Should Have',
      'Advanced Features Worth Paying For',
      'Red Flags to Watch For',
      'How to Evaluate Platforms for Your Agency Size',
      'Pricing Considerations',
      'Questions to Ask Before Buying',
    ],
    sections: [
      {
        heading: 'What Credit Repair Software Actually Does',
        level: 2,
        content: `Credit repair software is a category of business management tools designed specifically for agencies that help consumers dispute inaccurate information on their credit reports. It is not consumer-facing credit monitoring software — it is the operational backbone of a credit repair business.

Good credit repair software replaces a collection of disconnected tools: spreadsheets for client tracking, email for communication, word processors for letters, and manual billing processes. It brings all of these into a single system with proper audit trails, compliance documentation, and workflow management.

In 2026, the best platforms have added AI-assisted analysis, automated dispute workflows, and integrated billing that supports CROA's completed-service requirements.`,
      },
      {
        heading: 'Core Features Every Platform Should Have',
        level: 2,
        content: `Before evaluating advanced features, verify that any platform you consider includes these fundamentals:

**Client Management**
- Secure client profiles with contact information and document storage
- Status tracking through the full client lifecycle
- Notes and communication history

**Credit Report Handling**
- Ability to upload and store credit reports securely
- Report analysis tools that identify disputable items
- Support for all three bureaus

**Dispute Letter Generation**
- Templates for common dispute types
- Customizable letter content
- Tracking of sent letters and bureau responses

**CROA Workflow Support**
- Disclosure delivery tracking
- Contract management
- Cancellation period tracking
- Completed-service documentation

**Audit Logging**
- Immutable records of all actions
- Timestamps and user attribution
- Cannot be edited by standard users

**Billing**
- Support for completed-service billing models
- Invoice generation and tracking
- Payment processing integration`,
      },
      {
        heading: 'Advanced Features Worth Paying For',
        level: 2,
        content: `Once you have confirmed a platform covers the basics, these advanced features can meaningfully improve your operations:

**AI-Assisted Analysis**
AI tools that analyze credit reports and suggest dispute strategies can save significant time. Look for platforms where AI output requires human review before any letter is sent — this is both a compliance safeguard and a quality control measure.

**Automation**
Automated workflows for routine tasks — sending follow-up reminders, generating monthly reports, tracking bureau response deadlines — reduce manual work and reduce the chance of missed steps.

**Client Portal**
A secure portal where clients can view their progress, upload documents, and communicate with your team improves client satisfaction and reduces inbound support requests.

**White Labeling**
If you want to present a branded experience to clients, look for platforms that support custom logos, colors, and domain names.

**Analytics and Reporting**
Business analytics — client acquisition, revenue trends, dispute resolution rates — help you make better decisions about your agency.

**Team Management**
Role-based access controls let you add staff members with appropriate permissions without giving everyone full administrative access.`,
      },
      {
        heading: 'Red Flags to Watch For',
        level: 2,
        content: `Some credit repair software vendors make claims that should give you pause:

**Guaranteed results** — No software can guarantee credit score increases or specific deletions. Vendors who make these claims are either misleading you or encouraging practices that could expose your business to liability.

**"Loopholes" or "secrets"** — Legitimate credit repair is based on the FCRA's right to dispute inaccurate information. There are no loopholes. Vendors who market their software around secret techniques are a red flag.

**No audit trail** — Any platform that does not maintain immutable audit logs is not suitable for a compliant credit repair operation.

**Upfront billing tools** — Software that makes it easy to charge clients before services are performed is a compliance risk. Look for platforms designed around completed-service billing.

**No CROA workflow support** — If a platform does not have built-in support for CROA's disclosure, contract, and cancellation requirements, you will need to manage those manually — which increases compliance risk.`,
      },
      {
        heading: 'How to Evaluate Platforms for Your Agency Size',
        level: 2,
        content: `**Solo operators and new agencies (1–20 clients)**
Focus on ease of use, CROA compliance features, and cost. You do not need enterprise features yet. Look for a platform that grows with you rather than one that requires a large upfront investment.

**Growing agencies (20–100 clients)**
At this scale, automation and team management become important. You need to be able to delegate work to staff members without losing visibility or control. Look for platforms with role-based access, workflow automation, and strong reporting.

**Established agencies (100+ clients)**
At scale, you need robust analytics, API access for custom integrations, white-label capabilities, and dedicated support. Evaluate platforms on their reliability, uptime history, and support responsiveness.`,
      },
      {
        heading: 'Pricing Considerations',
        level: 2,
        content: `Credit repair software pricing in 2026 typically ranges from $49 to $249 per month for small to mid-size agencies, with enterprise pricing available for larger operations.

When evaluating cost, consider:
- Per-client fees vs. flat monthly fees
- Storage limits and overage costs
- Feature availability at each tier
- Contract length and cancellation terms
- Onboarding and training costs
- Support quality at each tier

The cheapest option is rarely the best value. A platform that saves your team two hours per week at $129/month is a better investment than a $49/month platform that requires manual workarounds.`,
      },
      {
        heading: 'Questions to Ask Before Buying',
        level: 2,
        content: `Before committing to any credit repair software platform, ask:

1. Does the platform support CROA-compliant billing workflows?
2. Are audit logs immutable and user-attributable?
3. What happens to my data if I cancel?
4. Is there a data export feature?
5. How is client data secured and encrypted?
6. What is the uptime SLA?
7. Is there a $1 trial or demo available?
8. What support is included at my plan level?
9. Can I add team members with role-based access?
10. Does the platform have a client portal?`,
      },
    ],
    faqs: [
      {
        question: 'What is the best credit repair software for a new agency?',
        answer: 'Look for a platform with strong CROA compliance features, client management, dispute letter generation, and audit logging. FixMy.Money is designed specifically for credit repair agencies of all sizes.',
      },
      {
        question: 'How much does credit repair software cost?',
        answer: 'Pricing typically ranges from $49 to $249 per month for small to mid-size agencies. Enterprise pricing is available for larger operations. Evaluate total cost of ownership, not just the monthly fee.',
      },
      {
        question: 'Can credit repair software guarantee results?',
        answer: 'No. No software can guarantee credit score increases or specific deletions. Be skeptical of any vendor making such claims.',
      },
    ],
    relatedSlugs: ['credit-repair-cloud-alternatives-2026', 'how-to-start-a-credit-repair-business-2026', 'white-label-credit-repair-software'],
    disclaimer: 'This article is for informational purposes only. Software comparisons reflect the author\'s analysis and may not reflect current product features. Verify current capabilities directly with vendors.',
    cta: {
      heading: 'See FixMy.Money in action',
      body: 'Explore the platform with our interactive demo — no account or credit card required.',
    },
  },
  {
    slug: 'credit-repair-cloud-alternatives-2026',
    title: 'Credit Repair Cloud Alternatives in 2026',
    seoTitle: 'Credit Repair Cloud Alternatives in 2026 | FixMy.Money',
    metaDescription: 'Looking for alternatives to Credit Repair Cloud? This guide compares the leading platforms on features, pricing, AI capabilities, and compliance tools.',
    canonicalUrl: `${BASE_URL}/blog/credit-repair-cloud-alternatives-2026`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 3, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '9 min read',
    category: 'Software',
    excerpt: 'Looking for alternatives to Credit Repair Cloud? This guide compares the leading platforms on features, pricing, AI capabilities, and compliance tools.',
    tableOfContents: [
      'Why Agencies Look for Alternatives',
      'What to Look for in a Credit Repair Cloud Alternative',
      'Key Comparison Criteria',
      'AI and Automation Capabilities',
      'Compliance and Audit Features',
      'Pricing and Value',
      'Making the Switch',
    ],
    sections: [
      {
        heading: 'Why Agencies Look for Alternatives',
        level: 2,
        content: `Credit Repair Cloud has been one of the most recognized names in credit repair software for years. But as the industry has evolved, many agencies find themselves looking for alternatives for a variety of reasons:

- **Pricing** — Some agencies find the cost structure doesn't align with their business model as they scale.
- **AI capabilities** — Newer platforms have built AI-assisted analysis and letter generation that older platforms are still catching up on.
- **User experience** — Some users find the interface dated compared to newer SaaS platforms.
- **Specific workflow needs** — Agencies with particular compliance requirements or workflow preferences may find other platforms better suited.
- **Support quality** — Support responsiveness and quality varies, and some agencies prioritize this highly.

This guide is not a takedown of any specific platform. It is a framework for evaluating alternatives based on what matters to your agency.`,
      },
      {
        heading: 'What to Look for in a Credit Repair Cloud Alternative',
        level: 2,
        content: `When evaluating any alternative, start with the non-negotiables:

**Must-have features:**
- CROA-compliant billing workflows
- Immutable audit logging
- Secure document storage
- Credit report analysis
- Dispute letter generation and tracking
- Client portal
- Team management with role-based access

**Differentiating features to evaluate:**
- AI-assisted dispute analysis
- Workflow automation
- White-label capabilities
- Analytics and reporting depth
- API access
- Mobile experience
- Onboarding support quality`,
      },
      {
        heading: 'Key Comparison Criteria',
        level: 2,
        content: `**Data portability** — Can you export all your client data if you decide to switch again? Look for platforms with full data export capabilities. Never get locked into a platform that holds your data hostage.

**Migration support** — Does the vendor offer migration assistance from your current platform? Moving client data, documents, and history is complex. Good vendors make this easier.

**Contract terms** — Month-to-month vs. annual contracts. Understand cancellation terms before you commit.

**Uptime and reliability** — Credit repair agencies depend on their software being available when clients need support. Ask about uptime history and SLAs.

**Security posture** — How is client data encrypted? What access controls exist? Is there a security page with verifiable claims?`,
      },
      {
        heading: 'AI and Automation Capabilities',
        level: 2,
        content: `AI has become a meaningful differentiator in credit repair software in 2026. The most useful AI features include:

**Credit report analysis** — AI that can read uploaded credit reports, identify potentially disputable items, and suggest dispute reasons saves significant analyst time. Look for platforms where AI suggestions require human review before any letter is generated.

**Letter generation** — AI-assisted letter drafting that produces customized dispute letters based on the specific account and dispute reason. The best implementations allow full human editing before sending.

**Client summaries** — AI-generated summaries of client progress that can be shared with clients or used internally.

**Important caveats:**
- AI output should never be sent without human review
- AI cannot guarantee outcomes
- AI should not invent dispute reasons or account facts
- Look for platforms that display clear AI disclaimers

FixMy.Money includes AI-assisted analysis with mandatory human review requirements built into the workflow.`,
      },
      {
        heading: 'Compliance and Audit Features',
        level: 2,
        content: `Compliance features are where many platforms fall short. When evaluating alternatives, dig into:

**CROA workflow support:**
- Does the platform track disclosure delivery?
- Does it enforce the three-day cancellation period?
- Does it document completed services for billing eligibility?
- Does it maintain records of what was done each billing period?

**Audit logging:**
- Are logs immutable (cannot be edited or deleted)?
- Do logs include timestamps and user attribution?
- Can logs be exported for legal proceedings?

**Document management:**
- Are documents stored securely with access controls?
- Is there version history?
- Can documents be shared with clients through a secure portal?`,
      },
      {
        heading: 'Pricing and Value',
        level: 2,
        content: `Pricing for credit repair software alternatives in 2026 varies widely. When comparing costs:

- Compare at the same feature tier, not just the base price
- Factor in per-client fees if applicable
- Consider storage limits
- Evaluate support quality at each tier
- Look at annual vs. monthly pricing options

FixMy.Money offers transparent, tiered pricing starting at $49/month with a 14-day trial for $1. Payment method required to start.`,
      },
      {
        heading: 'Making the Switch',
        level: 2,
        content: `Switching credit repair software is a significant operational decision. To minimize disruption:

1. **Run platforms in parallel** during a transition period if possible.
2. **Export all data** from your current platform before canceling.
3. **Migrate clients in batches** rather than all at once.
4. **Train your team** on the new platform before going live.
5. **Test your workflows** thoroughly before moving active clients.
6. **Verify compliance features** work as expected in the new platform.

Most platforms offer migration assistance or onboarding support. Take advantage of it.`,
      },
    ],
    faqs: [
      {
        question: 'Is FixMy.Money a Credit Repair Cloud alternative?',
        answer: 'Yes. FixMy.Money is a full-featured credit repair software platform designed for agencies of all sizes. It includes client management, CROA workflow support, AI-assisted analysis, dispute letter generation, audit logging, and billing.',
      },
      {
        question: 'Can I migrate my data from Credit Repair Cloud to another platform?',
        answer: 'Most platforms support data import. Contact your target platform\'s support team to understand what migration assistance is available and what data formats are supported.',
      },
      {
        question: 'What is the most important feature to look for in a Credit Repair Cloud alternative?',
        answer: 'CROA compliance features — specifically completed-service billing support and immutable audit logging — are the most important. These protect your business from legal liability.',
      },
    ],
    relatedSlugs: ['best-credit-repair-software-2026', 'how-croa-billing-workflows-work', 'white-label-credit-repair-software'],
    disclaimer: 'This article is for informational purposes only. Product comparisons are based on publicly available information and the author\'s analysis. Verify current features directly with vendors.',
    cta: {
      heading: 'Try FixMy.Money for 14 days for $1',
      body: 'Payment method required. Explore all features with your own agency data.',
    },
  },
  {
    slug: 'how-croa-billing-workflows-work',
    title: 'How CROA Billing Workflows Work',
    seoTitle: 'How CROA Billing Workflows Work | FixMy.Money',
    metaDescription: 'CROA restricts when and how credit repair agencies can charge clients. This guide explains the billing restrictions, completed-service requirements, and how to document billing eligibility.',
    canonicalUrl: `${BASE_URL}/blog/how-croa-billing-workflows-work`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 4, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '8 min read',
    category: 'Compliance',
    excerpt: 'CROA restricts when and how credit repair agencies can charge clients. This guide explains the billing restrictions, completed-service requirements, and how to document billing eligibility.',
    tableOfContents: [
      'The CROA Billing Restriction',
      'What Counts as a Completed Service',
      'Compliant Billing Models',
      'Documenting Billing Eligibility',
      'Common Billing Mistakes',
      'How Software Supports Compliant Billing',
    ],
    sections: [
      {
        heading: 'The CROA Billing Restriction',
        level: 2,
        content: `The Credit Repair Organizations Act (CROA) contains one of the most important restrictions in the credit repair industry: you cannot charge fees before services are fully performed.

Specifically, 15 U.S.C. § 1679b(b) states that no credit repair organization may charge or receive any money or other valuable consideration for the performance of any service which the credit repair organization has agreed to perform before such service is fully performed.

This is not a technicality. It is the central billing rule that governs the entire industry. Violations can result in civil liability, including actual damages, punitive damages, and attorney fees.

**What this means in practice:**
- You cannot charge a setup fee for work you have not yet done
- You cannot charge a monthly fee at the beginning of the month for work you plan to do
- You can only charge after you have performed and documented the services you agreed to provide

This guide does not constitute legal advice. Consult a qualified attorney to structure your billing model correctly.`,
      },
      {
        heading: 'What Counts as a Completed Service',
        level: 2,
        content: `The definition of "completed service" is central to CROA billing compliance. Your service agreement should clearly define what constitutes a completed service for billing purposes.

**Common definitions used in the industry:**

- **Dispute round completion** — A complete round of dispute letters has been prepared, sent to the appropriate bureaus, and responses have been received and documented.
- **Monthly service delivery** — A defined set of services has been performed during the billing period, such as: reviewing bureau responses, preparing follow-up correspondence, updating the client's file, and communicating progress to the client.
- **Per-item completion** — A specific derogatory item has been addressed (updated, removed, or the dispute process has been completed for that item).

The key is that your service agreement must define what you are agreeing to do, and you must document that you did it before charging.`,
      },
      {
        heading: 'Compliant Billing Models',
        level: 2,
        content: `Several billing models can be structured to comply with CROA's completed-service requirement:

**Monthly service fee (arrears billing)**
Charge at the end of each month after documenting the services performed during that month. This is the most common model. Your documentation should show what was done — letters sent, responses reviewed, client communications — before the invoice is generated.

**Per-dispute-round billing**
Charge after completing a full round of disputes — letters sent, responses received, and results documented. This model ties billing directly to a defined deliverable.

**Per-item billing**
Charge only when a specific item is successfully addressed. This model is straightforward from a compliance standpoint but can be unpredictable from a revenue standpoint.

**Hybrid models**
Some agencies use a combination — for example, a monthly service fee for ongoing monitoring and communication, plus a per-item fee for successful removals. These models require careful documentation to demonstrate that each component was earned.`,
      },
      {
        heading: 'Documenting Billing Eligibility',
        level: 2,
        content: `Documentation is the foundation of CROA billing compliance. For every billing period, you should be able to demonstrate:

1. **What services were agreed to** — Your signed service agreement defines the scope.
2. **What services were performed** — Activity logs, sent letters, bureau responses, client communications.
3. **When services were performed** — Timestamps on all actions.
4. **Who performed the services** — User attribution in your audit log.
5. **That billing occurred after services were performed** — Invoice date after service completion date.

This documentation should be maintained in your credit repair software's audit log. The log should be immutable — standard users should not be able to edit or delete entries.

If you are ever challenged on a billing dispute or face a regulatory inquiry, this documentation is your defense.`,
      },
      {
        heading: 'Common Billing Mistakes',
        level: 2,
        content: `The most common CROA billing mistakes include:

**Charging upfront fees** — Any fee charged before services are performed is a potential CROA violation. This includes "setup fees," "enrollment fees," and "processing fees" for work not yet done.

**Auto-billing at the start of the month** — Billing at the beginning of a period for work you plan to do is not compliant. Bill after the work is done.

**Inadequate documentation** — If you cannot show what services were performed, you cannot justify the charge. Documentation is not optional.

**Vague service definitions** — If your service agreement does not clearly define what constitutes a completed service, you have no clear standard for when billing is appropriate.

**Ignoring state law** — Some states have additional restrictions beyond CROA. Research your state's requirements.`,
      },
      {
        heading: 'How Software Supports Compliant Billing',
        level: 2,
        content: `Modern credit repair software can significantly reduce billing compliance risk by:

- **Tracking service completion** — Automatically recording when letters are sent, responses are received, and services are documented.
- **Generating billing eligibility indicators** — Showing which clients have completed services that qualify for billing.
- **Maintaining immutable audit logs** — Creating a timestamped, user-attributed record of all activity that cannot be altered.
- **Supporting arrears billing** — Making it easy to generate invoices after services are documented, not before.
- **Documenting the CROA workflow** — Tracking disclosure delivery, contract execution, and cancellation periods.

FixMy.Money is designed around CROA-compliant billing workflows. The platform tracks completed services, maintains immutable audit logs, and generates billing eligibility indicators based on documented activity.`,
      },
    ],
    faqs: [
      {
        question: 'Can I charge a setup fee when a client signs up?',
        answer: 'CROA generally prohibits charging fees before services are performed. Whether a setup fee is compliant depends on whether actual services were performed during setup. Consult an attorney to structure your fees correctly.',
      },
      {
        question: 'What documentation do I need to justify a monthly billing charge?',
        answer: 'You need to document what services were performed during the billing period — letters sent, responses reviewed, client communications, and any other work done. This documentation should be timestamped and user-attributed in your audit log.',
      },
      {
        question: 'What happens if I violate CROA\'s billing restrictions?',
        answer: 'CROA violations can result in civil liability, including actual damages, punitive damages, and attorney fees. Consult an attorney to ensure your billing practices are compliant.',
      },
    ],
    relatedSlugs: ['credit-repair-audit-logs-explained', 'credit-repair-client-onboarding-checklist', 'how-to-start-a-credit-repair-business-2026'],
    disclaimer: 'This article is for informational purposes only and does not constitute legal advice. CROA compliance requirements are complex and fact-specific. Consult a qualified attorney before structuring your billing model.',
    cta: {
      heading: 'Built for CROA-compliant billing',
      body: 'FixMy.Money tracks completed services, maintains immutable audit logs, and generates billing eligibility indicators — so you can bill with confidence.',
    },
  },
  {
    slug: 'credit-repair-client-onboarding-checklist',
    title: 'Credit Repair Client Onboarding Checklist',
    seoTitle: 'Credit Repair Client Onboarding Checklist 2026 | FixMy.Money',
    metaDescription: 'A step-by-step onboarding checklist for credit repair agencies — covering intake, disclosure delivery, agreement execution, cancellation period, and activating the client.',
    canonicalUrl: `${BASE_URL}/blog/credit-repair-client-onboarding-checklist`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 5, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '7 min read',
    category: 'Operations',
    excerpt: 'A step-by-step onboarding checklist for credit repair agencies — covering intake, disclosure delivery, agreement execution, cancellation period, and activating the client.',
    tableOfContents: [
      'Why Onboarding Process Matters',
      'Phase 1: Initial Consultation',
      'Phase 2: CROA Disclosure',
      'Phase 3: Contract Execution',
      'Phase 4: Cancellation Period',
      'Phase 5: Credit Report Collection',
      'Phase 6: Report Analysis and Planning',
      'Phase 7: Client Activation',
      'Documenting the Onboarding Process',
    ],
    sections: [
      {
        heading: 'Why Onboarding Process Matters',
        level: 2,
        content: `A well-designed onboarding process is the foundation of a compliant, professional credit repair operation. It protects your clients by ensuring they understand what they are signing up for. It protects your business by creating a documented record of every required step. And it sets expectations that reduce disputes, refund requests, and complaints.

Agencies that skip steps or rush through onboarding create compliance risk and client dissatisfaction. Agencies that follow a consistent, documented process build trust and reduce operational problems.

This checklist covers the minimum steps required for a CROA-compliant onboarding. Your attorney may recommend additional steps based on your state's laws and your specific business model.`,
      },
      {
        heading: 'Phase 1: Initial Consultation',
        level: 2,
        content: `**Before any contract is signed or fee is discussed:**

☐ Conduct an initial consultation to understand the client's situation ☐ Review the client's credit reports (or have them pull their own)
☐ Identify the types of items that may be disputable
☐ Set realistic expectations — explain what credit repair can and cannot do
☐ Explain your process, timeline, and pricing
☐ Answer all client questions honestly
☐ Do not make guarantees about outcomes, score increases, or deletions

**Documentation:**
- Note the date and content of the consultation
- Record any specific items discussed
- Document that expectations were set appropriately`,
      },
      {
        heading: 'Phase 2: CROA Disclosure',
        level: 2,
        content: `**Required before any contract is signed:**

☐ Provide the client with the CROA-required written disclosure statement
☐ The disclosure must be a separate document from the contract
☐ The disclosure must include the specific language required by CROA
☐ Give the client time to read and understand the disclosure
☐ Obtain the client's acknowledgment that they received the disclosure
☐ Document the date and method of disclosure delivery

**The CROA disclosure must inform clients:**
- They have the right to dispute inaccurate information themselves for free
- They can contact the credit bureaus directly
- They have a three-day right to cancel any contract
- What you are agreeing to do and what you are not agreeing to do

Consult an attorney to ensure your disclosure document meets current CROA requirements.`,
      },
      {
        heading: 'Phase 3: Contract Execution',
        level: 2,
        content: `**After disclosure delivery:**

☐ Provide the client with the written service agreement
☐ The contract must be in writing — verbal agreements are not sufficient
☐ The contract must include all CROA-required provisions
☐ Give the client time to read the contract
☐ Answer any questions about the contract terms
☐ Obtain the client's signature
☐ Provide the client with a copy of the signed contract
☐ Retain a copy in your records

**Contract must include:**
- Description of services to be performed
- Total cost of services
- Payment terms (structured to comply with CROA's completed-service requirement)
- Start and end dates (or duration)
- Three-day cancellation right
- Any guarantees (note: guarantees of specific outcomes are generally not advisable)`,
      },
      {
        heading: 'Phase 4: Cancellation Period',
        level: 2,
        content: `**After contract signing:**

☐ Do not begin any dispute work during the three-day cancellation period
☐ Do not charge any fees during the cancellation period
☐ Document the contract signing date
☐ Calculate the cancellation deadline (three business days after signing)
☐ Record when the cancellation period expires without cancellation
☐ Only proceed to active work after the cancellation period has passed

**If the client cancels:**
☐ Acknowledge the cancellation in writing
☐ Confirm no fees were charged
☐ Close the client file with appropriate documentation`,
      },
      {
        heading: 'Phase 5: Credit Report Collection',
        level: 2,
        content: `**After the cancellation period:**

☐ Obtain current credit reports from all three bureaus (Equifax, Experian, TransUnion)
☐ Verify the reports are recent (within 30–60 days)
☐ Store reports securely in your credit repair software
☐ Document the date reports were obtained
☐ Verify the client's identity information matches the reports

**Options for obtaining reports:**
- Client pulls their own reports and provides them to you
- You obtain reports through a credit monitoring service (verify compliance with applicable laws)
- Client provides existing reports they have already pulled`,
      },
      {
        heading: 'Phase 6: Report Analysis and Planning',
        level: 2,
        content: `**After reports are obtained:**

☐ Review all three reports thoroughly
☐ Identify potentially inaccurate, unverifiable, or outdated items
☐ Categorize items by bureau and dispute reason
☐ Prioritize items based on impact and disputability
☐ Document your analysis
☐ Prepare a dispute plan
☐ Review the plan with the client
☐ Obtain client approval before proceeding

**Important:** Only dispute items that are genuinely inaccurate, unverifiable, or outdated. Do not dispute accurate negative information. Do not fabricate dispute reasons.`,
      },
      {
        heading: 'Phase 7: Client Activation',
        level: 2,
        content: `**After analysis and planning:**

☐ Confirm all onboarding steps are complete and documented
☐ Confirm the cancellation period has passed
☐ Confirm the client has approved the dispute plan
☐ Update the client's status to "Active" in your software
☐ Begin dispute work according to the approved plan
☐ Set up regular communication schedule with the client
☐ Establish how and when you will report progress

**Ongoing:**
☐ Document all actions taken
☐ Track bureau response deadlines
☐ Communicate progress to the client regularly
☐ Update the client's file with all responses received`,
      },
      {
        heading: 'Documenting the Onboarding Process',
        level: 2,
        content: `Every step of the onboarding process should be documented in your credit repair software with timestamps and user attribution. This documentation serves multiple purposes:

- **Compliance evidence** — Demonstrates that you followed required procedures
- **Billing support** — Shows that services were performed before billing
- **Dispute resolution** — Provides evidence if a client disputes your charges
- **Quality control** — Ensures consistent process across all clients

FixMy.Money's CROA workflow feature tracks each onboarding step, records timestamps, and maintains an immutable audit log of all actions. This documentation is automatically available for any compliance review.`,
      },
    ],
    faqs: [
      {
        question: 'How long does client onboarding take?',
        answer: 'The minimum timeline is determined by the three-day cancellation period. Most agencies complete the full onboarding process in 5–10 business days, including consultation, disclosure, contract signing, cancellation period, and report collection.',
      },
      {
        question: 'Can I start dispute work during the cancellation period?',
        answer: 'No. CROA requires that clients have a three-day right to cancel without penalty. Beginning work during this period creates compliance risk. Wait until the cancellation period has expired.',
      },
      {
        question: 'What happens if I skip the CROA disclosure step?',
        answer: 'Failing to provide the required CROA disclosure before a client signs a contract is a CROA violation. This can result in civil liability. Consult an attorney to ensure your disclosure process is compliant.',
      },
    ],
    relatedSlugs: ['how-croa-billing-workflows-work', 'how-to-start-a-credit-repair-business-2026', 'credit-repair-audit-logs-explained'],
    disclaimer: 'This checklist is for informational purposes only and does not constitute legal advice. CROA requirements are complex and fact-specific. Consult a qualified attorney to ensure your onboarding process is compliant.',
    cta: {
      heading: 'Automate your onboarding workflow',
      body: 'FixMy.Money\'s CROA workflow feature tracks every onboarding step, records timestamps, and maintains an immutable audit log.',
    },
  },
  {
    slug: 'how-to-automate-credit-dispute-workflows',
    title: 'How to Automate Credit Dispute Workflows',
    seoTitle: 'How to Automate Credit Dispute Workflows | FixMy.Money',
    metaDescription: 'Manual dispute management breaks down as client volume grows. This guide covers how to automate dispute generation, tracking, follow-ups, and bureau response management.',
    canonicalUrl: `${BASE_URL}/blog/how-to-automate-credit-dispute-workflows`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 6, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '8 min read',
    category: 'Automation',
    excerpt: 'Manual dispute management breaks down as client volume grows. This guide covers how to automate dispute generation, tracking, follow-ups, and bureau response management.',
    tableOfContents: [
      'Why Manual Dispute Management Breaks Down',
      'What Can Be Automated',
      'What Should Not Be Automated',
      'Dispute Letter Generation',
      'Response Tracking and Deadlines',
      'Client Communication Automation',
      'Building an Automated Workflow',
    ],
    sections: [
      {
        heading: 'Why Manual Dispute Management Breaks Down',
        level: 2,
        content: `When you have five clients, manual dispute management is manageable. You can track everything in a spreadsheet, write letters in a word processor, and remember to follow up on responses.

When you have fifty clients, each with disputes at multiple bureaus across multiple rounds, manual management becomes a liability. Things fall through the cracks. Deadlines get missed. Letters go out with errors. Clients don't get updates. Documentation is incomplete.

Automation does not replace human judgment in credit repair — it handles the routine, repetitive tasks so your team can focus on the work that requires expertise and attention.`,
      },
      {
        heading: 'What Can Be Automated',
        level: 2,
        content: `**Letter generation**
AI-assisted letter generation can produce customized dispute letters based on the specific account, bureau, and dispute reason. This is one of the highest-value automation opportunities because it saves significant time while maintaining quality — as long as human review is required before sending.

**Response deadline tracking**
Bureaus have 30 days to respond to disputes (45 days in some circumstances). Automated deadline tracking ensures you never miss a follow-up window.

**Client progress updates**
Automated status updates — "Your Round 2 letters have been sent" — keep clients informed without requiring manual communication for every routine milestone.

**Document organization**
Automatic filing of uploaded documents, bureau responses, and generated letters into the correct client folders.

**Billing eligibility tracking**
Automatic tracking of completed services to identify when billing is appropriate.

**Workflow stage progression**
Automatic advancement through workflow stages when prerequisites are met — for example, moving a client from "Cancellation Period" to "Active" after the three-day window expires.`,
      },
      {
        heading: 'What Should Not Be Automated',
        level: 2,
        content: `Not everything in credit repair should be automated. Some decisions require human judgment:

**Dispute reason selection** — AI can suggest dispute reasons, but a human should verify that the suggested reason is accurate and appropriate for the specific item. Never automate the selection of dispute reasons without human review.

**Letter sending** — Letters should not be sent automatically without human review. This is both a quality control measure and a compliance safeguard. AI-generated content must be reviewed before it is sent.

**Bureau response analysis** — When a bureau responds to a dispute, a human should review the response and determine the appropriate next step.

**Client communication about sensitive matters** — Automated updates for routine milestones are fine. But communications about dispute outcomes, billing issues, or client concerns should involve a human.

**Billing** — While billing eligibility can be tracked automatically, the actual billing decision should involve human review of the documentation.`,
      },
      {
        heading: 'Dispute Letter Generation',
        level: 2,
        content: `AI-assisted letter generation is one of the most valuable automation features in modern credit repair software. Here is how it works in a well-designed system:

1. **Credit report analysis** — AI analyzes the uploaded credit report and identifies potentially disputable items.
2. **Dispute reason suggestion** — AI suggests appropriate dispute reasons for each item based on the account type and reported information.
3. **Human review** — A staff member reviews the AI suggestions and approves, modifies, or rejects each one.
4. **Letter generation** — The system generates customized dispute letters for approved items.
5. **Human review of letters** — A staff member reviews the generated letters before they are sent.
6. **Sending** — Letters are sent after human approval.

This workflow captures the efficiency benefits of AI while maintaining the human oversight required for quality and compliance.

**Important:** AI output should never be sent without human review. AI cannot guarantee outcomes and should not invent dispute reasons or account facts.`,
      },
      {
        heading: 'Response Tracking and Deadlines',
        level: 2,
        content: `Bureau response tracking is one of the most operationally important automation opportunities. When a dispute letter is sent, the clock starts on the bureau's response window.

**What automated tracking should do:**
- Record the date each letter was sent
- Calculate the response deadline (typically 30 days)
- Alert staff when a deadline is approaching
- Flag overdue responses
- Track whether a response was received and what it contained

**What to do with responses:**
- Upload bureau responses to the client's file
- Review the response to determine the outcome
- Update the dispute status accordingly
- Determine whether follow-up is needed
- Document the outcome in the audit log`,
      },
      {
        heading: 'Client Communication Automation',
        level: 2,
        content: `Clients want to know what is happening with their case. Automated communication for routine milestones reduces the burden on your team while keeping clients informed.

**Appropriate automation:**
- "Your onboarding is complete and we have received your credit reports."
- "Your Round 1 dispute letters have been sent to all three bureaus." -"We have received a response from Equifax. We are reviewing it and will update you shortly." -"Your monthly progress report is ready."

**Not appropriate for automation:**
- Communicating specific dispute outcomes (requires human review)
- Responding to client questions or concerns
- Discussing billing issues
- Any communication that requires judgment about the client's specific situation`,
      },
      {
        heading: 'Building an Automated Workflow',
        level: 2,
        content: `A well-designed automated dispute workflow looks like this:

**Stage 1: Onboarding**
→ Automated: Disclosure delivery tracking, cancellation period countdown, document request reminders
→ Human: Consultation, contract review, report analysis

**Stage 2: Initial Disputes**
→ Automated: AI analysis, letter generation (with human review), deadline tracking, client notification
→ Human: Dispute reason approval, letter review, sending authorization

**Stage 3: Response Management**
→ Automated: Response deadline alerts, document filing, status updates
→ Human: Response review, outcome determination, next-step decision

**Stage 4: Follow-Up Rounds**
→ Automated: Round scheduling, letter generation (with human review), deadline tracking
→ Human: Strategy decisions, letter review, client communication about outcomes

**Stage 5: Completion**
→ Automated: Completion documentation, billing eligibility confirmation, final report generation
→ Human: Final review, client communication, file closure

FixMy.Money's workflow automation engine supports this entire process with built-in human review checkpoints at every critical step.`,
      },
    ],
    faqs: [
      {
        question: 'Can I automate sending dispute letters without human review?',
        answer: 'This is not recommended. AI-generated content should always be reviewed by an authorized user before it is sent. Automated sending without review creates quality and compliance risks.',
      },
      {
        question: 'How much time can automation save in a credit repair business?',
        answer: 'This varies significantly based on client volume and current processes. Agencies that move from fully manual processes to automated workflows typically report significant time savings on routine tasks, allowing staff to focus on higher-value work.',
      },
      {
        question: 'What is the most important workflow to automate first?',
        answer: 'Response deadline tracking is often the highest-priority automation because missed deadlines have direct compliance and client service implications. Letter generation with human review is typically the highest time-saver.',
      },
    ],
    relatedSlugs: ['how-croa-billing-workflows-work', 'credit-repair-audit-logs-explained', 'best-credit-repair-software-2026'],
    disclaimer: 'This article is for informational purposes only. Automation decisions should be made with appropriate human oversight. AI-generated content must be reviewed before use.',
    cta: {
      heading: 'Automate your dispute workflows',
      body: 'FixMy.Money includes AI-assisted letter generation, automated deadline tracking, and workflow automation — all with built-in human review checkpoints.',
    },
  },
  {
    slug: 'credit-repair-audit-logs-explained',
    title: 'Credit Repair Audit Logs Explained',
    seoTitle: 'Credit Repair Audit Logs Explained | FixMy.Money',
    metaDescription: 'Why audit logs matter for credit repair agencies, what they should record, and how immutable audit trails support compliance documentation and dispute resolution.',
    canonicalUrl: `${BASE_URL}/blog/credit-repair-audit-logs-explained`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 7, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '6 min read',
    category: 'Compliance',
    excerpt: 'Why audit logs matter for credit repair agencies, what they should record, and how immutable audit trails support compliance documentation and dispute resolution.',
    tableOfContents: [
      'What Is an Audit Log?',
      'Why Audit Logs Matter for Credit Repair',
      'What a Good Audit Log Records',
      'Immutability: Why It Matters',
      'Using Audit Logs for Billing Documentation',
      'Audit Logs in Legal and Regulatory Contexts',
    ],
    sections: [
      {
        heading: 'What Is an Audit Log?',
        level: 2,
        content: `An audit log is a chronological record of actions taken within a system. In a credit repair context, it records every significant action — who did what, when, and to which client record.

A good audit log is:
- **Comprehensive** — Records all significant actions, not just errors
- **Timestamped** — Every entry has an accurate date and time
- **User-attributed** — Every entry identifies who performed the action
- **Immutable** — Entries cannot be edited or deleted after they are created
- **Searchable** — You can find specific events quickly

Audit logs are not just a technical feature — they are a compliance tool, a billing documentation tool, and a legal protection tool.`,
      },
      {
        heading: 'Why Audit Logs Matter for Credit Repair',
        level: 2,
        content: `Credit repair agencies face several situations where audit logs are essential:

**CROA billing compliance** — To charge clients under CROA's completed-service requirement, you need to demonstrate what services were performed and when. Your audit log is the primary evidence of this.

**Client disputes** — If a client disputes a charge or claims services were not performed, your audit log provides the evidence to resolve the dispute.

**Regulatory inquiries** — If a state regulator or the FTC inquires about your practices, your audit log demonstrates that you followed required procedures.

**Legal proceedings** — In litigation, audit logs can be critical evidence. An immutable log that shows exactly what happened and when is far more credible than reconstructed records.

**Internal quality control** — Audit logs help managers verify that staff are following procedures correctly and identify training needs.`,
      },
      {
        heading: 'What a Good Audit Log Records',
        level: 2,
        content: `A comprehensive credit repair audit log should record:

**Client lifecycle events:**
- Client created
- Onboarding steps completed (disclosure delivered, contract signed, cancellation period started/ended)
- Client status changes
- Client closed/completed

**Dispute activity:**
- Dispute created
- Letter generated
- Letter reviewed and approved
- Letter sent
- Bureau response received
- Dispute outcome recorded

**Document activity:**
- Document uploaded
- Document viewed
- Document shared with client

**Communication:**
- Message sent to client
- Message received from client
- Email sent

**Billing:**
- Service completed (billing eligibility established)
- Invoice generated
- Payment received

**User activity:**
- User logged in
- User accessed client record
- User modified client data
- User role changed

**System events:**
- Integration errors
- Failed operations`,
      },
      {
        heading: 'Immutability: Why It Matters',
        level: 2,
        content: `An audit log is only valuable if it cannot be altered. A log that can be edited is not a reliable record — it is just a document that someone could have changed.

**What immutability means:**
- Audit log entries cannot be edited after they are created
- Audit log entries cannot be deleted by standard users
- The log accurately reflects what actually happened, not what someone wishes had happened

**How immutability is implemented:**
- Database-level restrictions that prevent UPDATE and DELETE operations on audit log tables
- Role-based access controls that limit who can access the audit log
- Cryptographic techniques in some systems that make tampering detectable

**Why this matters for credit repair:**
If you are ever in a dispute with a client or a regulatory inquiry, an immutable audit log is credible evidence. A log that could have been altered is not.

FixMy.Money's audit log is immutable by design. Standard users cannot edit or delete audit entries. The log accurately reflects the complete history of every client record.`,
      },
      {
        heading: 'Using Audit Logs for Billing Documentation',
        level: 2,
        content: `Under CROA's completed-service billing requirement, your audit log is your primary billing documentation. Here is how to use it effectively:

**Before generating an invoice:**
1. Review the audit log for the billing period
2. Identify all services performed (letters sent, responses reviewed, client communications, etc.)
3. Verify that services were performed before the billing date
4. Generate the invoice with reference to the documented services

**What the audit log should show:**
- Specific actions taken during the billing period
- Timestamps confirming actions occurred before billing
- User attribution confirming who performed the work
- Client record references confirming work was done for the specific client

**Best practice:**
Generate a billing summary from your audit log for each client each billing period. This summary becomes part of your billing documentation and can be provided to clients who request an explanation of charges.`,
      },
      {
        heading: 'Audit Logs in Legal and Regulatory Contexts',
        level: 2,
        content: `Credit repair agencies operate in a regulated environment. Audit logs play an important role in several legal and regulatory contexts:

**FTC enforcement** — The FTC enforces CROA and has taken action against credit repair companies for various violations. Audit logs that demonstrate compliant practices are valuable in any FTC inquiry.

**State regulatory compliance** — Many states have credit services organization laws with their own requirements. Audit logs help demonstrate compliance with these requirements.

**Civil litigation** — Client lawsuits alleging CROA violations, fraud, or breach of contract are not uncommon in the credit repair industry. Audit logs are often the most important evidence in these cases.

**Chargebacks and payment disputes** — When clients dispute charges with their credit card company, audit logs documenting the services performed are essential to winning the dispute.

Maintain your audit logs for at least the period required by applicable law, and longer if possible. Consult an attorney about your specific record retention obligations.`,
      },
    ],
    faqs: [
      {
        question: 'How long should I keep audit logs?',
        answer: 'Consult an attorney about your specific record retention obligations. As a general practice, maintaining records for at least three to five years is common in the credit repair industry, but your specific obligations may differ.',
      },
      {
        question: 'Can clients access their audit log?',
        answer: 'This depends on your platform and your policies. Some agencies provide clients with access to their own activity history through a client portal. Full audit logs are typically internal records.',
      },
      {
        question: 'What if my current software does not have an immutable audit log?',
        answer: 'This is a significant compliance gap. Consider switching to a platform that provides immutable audit logging. In the meantime, document your activities in a way that creates a reliable record.',
      },
    ],
    relatedSlugs: ['how-croa-billing-workflows-work', 'credit-repair-client-onboarding-checklist', 'how-to-automate-credit-dispute-workflows'],
    disclaimer: 'This article is for informational purposes only and does not constitute legal advice. Consult a qualified attorney about your specific record retention and compliance obligations.',
    cta: {
      heading: 'Immutable audit logs built in',
      body: 'FixMy.Money maintains a complete, immutable audit log of all client activity — timestamped, user-attributed, and available for compliance review.',
    },
  },
  {
    slug: 'white-label-credit-repair-software',
    title: 'White-Label Credit Repair Software Guide',
    seoTitle: 'White-Label Credit Repair Software Guide 2026 | FixMy.Money',
    metaDescription: 'What white-label credit repair software actually includes, what to look for, and how to evaluate whether white-labeling is worth it for your agency.',
    canonicalUrl: `${BASE_URL}/blog/white-label-credit-repair-software`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 8, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '7 min read',
    category: 'Software',
    excerpt: 'What white-label credit repair software actually includes, what to look for, and how to evaluate whether white-labeling is worth it for your agency.',
    tableOfContents: [
      'What Is White-Label Credit Repair Software?',
      'What White Labeling Typically Includes',
      'What White Labeling Does Not Include',
      'When White Labeling Makes Sense',
      'Evaluating White-Label Options',
      'Technical Considerations',
    ],
    sections: [
      {
        heading: 'What Is White-Label Credit Repair Software?',
        level: 2,
        content: `White-label credit repair software allows agencies to present the platform under their own brand — with their logo, colors, and domain name — rather than the software vendor's brand. From the client's perspective, they are using "Northstar Credit Solutions' platform" rather than "FixMy.Money." The underlying software is the same, but the branding is customized to the agency.

White labeling is common in B2B SaaS and is particularly valuable in service businesses where the agency's brand is central to the client relationship.`,
      },
      {
        heading: 'What White Labeling Typically Includes',
        level: 2,
        content: `**Branding customization:**
- Custom logo in the platform interface
- Custom color scheme
- Custom agency name throughout the platform
- Removal of the software vendor's branding

**Domain customization:**
- Custom subdomain (e.g., portal.northstarcredit.com)
- Custom email sender domain for automated communications

**Client portal branding:**
- Branded client-facing portal
- Custom welcome messages
- Branded email notifications

**Document branding:**
- Agency logo on generated dispute letters
- Branded invoice templates
- Branded client reports`,
      },
      {
        heading: 'What White Labeling Does Not Include',
        level: 2,
        content: `White labeling is a branding feature, not a separate software product. It does not include:

- A separate codebase or infrastructure
- Different features from the standard platform
- Separate data storage (your data is still on the vendor's infrastructure)
- Legal separation from the vendor's terms of service
- Separate compliance responsibility (you are still responsible for your own CROA compliance)

Understanding these limitations is important. White labeling presents your brand to clients, but the underlying platform, security, and compliance features are still the vendor's responsibility.`,
      },
      {
        heading: 'When White Labeling Makes Sense',
        level: 2,
        content: `White labeling is worth the additional cost when:

**Your brand is central to client relationships** — If clients choose you specifically because of your agency's reputation, maintaining your brand throughout the client experience reinforces that relationship.

**You have a professional brand identity** — If you have invested in professional branding (logo, colors, visual identity), white labeling lets you extend that identity into your software.

**You are concerned about client poaching** — If clients can see the software vendor's name, they might contact the vendor directly. White labeling removes this risk.

**You offer a premium service** — A branded, professional client portal reinforces a premium service positioning.

White labeling may not be worth the cost if you are a solo operator just starting out, if your clients are not particularly brand-conscious, or if the additional cost is not justified by your current revenue.`,
      },
      {
        heading: 'Evaluating White-Label Options',
        level: 2,
        content: `When evaluating white-label credit repair software, ask:

**What exactly is customizable?**
- Logo only, or full color scheme?
- Client portal only, or the full platform?
- Email notifications?
- Generated documents?

**What is the custom domain setup process?**
- Do you need to configure DNS records?
- Is SSL included?
- How long does setup take?

**What are the limitations?**
- Are there any vendor branding elements that cannot be removed?
- Are there any pages or features that are not white-labeled?

**What is the additional cost?**
- Is white labeling included in a plan tier or is it an add-on?
- Are there setup fees?

**What support is provided?**
- Is there documentation for the setup process?
- Is technical support available if something breaks?

FixMy.Money includes white-label capabilities in the Agency plan, including custom logo, color scheme, and client portal branding.`,
      },
      {
        heading: 'Technical Considerations',
        level: 2,
        content: `If you are setting up a custom domain for your white-labeled platform, you will need to:

1. **Configure DNS records** — Point a subdomain (e.g., portal.youragency.com) to the software vendor's servers. This typically involves adding a CNAME record in your domain registrar's DNS settings.

2. **Verify SSL** — Ensure the custom domain has a valid SSL certificate. Most platforms handle this automatically, but verify before going live.

3. **Update client communications** — Update any existing client communications to reference the new portal URL.

4. **Test thoroughly** — Before directing clients to the new branded portal, test all features to ensure they work correctly under the custom domain.

5. **Update your website** — If your website references the client portal, update those links to the new branded URL.`,
      },
    ],
    faqs: [
      {
        question: 'Does white-label software mean I own the software?',
        answer: 'No. White labeling is a branding feature. You are still using the vendor\'s software under a license. You do not own the underlying code or infrastructure.',
      },
      {
        question: 'Can clients tell they are using white-label software?',
        answer: 'With proper white labeling, clients see only your brand. However, technically sophisticated clients may be able to identify the underlying platform through various means.',
      },
      {
        question: 'Is white labeling worth the extra cost for a new agency?',
        answer: 'For most new agencies, white labeling is not the highest priority. Focus first on building a compliant operation and delivering good results. Add white labeling when your brand and client volume justify the investment.',
      },
    ],
    relatedSlugs: ['best-credit-repair-software-2026', 'credit-repair-cloud-alternatives-2026', 'how-to-start-a-credit-repair-business-2026'],
    disclaimer: 'This article is for informational purposes only. White-label features vary by platform. Verify current capabilities directly with vendors.',
    cta: {
      heading: 'White-label your credit repair platform',
      body: 'FixMy.Money Agency plan includes white-label branding for your client portal, dispute letters, and communications.',
    },
  },
  {
    slug: 'credit-repair-software-pricing-guide-2026',
    title: 'Credit Repair Software Pricing Guide 2026',
    seoTitle: 'Credit Repair Software Pricing Guide 2026 | FixMy.Money',
    metaDescription: 'A transparent breakdown of credit repair software pricing in 2026 — what drives cost, what to expect at each price tier, and how to evaluate total cost of ownership.',
    canonicalUrl: `${BASE_URL}/blog/credit-repair-software-pricing-guide-2026`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 9, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '8 min read',
    category: 'Software',
    excerpt: 'A transparent breakdown of credit repair software pricing in 2026 — what drives cost, what to expect at each price tier, and how to evaluate total cost of ownership.',
    tableOfContents: [
      'How Credit Repair Software Is Priced',
      'What You Get at Each Price Tier',
      'Hidden Costs to Watch For',
      'Total Cost of Ownership',
      'Annual vs. Monthly Billing',
      'When to Upgrade',
    ],
    sections: [
      {
        heading: 'How Credit Repair Software Is Priced',
        level: 2,
        content: `Credit repair software vendors use several pricing models:

**Flat monthly fee** — A fixed price per month regardless of client volume. This is the most common model for small to mid-size agencies. Predictable cost, easy to budget.

**Per-client fee** — A fee for each active client. This model scales with your business but can become expensive at high client volumes.

**Tiered pricing** — Different plan tiers with different feature sets and client limits. Most modern platforms use this model.

**Usage-based pricing** — Fees based on specific usage metrics like AI queries, letters generated, or storage used. Less common but worth understanding if a platform uses this model.

**Enterprise pricing** — Custom pricing for large agencies with specific requirements. Typically negotiated directly with the vendor.

Most agencies in 2026 pay between $49 and $249 per month for their primary credit repair software platform.`,
      },
      {
        heading: 'What You Get at Each Price Tier',
        level: 2,
        content: `**Entry tier ($49–$79/month)**
Typically includes: basic client management, dispute letter templates, document storage, and CROA workflow support. Client limits are usually 25–50 active clients. AI features may be limited or absent. Support is typically self-service.

**Mid tier ($99–$149/month)**
Typically includes: everything in entry tier plus AI-assisted analysis, automation features, client portal, analytics, and team management. Client limits are usually 100–200 active clients. Support typically includes email and chat.

**Agency tier ($199–$249/month)**
Typically includes: everything in mid tier plus white labeling, advanced analytics, API access, priority support, and higher client limits. Suitable for agencies with 200+ active clients.

**Enterprise (custom pricing)**
For large agencies with specific requirements: custom integrations, dedicated support, SLA guarantees, and custom feature development.`,
      },
      {
        heading: 'Hidden Costs to Watch For',
        level: 2,
        content: `The advertised monthly price is rarely the total cost. Watch for:

**Per-client overage fees** — If you exceed your plan's client limit, you may be charged per additional client. Understand the overage pricing before you hit the limit.

**Storage overage fees** — Credit reports and documents take up storage. Understand the storage limits and overage costs.

**AI usage limits** — Some platforms limit AI queries per month. Understand what happens when you hit the limit.

**Setup and onboarding fees** — Some vendors charge for initial setup or onboarding assistance.

**Training fees** — Some vendors charge for training beyond basic documentation.

**Integration fees** — Connecting to third-party services (payment processors, email providers, etc.) may have additional costs.

**Annual contract penalties** — If you sign an annual contract and need to cancel early, understand the penalty.`,
      },
      {
        heading: 'Total Cost of Ownership',
        level: 2,
        content: `When evaluating credit repair software pricing, calculate total cost of ownership rather than just the monthly fee:

**Direct costs:**
- Monthly software fee
- Overage fees (estimated)
- Add-on features
- Annual vs. monthly billing difference

**Indirect costs:**
- Time spent on manual workarounds for missing features
- Training time for new staff
- Support time for platform issues
- Migration costs if you switch platforms

**Value delivered:**
- Time saved per week by automation
- Compliance risk reduced by proper documentation
- Client satisfaction improved by better communication
- Revenue protected by proper billing documentation

A platform that costs $129/month but saves your team 5 hours per week is a better value than a $49/month platform that requires 5 hours of manual workarounds.`,
      },
      {
        heading: 'Annual vs. Monthly Billing',
        level: 2,
        content: `Most credit repair software platforms offer a discount for annual billing — typically 15–25% off the monthly rate.

**When annual billing makes sense:**
- You have been using the platform for at least 3–6 months and are confident in it
- The discount is meaningful (at least 15%)
- Your business is stable enough to commit for a year
- The cancellation terms are reasonable if your situation changes

**When to stick with monthly billing:**
- You are evaluating the platform
- Your business is in a growth phase with uncertain needs
- You want flexibility to switch if a better option emerges
- The annual discount is small

FixMy.Money offers approximately 20% off for annual billing. Monthly billing is available with no long-term commitment.`,
      },
      {
        heading: 'When to Upgrade',
        level: 2,
        content: `Signs that you have outgrown your current plan:

- You are regularly hitting client limits
- You need features only available in higher tiers
- Your team is spending significant time on manual workarounds
- You are losing clients because of limited capabilities
- Your support needs exceed what your current tier provides

Signs that you do not need to upgrade yet:

- You have significant headroom in your current plan
- You are not using all the features in your current tier
- The additional features in higher tiers do not address your current pain points

Upgrade when the additional value clearly exceeds the additional cost. Do not upgrade just because a higher tier exists.`,
      },
    ],
    faqs: [
      {
        question: 'What is the cheapest credit repair software available?',
        answer: 'Entry-tier platforms start around $49/month. However, the cheapest option is rarely the best value. Evaluate total cost of ownership and the compliance features included at each price point.',
      },
      {
        question: 'Is there free credit repair software?',
        answer: 'Some platforms offer free tiers with very limited features. For a professional agency operation, a paid platform with proper compliance features is generally necessary.',
      },
      {
        question: 'How do I know if I am getting good value from my credit repair software?',
        answer: 'Calculate the time your team saves each week compared to manual processes, the compliance risk reduced by proper documentation, and the client satisfaction improvements. If the value exceeds the cost, you are getting good value.',
      },
    ],
    relatedSlugs: ['best-credit-repair-software-2026', 'credit-repair-cloud-alternatives-2026', 'white-label-credit-repair-software'],
    disclaimer: 'Pricing information is based on publicly available data and may not reflect current pricing. Verify current pricing directly with vendors.',
    cta: {
      heading: 'Transparent pricing, no surprises',
      body: 'FixMy.Money offers clear, tiered pricing with a 14-day trial for $1. Payment method required to start.',
    },
  },
  {
    slug: 'what-credit-repair-agencies-should-track',
    title: 'What Credit Repair Agencies Should Track',
    seoTitle: 'What Credit Repair Agencies Should Track | FixMy.Money',
    metaDescription: 'The key metrics, records, and documentation that credit repair agencies need to track — for operations, compliance, billing, and business growth.',
    canonicalUrl: `${BASE_URL}/blog/what-credit-repair-agencies-should-track`,
    author: 'Adam Hamilton',
    authorTitle: 'Founder, FixMy.Money',
    publishedDate: 'June 10, 2026',
    updatedDate: 'June 20, 2026',
    readingTime: '9 min read',
    category: 'Operations',
    excerpt: 'The key metrics, records, and documentation that credit repair agencies need to track — for operations, compliance, billing, and business growth.',
    tableOfContents: [
      'Why Tracking Matters',
      'Client Records to Maintain',
      'Compliance Documentation',
      'Dispute Tracking',
      'Billing Records',
      'Business Metrics',
      'Building a Tracking System',
    ],
    sections: [
      {
        heading: 'Why Tracking Matters',
        level: 2,
        content: `Credit repair agencies that track the right information operate more efficiently, maintain better compliance, and make better business decisions. Agencies that do not track systematically face compliance risk, billing disputes, and operational chaos as they grow.

Tracking serves four distinct purposes:
1. **Compliance** — Demonstrating that you followed required procedures
2. **Billing** — Documenting completed services to justify charges
3. **Operations** — Managing client work efficiently
4. **Business growth** — Understanding what is working and what is not`,
      },
      {
        heading: 'Client Records to Maintain',
        level: 2,
        content: `For each client, maintain:

**Identity and contact information:**
- Full legal name
- Contact information (phone, email, address)
- Date of birth (for credit report verification)
- Social Security number (stored securely, access controlled)

**Onboarding documentation:**
- Date of initial consultation
- CROA disclosure delivery date and method
- Signed service agreement
- Cancellation period start and end dates
- Client activation date

**Credit report history:**
- All credit reports obtained, with dates
- Initial scores from all three bureaus
- Current scores from all three bureaus
- Score history over time

**Communication history:**
- All messages sent and received
- Dates and content of all communications
- Method of communication (email, phone, portal)`,
      },
      {
        heading: 'Compliance Documentation',
        level: 2,
        content: `Compliance documentation is the foundation of a defensible credit repair operation:

**CROA compliance records:**
- Disclosure delivery confirmation for every client
- Signed contracts for every client
- Cancellation period documentation for every client
- Completed-service documentation for every billing period

**Dispute compliance records:**
- Basis for each dispute (why the item is believed to be inaccurate)
- Evidence supporting each dispute
- Bureau responses to each dispute
- Outcome of each dispute

**Billing compliance records:**
- Services performed during each billing period
- Date services were performed (must be before billing date)
- Invoice date and amount
- Payment received date

All compliance documentation should be maintained in an immutable audit log with timestamps and user attribution.`,
      },
      {
        heading: 'Dispute Tracking',
        level: 2,
        content: `For each dispute, track:

**Dispute details:**
- Client name and ID
- Bureau (Equifax, Experian, TransUnion)
- Account name and number (masked)
- Dispute reason
- Round number
- Letter sent date
- Response deadline
- Response received date
- Response content
- Outcome (removed, updated, verified, no change)

**Aggregate dispute metrics:**
- Total disputes per client
- Disputes by bureau
- Disputes by round
- Resolution rate
- Average time to resolution

This data helps you understand which dispute strategies are most effective and identify patterns in bureau responses.`,
      },
      {
        heading: 'Billing Records',
        level: 2,
        content: `Billing records are both a business necessity and a compliance requirement:

**Per-client billing records:**
- Services performed each billing period (with dates)
- Invoice number, date, and amount
- Payment received date and method
- Outstanding balance
- Payment history

**Aggregate billing metrics:**
- Monthly recurring revenue
- Revenue per client
- Average client lifetime value
- Churn rate
- Outstanding receivables

**Billing compliance documentation:**
- Evidence that services were performed before billing
- Audit log entries supporting each invoice
- Client acknowledgment of charges (where applicable)`,
      },
      {
        heading: 'Business Metrics',
        level: 2,
        content: `Beyond compliance and operations, track these business metrics to understand and grow your agency:

**Client acquisition:**
- New clients per month
- Lead source (how clients found you)
- Conversion rate (leads to clients)
- Cost per acquisition

**Client retention:**
- Average client duration
- Churn rate
- Reasons for cancellation

**Service delivery:**
- Average disputes per client
- Average resolution rate
- Average score improvement (note: this is descriptive, not a guarantee)
- Average time to completion

**Revenue:**
- Monthly recurring revenue
- Revenue growth rate
- Revenue per client
- Revenue by service type

**Team productivity:**
- Clients per staff member
- Letters generated per week
- Response time to client inquiries`,
      },
      {
        heading: 'Building a Tracking System',
        level: 2,
        content: `The most important thing about a tracking system is that it is used consistently. A perfect system that is not followed is worse than a simple system that is.

**Principles for a good tracking system:**

1. **Centralize everything** — Use one platform for all client records, not multiple disconnected tools.
2. **Make it easy to record** — If recording information is burdensome, it will not happen consistently.
3. **Automate where possible** — Let software automatically record routine events (letter sent, response received) rather than relying on manual entry.
4. **Review regularly** — Set aside time each week to review your tracking data and act on what you find.
5. **Protect sensitive data** — Client data, especially SSNs and financial information, must be stored securely with appropriate access controls.

FixMy.Money is designed to be the central tracking system for credit repair agencies — combining client management, dispute tracking, compliance documentation, billing records, and business analytics in a single platform.`,
      },
    ],
    faqs: [
      {
        question: 'How long should I keep client records?',
        answer: 'Consult an attorney about your specific record retention obligations. As a general practice, maintaining records for at least three to five years after a client relationship ends is common, but your specific obligations may differ based on applicable law.',
      },
      {
        question: 'What is the most important thing to track for CROA compliance?',
        answer: 'Completed-service documentation — evidence that services were performed before billing — is the most critical compliance record. This is what you need to defend any billing dispute or regulatory inquiry.',
      },
      {
        question: 'Do I need special software to track all of this?',
        answer: 'You can track some of this manually, but as your client volume grows, manual tracking becomes unreliable. Purpose-built credit repair software like FixMy.Money automates much of this tracking and maintains the immutable audit logs required for compliance.',
      },
    ],
    relatedSlugs: ['credit-repair-audit-logs-explained', 'how-croa-billing-workflows-work', 'credit-repair-client-onboarding-checklist'],
    disclaimer: 'This article is for informational purposes only and does not constitute legal advice. Consult a qualified attorney about your specific record retention and compliance obligations.',
    cta: {
      heading: 'Track everything from one platform',
      body: 'FixMy.Money combines client management, dispute tracking, compliance documentation, billing records, and business analytics in a single platform.',
    },
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find(a => a.slug === slug);
}

export function getRelatedArticles(slugs: string[]): Article[] {
  return slugs.map(s => getArticleBySlug(s)).filter(Boolean) as Article[];
}

export function getAllSlugs(): string[] {
  return ARTICLES.map(a => a.slug);
}
