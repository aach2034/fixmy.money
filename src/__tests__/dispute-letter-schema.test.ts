import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('dispute letter production schema', () => {
  it('does not send fields absent from the production dispute_letters table', () => {
    const files = [
      'src/app/credit-report-import/components/CreditReportImportContent.tsx',
      'src/app/dispute-letter-management/components/GenerateLetterForm.tsx',
    ];
    const source = files
      .map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(source).not.toContain('ai_assisted:');
  });
});
