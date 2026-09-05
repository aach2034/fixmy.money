import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderLetterForPrint } from '@/lib/disputes/letterPrint';

class FakeElement {
  textContent = '';
  readonly attributes = new Map<string, string>();

  constructor(readonly tagName: string) {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

class FakeParent {
  children: FakeElement[] = [];

  replaceChildren(...children: FakeElement[]) {
    this.children = children;
  }
}

function createFakeDocument() {
  const head = new FakeParent();
  const body = new FakeParent();
  const document = {
    title: '',
    head,
    body,
    createElement: (tagName: string) => new FakeElement(tagName),
  } as unknown as Document;
  return { document, head, body };
}

describe('letter print rendering', () => {
  it.each([
    '</pre><script>window.opener.location="https://attacker.example"</script><pre>',
    '<img src=x onerror="globalThis.pwned=true">',
    '<svg><animate onbegin=alert(document.domain) attributeName=x /></svg>',
  ])('renders hostile letter content only as text: %s', payload => {
    const { document, head, body } = createFakeDocument();
    const hostileTitle = `Letter </title><script>alert(1)</script>`;

    renderLetterForPrint(document, payload, hostileTitle);

    expect(document.title).toBe(hostileTitle);
    expect(head.children).toHaveLength(1);
    expect(head.children[0].tagName).toBe('style');
    expect(head.children[0].textContent).not.toContain(payload);
    expect(body.children).toHaveLength(1);
    expect(body.children[0].tagName).toBe('pre');
    expect(body.children[0].textContent).toBe(payload);
    expect(body.children[0].attributes.get('data-letter-print-content')).toBe('true');
  });

  it('contains no document.write call in application source', () => {
    const stack = [
      path.resolve(process.cwd(), 'src/app'),
      path.resolve(process.cwd(), 'src/components'),
      path.resolve(process.cwd(), 'src/lib'),
    ];
    const offenders: string[] = [];

    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(absolute);
        if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          if (fs.readFileSync(absolute, 'utf8').includes('document.write')) offenders.push(absolute);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
