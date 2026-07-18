-- Launch Distribution System Migration
-- Tables: launch_directories, outreach_targets, social_posts, utm_tracking

-- ============================================================
-- ENUMS
-- ============================================================
DROP TYPE IF EXISTS public.directory_status CASCADE;
CREATE TYPE public.directory_status AS ENUM ('pending', 'submitted', 'approved', 'rejected', 'needs_followup');

DROP TYPE IF EXISTS public.directory_category CASCADE;
CREATE TYPE public.directory_category AS ENUM (
  'saas_directory', 'startup_launch', 'software_review', 'fintech_directory',
  'small_business', 'ai_tools', 'credit_repair', 'entrepreneur', 'product_launch', 'social'
);

DROP TYPE IF EXISTS public.outreach_status CASCADE;
CREATE TYPE public.outreach_status AS ENUM ('pending', 'contacted', 'replied', 'published', 'declined');

-- ============================================================
-- LAUNCH DIRECTORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.launch_directories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.directory_category NOT NULL DEFAULT 'saas_directory',
  url TEXT NOT NULL,
  submission_url TEXT,
  requires_login BOOLEAN DEFAULT false,
  free_or_paid TEXT DEFAULT 'free',
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score >= 1 AND relevance_score <= 10),
  domain_authority_estimate INTEGER DEFAULT 0,
  notes TEXT,
  listing_status public.directory_status DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  login_email_used TEXT,
  required_assets TEXT[],
  next_action TEXT,
  follow_up_date DATE,
  utm_link TEXT,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_launch_directories_status ON public.launch_directories(listing_status);
CREATE INDEX IF NOT EXISTS idx_launch_directories_category ON public.launch_directories(category);
CREATE INDEX IF NOT EXISTS idx_launch_directories_user_id ON public.launch_directories(user_id);

-- ============================================================
-- OUTREACH TARGETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outreach_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_url TEXT,
  pitch_angle TEXT,
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score >= 1 AND relevance_score <= 10),
  outreach_status public.outreach_status DEFAULT 'pending',
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outreach_targets_status ON public.outreach_targets(outreach_status);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_user_id ON public.outreach_targets(user_id);

-- ============================================================
-- SOCIAL POSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL,
  platform TEXT NOT NULL,
  theme TEXT NOT NULL,
  post_content TEXT NOT NULL,
  hashtags TEXT[],
  utm_link TEXT,
  scheduled_date DATE,
  posted_at TIMESTAMPTZ,
  post_status TEXT DEFAULT 'draft',
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(post_status);

-- ============================================================
-- UTM TRACKING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.utm_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT NOT NULL DEFAULT 'fixmymoney_launch',
  content TEXT,
  term TEXT,
  full_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  trials INTEGER DEFAULT 0,
  paid_conversions INTEGER DEFAULT 0,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_utm_tracking_source ON public.utm_tracking(source);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.launch_directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_tracking ENABLE ROW LEVEL SECURITY;

