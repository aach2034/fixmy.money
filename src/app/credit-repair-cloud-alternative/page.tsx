import React from 'react';
import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import CreditRepairCloudAlternativeContent from './components/CreditRepairCloudAlternativeContent';

export const metadata: Metadata = createSeoMetadata("/credit-repair-cloud-alternative");

export default function CreditRepairCloudAlternativePage() {
  return <CreditRepairCloudAlternativeContent />;
}