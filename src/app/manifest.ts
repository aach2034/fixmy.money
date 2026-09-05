import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FixMy.Money Credit Repair Software',
    short_name: 'FixMy.Money',
    description: 'Structured credit report review and editable dispute-drafting software for individuals and credit repair agencies.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#09062b',
    icons: [
      { src: '/assets/images/fixmy-money-mark-v2.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' },
      { src: '/assets/images/fixmy-money-mark-v2.png', sizes: '1254x1254', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