-- launch_directories policies
DROP POLICY IF EXISTS "authenticated_manage_launch_directories" ON public.launch_directories;
CREATE POLICY "authenticated_manage_launch_directories"
ON public.launch_directories FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- outreach_targets policies
DROP POLICY IF EXISTS "authenticated_manage_outreach_targets" ON public.outreach_targets;
CREATE POLICY "authenticated_manage_outreach_targets"
ON public.outreach_targets FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- social_posts policies
DROP POLICY IF EXISTS "authenticated_manage_social_posts" ON public.social_posts;
CREATE POLICY "authenticated_manage_social_posts"
ON public.social_posts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- utm_tracking policies
DROP POLICY IF EXISTS "authenticated_manage_utm_tracking" ON public.utm_tracking;
CREATE POLICY "authenticated_manage_utm_tracking"
ON public.utm_tracking FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA: LAUNCH DIRECTORIES
-- ============================================================
DO $$
BEGIN
  -- HIGH PRIORITY DIRECTORIES
  INSERT INTO public.launch_directories (name, category, url, submission_url, requires_login, free_or_paid, relevance_score, domain_authority_estimate, notes, required_assets, utm_link) VALUES
    ('Product Hunt', 'product_launch', 'https://www.producthunt.com', 'https://www.producthunt.com/posts/new', true, 'free', 10, 90, 'Schedule for Tuesday-Thursday 12:01am PST. Need hunter with followers. Prepare 60-char tagline, 260-char description, gallery images.', ARRAY['logo_240x240', 'gallery_images', 'demo_gif', 'tagline_60chars', 'description_260chars'], 'https://fixmy.money?utm_source=producthunt&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('BetaList', 'startup_launch', 'https://betalist.com', 'https://betalist.com/startups/new', true, 'free', 9, 65, 'Submit 2-4 weeks before launch. Requires email signup. Good for early adopters.', ARRAY['logo', 'screenshot', 'short_description', 'email'], 'https://fixmy.money?utm_source=betalist&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Indie Hackers', 'entrepreneur', 'https://www.indiehackers.com', 'https://www.indiehackers.com/products/new', true, 'free', 9, 72, 'Post in Products section. Also post in community forums. Founder story works well here.', ARRAY['logo', 'description', 'revenue_info'], 'https://fixmy.money?utm_source=indiehackers&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Hacker News (Show HN)', 'entrepreneur', 'https://news.ycombinator.com', 'https://news.ycombinator.com/submit', true, 'free', 9, 91, 'Post as "Show HN: FixMy.Money – AI credit repair software for agencies". Be ready to answer technical questions. Post on weekdays 9-11am ET.', ARRAY['demo_url', 'founder_story'], 'https://fixmy.money?utm_source=hackernews&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('SaaSHub', 'saas_directory', 'https://www.saashub.com', 'https://www.saashub.com/add-product', false, 'free', 9, 68, 'Free listing. Good for SEO backlink. Include all features and pricing.', ARRAY['logo', 'screenshots', 'description', 'pricing'], 'https://fixmy.money?utm_source=saashub&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('AlternativeTo', 'software_review', 'https://alternativeto.net', 'https://alternativeto.net/software/add/', true, 'free', 9, 75, 'List as alternative to Credit Repair Cloud. Tag relevant categories.', ARRAY['logo', 'description', 'screenshots'], 'https://fixmy.money?utm_source=alternativeto&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('SourceForge', 'software_review', 'https://sourceforge.net', 'https://sourceforge.net/register/', true, 'free', 8, 93, 'Good DA backlink. List under business/finance software category.', ARRAY['logo', 'description', 'screenshots', 'pricing'], 'https://fixmy.money?utm_source=sourceforge&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Capterra', 'software_review', 'https://www.capterra.com', 'https://www.capterra.com/vendors/sign-up', true, 'paid', 10, 92, 'Free listing available. Paid ads optional. High-intent buyers. Requires detailed profile.', ARRAY['logo', 'screenshots', 'description', 'pricing', 'features_list'], 'https://fixmy.money?utm_source=capterra&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('G2', 'software_review', 'https://www.g2.com', 'https://sell.g2.com/free-listing', true, 'free', 10, 91, 'Free listing. Encourage clients to leave reviews. High SEO value for "credit repair software" keyword.', ARRAY['logo', 'screenshots', 'description', 'pricing', 'features_list'], 'https://fixmy.money?utm_source=g2&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('GetApp', 'software_review', 'https://www.getapp.com', 'https://www.getapp.com/vendors', true, 'free', 9, 88, 'Gartner-owned. Free listing. Good for SMB buyers.', ARRAY['logo', 'screenshots', 'description', 'pricing'], 'https://fixmy.money?utm_source=getapp&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Software Advice', 'software_review', 'https://www.softwareadvice.com', 'https://www.softwareadvice.com/vendors/', true, 'free', 9, 87, 'Gartner-owned. Free listing. Good for credit repair business category.', ARRAY['logo', 'description', 'pricing', 'features_list'], 'https://fixmy.money?utm_source=softwareadvice&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Crozdesk', 'saas_directory', 'https://crozdesk.com', 'https://crozdesk.com/add-software', true, 'free', 8, 62, 'B2B software directory. Good for fintech/business software category.', ARRAY['logo', 'description', 'screenshots', 'pricing'], 'https://fixmy.money?utm_source=crozdesk&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Startup Stash', 'startup_launch', 'https://startupstash.com', 'https://startupstash.com/add-resource/', false, 'free', 8, 58, 'Curated startup resource directory. Good for visibility among founders.', ARRAY['logo', 'short_description', 'url'], 'https://fixmy.money?utm_source=startupstash&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Wellfound (AngelList)', 'startup_launch', 'https://wellfound.com', 'https://wellfound.com/company/new', true, 'free', 8, 82, 'Create company profile. Good for recruiting and investor visibility.', ARRAY['logo', 'description', 'team_info', 'funding_info'], 'https://fixmy.money?utm_source=wellfound&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Crunchbase', 'startup_launch', 'https://www.crunchbase.com', 'https://www.crunchbase.com/organization/new', true, 'free', 9, 92, 'Essential for startup credibility. Free basic listing. Include funding, team, description.', ARRAY['logo', 'description', 'team_info', 'founding_date'], 'https://fixmy.money?utm_source=crunchbase&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('F6S', 'startup_launch', 'https://www.f6s.com', 'https://www.f6s.com/company/add', true, 'free', 7, 72, 'Startup community. Good for accelerator connections and early users.', ARRAY['logo', 'description', 'team_info'], 'https://fixmy.money?utm_source=f6s&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Peerlist', 'entrepreneur', 'https://peerlist.io', 'https://peerlist.io/projects/new', true, 'free', 8, 52, 'Developer/maker community. Good for Show HN-style launch.', ARRAY['logo', 'description', 'screenshots'], 'https://fixmy.money?utm_source=peerlist&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Uneed', 'product_launch', 'https://www.uneed.best', 'https://www.uneed.best/submit', true, 'free', 8, 45, 'Daily product launches. Good for early traffic spike.', ARRAY['logo', 'tagline', 'description', 'screenshots'], 'https://fixmy.money?utm_source=uneed&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Futurepedia', 'ai_tools', 'https://www.futurepedia.io', 'https://www.futurepedia.io/submit-tool', false, 'free', 9, 68, 'Top AI tools directory. High traffic. List under business/finance AI tools.', ARRAY['logo', 'description', 'screenshots', 'ai_features'], 'https://fixmy.money?utm_source=futurepedia&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('There''s An AI For That', 'ai_tools', 'https://theresanaiforthat.com', 'https://theresanaiforthat.com/submit/', false, 'free', 9, 72, 'High-traffic AI directory. Submit under finance/business category.', ARRAY['logo', 'description', 'use_cases'], 'https://fixmy.money?utm_source=theresanaiforthat&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Toolify', 'ai_tools', 'https://www.toolify.ai', 'https://www.toolify.ai/submit', false, 'free', 8, 55, 'AI tools aggregator. Good for AI-focused audience.', ARRAY['logo', 'description', 'screenshots'], 'https://fixmy.money?utm_source=toolify&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Insidr AI', 'ai_tools', 'https://www.insidr.ai', 'https://www.insidr.ai/submit-tool/', false, 'free', 8, 48, 'AI tools newsletter and directory. Good for AI-focused audience.', ARRAY['logo', 'description', 'ai_features'], 'https://fixmy.money?utm_source=insidr&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('AI Scout', 'ai_tools', 'https://aiscout.net', 'https://aiscout.net/submit', false, 'free', 7, 42, 'AI tools directory. Submit under business/finance.', ARRAY['logo', 'description'], 'https://fixmy.money?utm_source=aiscout&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('AIToolsDirectory', 'ai_tools', 'https://aitoolsdirectory.com', 'https://aitoolsdirectory.com/submit', false, 'free', 7, 40, 'AI tools listing. Good for backlink and discovery.', ARRAY['logo', 'description', 'screenshots'], 'https://fixmy.money?utm_source=aitoolsdirectory&utm_medium=directory&utm_campaign=fixmymoney_launch')
  ON CONFLICT (id) DO NOTHING;

  -- SECONDARY DIRECTORIES
  INSERT INTO public.launch_directories (name, category, url, submission_url, requires_login, free_or_paid, relevance_score, domain_authority_estimate, notes, required_assets, utm_link) VALUES
    ('Launching Next', 'startup_launch', 'https://www.launchingnext.com', 'https://www.launchingnext.com/submit/', false, 'free', 7, 45, 'Startup launch directory. Good for early visibility.', ARRAY['logo', 'description', 'url'], 'https://fixmy.money?utm_source=launchingnext&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Startup Buffer', 'startup_launch', 'https://startupbuffer.com', 'https://startupbuffer.com/site/submit', false, 'free', 6, 38, 'Startup directory. Free submission.', ARRAY['logo', 'description'], 'https://fixmy.money?utm_source=startupbuffer&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('StartupBase', 'startup_launch', 'https://startupbase.io', 'https://startupbase.io/submit', true, 'free', 7, 42, 'Startup community and directory.', ARRAY['logo', 'description', 'screenshots'], 'https://fixmy.money?utm_source=startupbase&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Betapage', 'startup_launch', 'https://betapage.co', 'https://betapage.co/submit', false, 'free', 7, 48, 'Beta product discovery. Good for early adopters.', ARRAY['logo', 'description', 'screenshots'], 'https://fixmy.money?utm_source=betapage&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('SideProjectors', 'entrepreneur', 'https://www.sideprojectors.com', 'https://www.sideprojectors.com/add', true, 'free', 6, 35, 'Side project community. Good for indie maker audience.', ARRAY['logo', 'description'], 'https://fixmy.money?utm_source=sideprojectors&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('Reddit r/SideProject', 'social', 'https://www.reddit.com/r/SideProject/', 'https://www.reddit.com/r/SideProject/submit', true, 'free', 8, 95, 'Post launch announcement. Be authentic, no spam. Engage with comments.', ARRAY['post_copy', 'demo_link'], 'https://fixmy.money?utm_source=reddit_sideproject&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('Reddit r/SaaS', 'social', 'https://www.reddit.com/r/SaaS/', 'https://www.reddit.com/r/SaaS/submit', true, 'free', 9, 95, 'Share as founder story or product update. High-quality SaaS audience.', ARRAY['post_copy', 'demo_link'], 'https://fixmy.money?utm_source=reddit_saas&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('Reddit r/Entrepreneur', 'social', 'https://www.reddit.com/r/Entrepreneur/', 'https://www.reddit.com/r/Entrepreneur/submit', true, 'free', 9, 95, 'Share founder story or credit repair business tips. Engage authentically.', ARRAY['post_copy'], 'https://fixmy.money?utm_source=reddit_entrepreneur&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('LinkedIn Company Page', 'social', 'https://www.linkedin.com/company/', 'https://www.linkedin.com/company/setup/new/', true, 'free', 9, 98, 'Create company page. Post launch announcement. Share founder story. Tag relevant people.', ARRAY['logo', 'banner_image', 'company_description'], 'https://fixmy.money?utm_source=linkedin&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('X/Twitter', 'social', 'https://twitter.com', 'https://twitter.com/compose/tweet', true, 'free', 8, 98, 'Launch thread. Tag relevant accounts. Use #creditrepair #saas #fintech hashtags.', ARRAY['post_copy', 'screenshots'], 'https://fixmy.money?utm_source=twitter&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('Medium', 'social', 'https://medium.com', 'https://medium.com/new-story', true, 'free', 8, 95, 'Publish founder story and product launch article. Good for SEO backlinks.', ARRAY['article_copy', 'images'], 'https://fixmy.money?utm_source=medium&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('Dev.to', 'social', 'https://dev.to', 'https://dev.to/new', true, 'free', 7, 88, 'Post technical article about building FixMy.Money. Developer audience.', ARRAY['article_copy', 'code_snippets'], 'https://fixmy.money?utm_source=devto&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('Hashnode', 'social', 'https://hashnode.com', 'https://hashnode.com/create/story', true, 'free', 7, 82, 'Developer blogging platform. Good for technical founder story.', ARRAY['article_copy', 'images'], 'https://fixmy.money?utm_source=hashnode&utm_medium=social&utm_campaign=fixmymoney_launch')
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Directory seed data failed: %', SQLERRM;
END $$;

-- ============================================================
-- SEED DATA: OUTREACH TARGETS
-- ============================================================
DO $$
BEGIN
  INSERT INTO public.outreach_targets (publication_name, category, contact_url, pitch_angle, relevance_score) VALUES
    ('TechCrunch', 'startup_news', 'https://techcrunch.com/got-a-tip/', 'AI-powered fintech for the underserved credit repair industry — $X billion market with outdated software', 8),
    ('Forbes Finance', 'fintech_blog', 'https://www.forbes.com/sites/forbesfinancecouncil/', 'How AI is modernizing the credit repair industry for small business owners', 9),
    ('Entrepreneur Magazine', 'entrepreneur_publication', 'https://www.entrepreneur.com/submit-an-article', 'How to start and scale a credit repair business with modern software tools', 10),
    ('Inc. Magazine', 'small_business', 'https://www.inc.com/contact', 'The $4B credit repair industry is ripe for disruption — here is how AI is changing it', 8),
    ('NerdWallet Blog', 'personal_finance', 'https://www.nerdwallet.com/blog', 'Best credit repair software for professionals and agencies in 2026', 9),
    ('Credit Karma Blog', 'personal_finance', 'https://www.creditkarma.com/advice', 'How credit repair professionals use AI to help clients faster', 8),
    ('The Balance', 'personal_finance', 'https://www.thebalancemoney.com/contact', 'Credit repair software comparison: what agencies need to know', 8),
    ('SaaStr', 'saas_blog', 'https://www.saastr.com/contact/', 'How we built a vertical SaaS for the credit repair industry', 7),
    ('ChartMogul Blog', 'saas_blog', 'https://chartmogul.com/blog/', 'Revenue metrics and growth patterns in vertical SaaS for financial services', 7),
    ('Fintech Nexus', 'fintech_blog', 'https://fintechnexus.com/contact/', 'AI credit repair software: compliance-first approach to dispute automation', 9),
    ('Bankrate', 'personal_finance', 'https://www.bankrate.com/contact-us/', 'Best credit repair software for businesses in 2026', 9),
    ('Credit.com Blog', 'credit_repair', 'https://www.credit.com/contact/', 'How credit repair agencies are using AI to scale their business', 10),
    ('The Credit Pros Blog', 'credit_repair', 'https://www.thecreditpros.com/blog/', 'Software tools for credit repair professionals', 9),
    ('Small Business Trends', 'small_business', 'https://smallbiztrends.com/contact', 'Best CRM and management software for credit repair businesses', 9),
    ('SCORE Blog', 'small_business', 'https://www.score.org/blog', 'Starting a credit repair business: tools, compliance, and growth strategies', 8),
    ('Product Hunt Blog', 'saas_blog', 'https://www.producthunt.com/stories', 'Maker story: building AI credit repair software for modern agencies', 8),
    ('Indie Hackers', 'entrepreneur', 'https://www.indiehackers.com/interviews/apply', 'How I built a vertical SaaS for the credit repair industry', 9),
    ('Morning Brew Fintech', 'fintech_blog', 'https://www.morningbrew.com/fintech', 'AI tools disrupting the credit repair industry', 7),
    ('The Hustle', 'entrepreneur_publication', 'https://thehustle.co/contact/', 'The credit repair software market is worth billions — and it is stuck in 2010', 7),
    ('Business Insider Finance', 'fintech_blog', 'https://www.businessinsider.com/contact', 'How AI is changing credit repair for small business owners', 7)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Outreach seed data failed: %', SQLERRM;
END $$;

-- ============================================================
-- SEED DATA: UTM TRACKING LINKS
-- ============================================================
DO $$
BEGIN
  INSERT INTO public.utm_tracking (source, medium, campaign, full_url) VALUES
    ('producthunt', 'directory', 'fixmymoney_launch', 'https://fixmy.money?utm_source=producthunt&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('betalist', 'directory', 'fixmymoney_launch', 'https://fixmy.money?utm_source=betalist&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('g2', 'directory', 'fixmymoney_launch', 'https://fixmy.money?utm_source=g2&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('capterra', 'directory', 'fixmymoney_launch', 'https://fixmy.money?utm_source=capterra&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('crunchbase', 'directory', 'fixmymoney_launch', 'https://fixmy.money?utm_source=crunchbase&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('futurepedia', 'directory', 'fixmymoney_launch', 'https://fixmy.money?utm_source=futurepedia&utm_medium=directory&utm_campaign=fixmymoney_launch'),
    ('linkedin', 'social', 'fixmymoney_launch', 'https://fixmy.money?utm_source=linkedin&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('twitter', 'social', 'fixmymoney_launch', 'https://fixmy.money?utm_source=twitter&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('reddit_saas', 'social', 'fixmymoney_launch', 'https://fixmy.money?utm_source=reddit_saas&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('reddit_entrepreneur', 'social', 'fixmymoney_launch', 'https://fixmy.money?utm_source=reddit_entrepreneur&utm_medium=social&utm_campaign=fixmymoney_launch'),
    ('medium', 'content', 'fixmymoney_launch', 'https://fixmy.money?utm_source=medium&utm_medium=content&utm_campaign=fixmymoney_launch'),
    ('indiehackers', 'community', 'fixmymoney_launch', 'https://fixmy.money?utm_source=indiehackers&utm_medium=community&utm_campaign=fixmymoney_launch'),
    ('hackernews', 'community', 'fixmymoney_launch', 'https://fixmy.money?utm_source=hackernews&utm_medium=community&utm_campaign=fixmymoney_launch'),
    ('email_newsletter', 'email', 'fixmymoney_launch', 'https://fixmy.money?utm_source=email_newsletter&utm_medium=email&utm_campaign=fixmymoney_launch'),
    ('google_organic', 'organic', 'fixmymoney_launch', 'https://fixmy.money?utm_source=google&utm_medium=organic&utm_campaign=fixmymoney_launch')
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'UTM seed data failed: %', SQLERRM;
END $$;
