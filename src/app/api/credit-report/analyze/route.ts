import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion } from '@/lib/ai/chatCompletion';
import { redactPII, validateNoFullPII } from '@/lib/ai/redaction';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileData, fileName, fileType } = body;

    if (!fileData) {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
    }

    const isImage = fileType?.startsWith('image/');
    const isPdf = fileType === 'application/pdf';

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const systemPrompt = `You are an expert credit report analyst. Analyze the provided credit report and extract all negative items. 
Return ONLY valid JSON in this exact format:
{
  "total_negative_accounts": number,
  "total_collections": number,
  "total_charge_offs": number,
  "total_late_payments": number,
  "total_repossessions": number,
  "total_bankruptcies": number,
  "total_hard_inquiries": number,
  "estimated_score_impact": number (estimated points dragging score down, 0-200),
  "improvement_opportunities": number (number of items that could be disputed/removed),
  "negative_items": [
    {
      "type": "collection|charge_off|late_payment|repossession|bankruptcy|hard_inquiry|other",
      "creditor_name": "string",
      "account_number": "string (last 4 digits only if visible)",
      "amount": number or null,
      "date_reported": "YYYY-MM-DD or null",
      "bureau": "Experian|Equifax|TransUnion|Unknown",
      "dispute_reason": "string (specific reason this item can be disputed)",
      "priority": "high|medium|low",
      "dispute_letter_template": "string (brief dispute letter template for this item)"
    }
  ],
  "summary": "string (2-3 sentence summary of the credit report findings)"
}

Be thorough and identify ALL negative items. For dispute_reason, be specific about FCRA violations, inaccuracies, or statute of limitations issues.
IMPORTANT: Never include full Social Security numbers or full account numbers in your response. Use last 4 digits only.`;

    // ── Redact PII from file name before logging ───────────────────────────
    // The file name may contain consumer-identifying information
    const safeFileName = fileName ? fileName.replace(/\d{9}/g, '[REDACTED]') : 'unknown';

    const userContent: Array<{type: string; text?: string; image_url?: {url: string; detail: string}; file?: {file_data: string; filename: string}}> = [
      {
        type: 'text',
        // Apply PII redaction to the text prompt
        text: redactPII(
          `Please analyze this credit report document (${safeFileName}) and identify all negative items including collections, charge-offs, late payments, repossessions, bankruptcies, and hard inquiries. Extract all relevant information and provide dispute recommendations. Do not include full Social Security numbers or full account numbers in your response.`
        ),
      },
    ];

    if (isImage) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: fileData,
          detail: 'high',
        },
      });
    } else {
      userContent.push({
        type: 'file',
        file: {
          file_data: fileData,
          filename: safeFileName,
        },
      });
    }

    // ── Validate prompt does not contain full PII before sending ──────────
    const promptText = userContent
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text || '')
      .join(' ');

    const piiCheck = validateNoFullPII(promptText);
    if (!piiCheck.safe) {
      // Log sanitized warning — never log the actual PII
      console.warn('[CreditReport] PII detected in prompt text before AI send. Violations:', piiCheck.violations.length);
      // Redact again to be safe
      for (const item of userContent) {
        if (item.type === 'text' && item.text) {
          item.text = redactPII(item.text);
        }
      }
    }

    // ── NEVER log the full prompt — it may contain credit report data ─────
    // Only log sanitized metadata
    console.log('[CreditReport] Analyzing file type:', fileType, '| PII check passed:', piiCheck.safe);

    const response = await getChatCompletion(
      'OPEN_AI',
      'gpt-4o',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      {
        max_tokens: 4000,
        temperature: 0.1,
      }
    );

    const content = response?.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let analysisData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // Return a structured fallback if parsing fails
      analysisData = {
        total_negative_accounts: 0,
        total_collections: 0,
        total_charge_offs: 0,
        total_late_payments: 0,
        total_repossessions: 0,
        total_bankruptcies: 0,
        total_hard_inquiries: 0,
        estimated_score_impact: 0,
        improvement_opportunities: 0,
        negative_items: [],
        summary: 'Analysis complete. Please review the uploaded document manually.',
        raw_response: content,
      };
    }

    // ── Sanitize AI response — ensure no full SSNs/account numbers leak back ──
    const responseStr = JSON.stringify(analysisData);
    const responseCheck = validateNoFullPII(responseStr);
    if (!responseCheck.safe) {
      // Redact the response before returning to client
      const redactedStr = redactPII(responseStr);
      try {
        analysisData = JSON.parse(redactedStr);
      } catch {
        // If redaction broke JSON structure, return safe fallback
        analysisData = {
          ...analysisData,
          negative_items: (analysisData.negative_items || []).map((item: Record<string, unknown>) => ({
            ...item,
            account_number: item.account_number
              ? String(item.account_number).slice(-4)
              : null,
          })),
        };
      }
    }

    return NextResponse.json({ success: true, analysis: analysisData });
  } catch (error: unknown) {
    // Never log raw error — may contain credit report data
    const safeMessage = error instanceof Error ? error.message : 'Analysis failed';
    console.error('[CreditReport] Analysis error (sanitized):', safeMessage.slice(0, 200));
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
