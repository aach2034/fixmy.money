const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  charge_off: 'Charge-off',
  collection: 'Collection',
  late_payment: 'Late payment',
  hard_inquiry: 'Hard inquiry',
  repossession: 'Repossession',
  bankruptcy: 'Bankruptcy',
  other: 'Other',
};

export function formatAccountType(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return ACCOUNT_TYPE_LABELS[trimmed.toLowerCase()] ?? trimmed;
}

function normalizedDocumentLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^copy\s+of\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function deduplicateSupportingDocuments(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels.filter(label => {
    const key = normalizedDocumentLabel(label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
