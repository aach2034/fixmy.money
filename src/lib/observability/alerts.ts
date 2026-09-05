import { within } from './server';

export type OperationalAlertState = 'triggered' | 'resolved';

export interface OperationalAlert {
  event: string;
  severity: 'warning' | 'critical';
  state: OperationalAlertState;
  requestId: string;
  metadata?: Record<string, unknown>;
}

export interface MonitoringAlertEnvironment {
  MONITORING_ALERT_WEBHOOK_URL?: string;
  MONITORING_ALERT_WEBHOOK_TOKEN?: string;
}

export type AlertDeliveryResult = 'delivered' | 'not_configured' | 'failed';

const SENSITIVE_ALERT_KEY = /authorization|cookie|token|secret|password|email|phone|address|content|prompt/i;

function contentFreeMetadata(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (SENSITIVE_ALERT_KEY.test(key) || typeof item === 'string') return [key, '[REDACTED]'];
    if (Array.isArray(item)) return [key, '[REDACTED]'];
    if (item && typeof item === 'object') {
      return [key, contentFreeMetadata(item as Record<string, unknown>)];
    }
    return [key, item];
  }));
}

export function operationalAlertPayload(alert: OperationalAlert) {
  return {
    schema_version: 1,
    event: alert.event.replace(/[^a-z0-9_.-]/gi, '_').slice(0, 96),
    severity: alert.severity,
    state: alert.state,
    request_id: alert.requestId,
    timestamp: new Date().toISOString(),
    metadata: contentFreeMetadata(alert.metadata || {}),
  };
}

export async function deliverOperationalAlert(
  alert: OperationalAlert,
  environment: MonitoringAlertEnvironment = {
    MONITORING_ALERT_WEBHOOK_URL: process.env.MONITORING_ALERT_WEBHOOK_URL,
    MONITORING_ALERT_WEBHOOK_TOKEN: process.env.MONITORING_ALERT_WEBHOOK_TOKEN,
  },
): Promise<AlertDeliveryResult> {
  const destination = environment.MONITORING_ALERT_WEBHOOK_URL;
  if (!destination) return 'not_configured';

  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return 'failed';
  }
  if (url.protocol !== 'https:' || url.username || url.password) return 'failed';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (environment.MONITORING_ALERT_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${environment.MONITORING_ALERT_WEBHOOK_TOKEN}`;
  }

  try {
    const response = await within(fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(operationalAlertPayload(alert)),
    }));
    return response.ok ? 'delivered' : 'failed';
  } catch {
    return 'failed';
  }
}
