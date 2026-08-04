import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FixMy.Money Credit Repair Software',
    short_name: 'FixMy.Money',
    description: 'AI-assisted credit report analysis and editable dispute-drafting software for individuals and credit repair agencies.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#09062b',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
