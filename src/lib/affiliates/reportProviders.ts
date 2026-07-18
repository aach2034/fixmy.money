import { createClient } from '@/lib/supabase/client';

export interface ReportProvider {
  key: string;
  name: string;
  description: string;
  affiliateUrl: string;
  isVisible: boolean;
  isPreferred: boolean;
  displayOrder: number;
}

export const DEFAULT_PROVIDERS: ReportProvider[] = [
  {
    key: 'smartcredit',
    name: 'SmartCredit',
    description: 'Get your 3-bureau credit report with real-time monitoring and score tracking.',
    affiliateUrl: 'https://www.smartcredit.com/?PID=35662',
    isVisible: true,
    isPreferred: true,
    displayOrder: 0,
  },
  {
    key: 'myscoreiq',
    name: 'MyScoreIQ',
    description: 'Access your FICO® scores from all 3 bureaus plus identity protection features.',
    affiliateUrl: 'https://www.myscoreiq.com/get-fico-max.aspx?offercode=432143RB',
    isVisible: true,
    isPreferred: false,
    displayOrder: 1,
  },
  {
    key: 'identityiq',
    name: 'IdentityIQ',
    description: 'Comprehensive 3-bureau credit monitoring with identity theft protection.',
    affiliateUrl: '',
    isVisible: false,
    isPreferred: false,
    displayOrder: 2,
  },
  {
    key: 'myfreescorenow',
    name: 'MyFreeScoreNow',
    description: 'Free credit scores and 3-bureau credit monitoring service.',
    affiliateUrl: '',
    isVisible: false,
    isPreferred: false,
    displayOrder: 3,
  },
  {
    key: 'privacyguard',
    name: 'PrivacyGuard',
    description: 'Credit and identity protection with 3-bureau credit monitoring.',
    affiliateUrl: '',
    isVisible: false,
    isPreferred: false,
    displayOrder: 4,
  },
];

export const DEFAULT_DISCLOSURE =
  'Disclosure: FixMy.Money or your credit specialist may receive compensation if you sign up through this link. You are not required to use this provider. You may upload a report from another supported provider.';

export async function getProviders(workspaceId?: string | null): Promise<ReportProvider[]> {
  if (!workspaceId) return DEFAULT_PROVIDERS.filter(p => p.isVisible);
  const supabase = createClient();
  const { data } = await supabase
    .from('report_provider_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('display_order');

  if (!data || data.length === 0) return DEFAULT_PROVIDERS.filter(p => p.isVisible);

  return data.map((row: any) => ({
    key: row.provider_key,
    name: row.provider_name,
    description: DEFAULT_PROVIDERS.find(p => p.key === row.provider_key)?.description ?? '',
    affiliateUrl: row.affiliate_url,
    isVisible: row.is_visible,
    isPreferred: row.is_preferred,
    displayOrder: row.display_order,
  })).filter((p: ReportProvider) => p.isVisible);
}

export async function trackAffiliateClick(params: {
  provider: string;
  sourcePage: string;
  clientId?: string | null;
  agencyId?: string | null;
  userId?: string | null;
}) {
  const supabase = createClient();
  await supabase.from('affiliate_link_clicks').insert({
    provider: params.provider,
    source_page: params.sourcePage,
    client_id: params.clientId ?? null,
    agency_id: params.agencyId ?? null,
    user_id: params.userId ?? null,
  });
}
