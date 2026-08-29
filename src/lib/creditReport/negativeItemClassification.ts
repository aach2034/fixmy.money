export interface CollectionClassificationInput {
  isCollection?: boolean;
  accountType?: string;
  negativeReason?: string;
}

export function isCollectionItem(item: CollectionClassificationInput): boolean {
  return Boolean(item.isCollection)
    || /collection/i.test(`${item.accountType ?? ''} ${item.negativeReason ?? ''}`);
}
