import { expect, test, type Page } from '@playwright/test';

export const MOBILE_WEB_VITAL_BUDGETS = {
  lcpMs: 2_500,
  cls: 0.1,
  inpMs: 200,
} as const;

type VitalSnapshot = {
  lcpMs: number | null;
  cls: number;
  inpMs: number | null;
  supported: {
    lcp: boolean;
    cls: boolean;
    event: boolean;
  };
};

async function installVitalObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type LayoutShiftEntry = PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
    };
    type EventTimingEntry = PerformanceEntry & {
      duration: number;
      interactionId?: number;
    };
    type MutableVitalSnapshot = VitalSnapshot & {
      clsSessionValue: number;
      clsSessionStart: number;
      clsSessionEnd: number;
    };

    const entryTypes = new Set(PerformanceObserver.supportedEntryTypes ?? []);
    const state: MutableVitalSnapshot = {
      lcpMs: null,
      cls: 0,
      inpMs: null,
      clsSessionValue: 0,
      clsSessionStart: 0,
      clsSessionEnd: 0,
      supported: {
        lcp: entryTypes.has('largest-contentful-paint'),
        cls: entryTypes.has('layout-shift'),
        event: entryTypes.has('event'),
      },
    };

    Object.defineProperty(window, '__fmmWebVitals', { value: state });

    if (state.supported.lcp) {
      new PerformanceObserver(list => {
        const entry = list.getEntries().at(-1);
        if (entry) state.lcpMs = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    }

    if (state.supported.cls) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (entry.hadRecentInput) continue;

          const continuesSession =
            state.clsSessionValue > 0 &&
            entry.startTime - state.clsSessionEnd < 1_000 &&
            entry.startTime - state.clsSessionStart < 5_000;

          if (continuesSession) {
            state.clsSessionValue += entry.value;
            state.clsSessionEnd = entry.startTime;
          } else {
            state.clsSessionValue = entry.value;
            state.clsSessionStart = entry.startTime;
            state.clsSessionEnd = entry.startTime;
          }
          state.cls = Math.max(state.cls, state.clsSessionValue);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }

    const recordInteraction = (entry: EventTimingEntry) => {
      if (entry.interactionId === 0) return;
      state.inpMs = Math.max(state.inpMs ?? 0, entry.duration);
    };

    if (state.supported.event) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries() as EventTimingEntry[]) recordInteraction(entry);
      }).observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit & { durationThreshold: number });
    }

  });
}

async function settleInitialRendering(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.waitForTimeout(500);
}

async function readVitals(page: Page): Promise<VitalSnapshot> {
  return page.evaluate(() => {
    const state = (window as typeof window & { __fmmWebVitals: VitalSnapshot }).__fmmWebVitals;
    return {
      lcpMs: state.lcpMs,
      cls: state.cls,
      inpMs: state.inpMs,
      supported: state.supported,
    };
  });
}

test('mobile WebKit meets the LCP budget', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-webkit-390', 'FMM-017 WebKit evidence runs once.');

  await installVitalObservers(page);
  const response = await page.goto('/', { waitUntil: 'load' });
  expect(response?.status()).toBeLessThan(400);
  await settleInitialRendering(page);

  const vitals = await readVitals(page);
  console.info(`[FMM-017] mobile-webkit ${JSON.stringify(vitals)}`);

  expect(vitals.supported.lcp).toBe(true);
  expect(vitals.lcpMs).not.toBeNull();
  expect(vitals.lcpMs!).toBeLessThanOrEqual(MOBILE_WEB_VITAL_BUDGETS.lcpMs);
});

test('mobile Chromium meets the CLS and INP budgets', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile-chrome-375',
    'Chromium supplies native Layout Shift evidence.',
  );

  await installVitalObservers(page);
  const response = await page.goto('/', { waitUntil: 'load' });
  expect(response?.status()).toBeLessThan(400);
  await settleInitialRendering(page);

  const email = page.locator('input[name="email"]:visible').first();
  await expect(email).toBeVisible();
  await email.pressSequentially('vitals');
  await page.waitForTimeout(250);

  const vitals = await readVitals(page);
  console.info(`[FMM-017] mobile-chromium ${JSON.stringify(vitals)}`);

  expect(vitals.supported.cls).toBe(true);
  expect(vitals.supported.event).toBe(true);
  expect(vitals.inpMs).not.toBeNull();
  expect(vitals.cls).toBeLessThanOrEqual(MOBILE_WEB_VITAL_BUDGETS.cls);
  expect(vitals.inpMs!).toBeLessThanOrEqual(MOBILE_WEB_VITAL_BUDGETS.inpMs);
});
