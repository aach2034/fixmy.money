# FixMy.Money Upgrade — Final QA Checklist

**Date:** July 6, 2026
**Environment:** Production (https://fixmy.money)
**Tester:** [Your Name]
**Status:** PENDING

---

## SECTION 1: HOMEPAGE & HERO

- [ ] Hero headline displays correctly: "Run Your Credit Repair Agency From One Platform"
- [ ] Hero subheadline displays correctly
- [ ] Hero trust line visible: "Software only. No consumer credit repair. No guaranteed outcomes. Staff-reviewed AI drafts."
- [ ] Primary CTA "Start Free Trial" clickable and routes to /signup
- [ ] Secondary CTA "View Demo" clickable and routes to /demo-mode
- [ ] Hero video player loads and plays
- [ ] Mobile hero layout responsive (stack on mobile)
- [ ] No console errors on hero section

## SECTION 2: WORKFLOW SECTION

- [ ] Workflow section visible on homepage
- [ ] 9-step workflow displays correctly
- [ ] Workflow copy visible: "FixMy.Money helps agencies document each stage..."
- [ ] All workflow steps labeled correctly
- [ ] Workflow section responsive on mobile
- [ ] No console errors

## SECTION 3: TRUST & COMPLIANCE BLOCK

- [ ] Trust block visible above footer
- [ ] Heading: "Built for professional credit repair agencies"
- [ ] All 7 trust points visible:
  - [ ] Software access for credit repair businesses
  - [ ] Demo data separated from live workspaces
  - [ ] Stripe-secured billing
  - [ ] Role-based team access
  - [ ] Audit log activity tracking
  - [ ] Data export support on Agency+ plans
  - [ ] Software only — no consumer credit repair services
- [ ] Trust block responsive on mobile
- [ ] No console errors

## SECTION 4: HOMEPAGE FAQ

- [ ] FAQ section visible on homepage
- [ ] All 8 FAQs display correctly
- [ ] FAQs are expandable/collapsible
- [ ] FAQ content readable
- [ ] FAQPage schema present in page source
- [ ] No console errors

## SECTION 5: PRICING PAGE

- [ ] Pricing page loads correctly
- [ ] All 4 plans visible: Starter, Professional, Agency, Enterprise
- [ ] Pricing correct:
  - [ ] Starter: $49/mo
  - [ ] Professional: $129/mo (Most Popular badge)
  - [ ] Agency: $249/mo
  - [ ] Enterprise: Custom
- [ ] Annual toggle works (shows ~20% savings)
- [ ] All CTAs say "Start Free Trial" (except Enterprise: "Contact Sales")
- [ ] Trust elements visible on pricing page:
  - [ ] Stripe-secured billing
  - [ ] TLS encryption
  - [ ] Role-based access
  - [ ] Audit log tracking
  - [ ] Data export on Agency+ plans
  - [ ] No credit card for trial
- [ ] Pricing page responsive on mobile
- [ ] No console errors

## SECTION 6: DEMO MODE

- [ ] Demo mode page loads correctly
- [ ] Demo data displays (clients, disputes, etc.)
- [ ] Metric labels updated (if changed from "Items Removed")
- [ ] Demo conversion banner visible: "This is a demo workspace using fictional data. Start a trial to create your real agency workspace."
- [ ] Demo banner has CTA to start trial
- [ ] Guided demo callouts visible (7 steps)
- [ ] Demo layout preserved (no breaking changes)
- [ ] Demo mode page marked noindex in metadata
- [ ] No console errors

## SECTION 7: NEW LANDING PAGES (10 pages)

### Page 1: /credit-repair-stripe-billing
- [ ] Page loads correctly
- [ ] H1: "Credit Repair Billing Software with Stripe"
- [ ] 6 feature cards visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] Metadata correct in page source
- [ ] No console errors

### Page 2: /credit-repair-agency-dashboard
- [ ] Page loads correctly
- [ ] H1: "Credit Repair Agency Dashboard"
- [ ] 6 feature cards visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] No console errors

### Page 3: /credit-repair-audit-log
- [ ] Page loads correctly
- [ ] H1: "Credit Repair Audit Log Software"
- [ ] 6 feature cards visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] No console errors

### Page 4: /credit-repair-white-label-client-portal
- [ ] Page loads correctly
- [ ] H1: "White-Label Credit Repair Client Portal"
- [ ] 6 feature cards visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] No console errors

### Page 5: /credit-repair-business-startup-checklist
- [ ] Page loads correctly
- [ ] H1: "Credit Repair Business Startup Checklist"
- [ ] 4 checklist sections visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] No console errors

### Page 6: /credit-repair-software-for-small-agencies
- [ ] Page loads correctly
- [ ] H1: "Credit Repair Software for Small Agencies"
- [ ] 2 plan cards visible (Starter, Professional)
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] No console errors

### Page 7: /credit-repair-software-with-client-login
- [ ] Page loads correctly
- [ ] H1: "Credit Repair Software with Client Login"
- [ ] 6 feature cards visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] No console errors

### Page 8: /credit-repair-dispute-letter-software
- [ ] Page loads correctly
- [ ] H1: "Credit Repair Dispute Letter Software"
- [ ] 6 feature cards visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible (mentions staff review required)
- [ ] CTA buttons functional
- [ ] No console errors

