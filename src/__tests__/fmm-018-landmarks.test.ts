import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function relativeLuminance(hex: string): number {
  const channels = hex.match(/[0-9a-f]{2}/gi)!.map(channel => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function files(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? files(target) : target.endsWith('.tsx') ? [target] : [];
  });
}

describe('FMM-018 landmark structure', () => {
  it('uses the root layout as the single main landmark', () => {
    const nested = files('src/app').filter(file => file !== 'src/app/layout.tsx')
      .filter(file => /<main\b|role=["']main["']/.test(fs.readFileSync(file, 'utf8')));
    expect(nested).toEqual([]);
    expect(fs.readFileSync('src/app/layout.tsx', 'utf8')).toContain('<main id="main-content"');
  });

  it('gives the public homepage an explicit header landmark', () => {
    const homepage = fs.readFileSync('src/app/homepage/components/HomepageContent.tsx', 'utf8');
    expect(homepage).toContain('<header>');
    expect(homepage).toContain('<nav ');
  });

  it('keeps the affected waitlist and login colors above WCAG AA contrast', () => {
    const waitlist = fs.readFileSync('src/components/ReopeningWaitlistForm.tsx', 'utf8');
    const auth = fs.readFileSync('src/app/sign-up-login-screen/components/AuthForm.tsx', 'utf8');
    expect(waitlist).toContain('text-[#66766e]');
    expect(contrast('66766e', 'f6faf8')).toBeGreaterThanOrEqual(4.5);
    expect(auth).toContain('className="auth-form min-h-screen');
    expect(contrast('15803d', 'ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(auth).toContain('grid size-8 -translate-y-1/2 place-items-center');
  });
});
