export interface AnomalyFindingView {
  issueType: string;
  title: string;
  discrepancy: string;
  reportedData: string;
  factualBasis: string;
  disputeReason: string;
  strengthLabel: 'Strong' | 'Moderate' | 'Weak';
  score: number;
}

export function prepareAnomalyFindings(findings: AnomalyFindingView[] | null | undefined): AnomalyFindingView[] {
  const unique = new Map<string, { finding: AnomalyFindingView; index: number }>();

  (findings ?? []).forEach((finding, index) => {
    const key = [
      finding.issueType,
      finding.reportedData,
      finding.factualBasis,
      finding.disputeReason,
    ].join('|');
    if (!unique.has(key)) unique.set(key, { finding, index });
  });

  return [...unique.values()]
    .sort((left, right) => right.finding.score - left.finding.score || left.index - right.index)
    .map(entry => entry.finding);
}

export function formatAnomalyFindingsForLetter(findings: AnomalyFindingView[] | null | undefined): string {
  return prepareAnomalyFindings(findings).map((finding, index) => [
    `   Finding ${index + 1}: ${finding.title}`,
    `   Dispute Strength: ${finding.strengthLabel}`,
    `   Discrepancy: ${finding.discrepancy}`,
    finding.reportedData ? `   Reported Data: ${finding.reportedData}` : '',
    `   Factual Basis: ${finding.factualBasis}`,
    `   Dispute Reason: ${finding.disputeReason}`,
  ].filter(Boolean).join('\n')).join('\n\n');
}