### Page 9: /credit-repair-crm (updated)
- [ ] Page loads correctly
- [ ] H1: "Credit Repair CRM Software"
- [ ] 6 feature cards visible
- [ ] 4 FAQs visible
- [ ] Legal disclaimer visible
- [ ] CTA buttons functional
- [ ] No console errors

## SECTION 8: TECHNICAL SEO

### Sitemap
- [ ] Sitemap.xml valid (https://fixmy.money/sitemap.xml)
- [ ] All 10 new pages in sitemap
- [ ] All existing pages still in sitemap
- [ ] No duplicate entries
- [ ] All URLs use https://fixmy.money

### Robots.txt
- [ ] Robots.txt valid (https://fixmy.money/robots.txt)
- [ ] Public pages NOT blocked
- [ ] Private pages blocked (dashboard, admin, etc.)
- [ ] Sitemap URL correct
- [ ] Host set to https://fixmy.money

### Metadata
- [ ] Homepage title: "FixMy.Money | Credit Repair Software for Agencies"
- [ ] Homepage description includes "14-day free trial"
- [ ] Pricing page title unique
- [ ] Pricing page description unique
- [ ] All landing pages have unique titles
- [ ] All landing pages have unique descriptions (140-160 chars)
- [ ] All pages have canonical URL
- [ ] No duplicate title tags
- [ ] No duplicate meta descriptions

### Open Graph
- [ ] OG image exists and loads (1200×630px)
- [ ] OG title correct on homepage
- [ ] OG description correct on homepage
- [ ] OG tags present on all landing pages
- [ ] OG image same across all pages (or unique per page)

### Schema Markup
- [ ] Organization schema present in layout.tsx
- [ ] SoftwareApplication schema present on homepage
- [ ] FAQPage schema present on homepage
- [ ] All schemas valid (test with Google Rich Results)
- [ ] No schema errors in console

## SECTION 9: INTERNAL LINKS

- [ ] Homepage links to /pricing
- [ ] Homepage links to /demo-mode
- [ ] Homepage links to /blog
- [ ] Pricing page links to /demo-mode
- [ ] Pricing page links to /contact
- [ ] All landing pages link to /pricing
- [ ] All landing pages link to /demo-mode
- [ ] All landing pages link to homepage
- [ ] No broken internal links (404s)
- [ ] All links use <Link> component (not <a>)

## SECTION 10: COMPLIANCE & SAFETY LANGUAGE

### AI Language
- [ ] No "AI-powered dispute generation" (changed to "AI-assisted")
- [ ] All AI features mention "staff review" or "human approval"
- [ ] Dispute letter page mentions "must be reviewed before sending"
- [ ] No "automatically" language for AI features

### Outcome Language
- [ ] No "Remove negative items" language
- [ ] No "Boost credit scores" language
- [ ] No "Guaranteed results" language
- [ ] No "Automatically repair credit" language
- [ ] Using "Track dispute workflows" language
- [ ] Using "Support compliance documentation" language
- [ ] Using "Generate staff-reviewed drafts" language

### Legal Disclaimers
- [ ] Disclaimer on homepage
- [ ] Disclaimer on pricing page
- [ ] Disclaimer on all 10 landing pages
- [ ] Disclaimer mentions CROA, FCRA, TSR
- [ ] Disclaimer states "software only, no consumer services"
- [ ] Disclaimer states "no guaranteed outcomes"
- [ ] All disclaimers consistent format

## SECTION 11: MOBILE RESPONSIVENESS

- [ ] Homepage responsive on mobile (375px, 768px, 1024px)
- [ ] Pricing page responsive on mobile
- [ ] All landing pages responsive on mobile
- [ ] Demo mode responsive on mobile
- [ ] No horizontal scrolling on mobile
- [ ] CTAs clickable on mobile (min 44px height)
- [ ] Text readable on mobile (no tiny fonts)
- [ ] Images scale properly on mobile
- [ ] Navigation works on mobile

## SECTION 12: FOOTER & NAVIGATION

- [ ] Footer links functional
- [ ] Footer includes legal links (Terms, Privacy, Compliance)
- [ ] Footer includes social links (if applicable)
- [ ] Navigation menu works on desktop
- [ ] Mobile menu works on mobile
- [ ] All nav links functional
- [ ] No broken footer links

## SECTION 13: PERFORMANCE

- [ ] Homepage loads in <3 seconds (desktop)
- [ ] Pricing page loads in <3 seconds (desktop)
- [ ] Landing pages load in <3 seconds (desktop)
- [ ] No console errors
- [ ] No console warnings (except expected)
- [ ] Images optimized (no oversized images)
- [ ] No render-blocking resources

## SECTION 14: BROWSER COMPATIBILITY

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## SECTION 15: ANALYTICS & TRACKING

- [ ] CTA clicks tracked
- [ ] Trial signups tracked
- [ ] Pricing plan selections tracked
- [ ] No tracking errors in console
- [ ] Google Analytics loaded (if applicable)

---

## SUMMARY

**Total Checks:** 150+
**Passed:** ___
**Failed:** ___
**Warnings:** ___

**Overall Status:** ☐ PASS | ☐ PASS WITH WARNINGS | ☐ FAIL

**Notes:**


**Tester Signature:** _________________ **Date:** _________

**Approved By:** _________________ **Date:** _________
