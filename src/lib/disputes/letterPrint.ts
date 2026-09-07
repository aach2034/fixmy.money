const PRINT_STYLES = `
  body {
    color: #000;
    font-family: "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.6;
    margin: 1in;
  }
  pre {
    font: inherit;
    margin: 0 auto;
    max-width: 7in;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  @media print {
    body { margin: 0.75in; }
  }
`;

/**
 * Builds a print document without parsing letter content as HTML.
 * Both the title and body are assigned as text-only DOM properties.
 */
export function renderLetterForPrint(targetDocument: Document, letterContent: string, title: string) {
  const style = targetDocument.createElement('style');
  style.textContent = PRINT_STYLES;

  const content = targetDocument.createElement('pre');
  content.setAttribute('data-letter-print-content', 'true');
  content.textContent = letterContent;

  targetDocument.title = title;
  targetDocument.head.replaceChildren(style);
  targetDocument.body.replaceChildren(content);
}
