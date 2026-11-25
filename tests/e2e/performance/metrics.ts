import { type CDPSession, type Page, type TestInfo } from "@playwright/test";

/**
 * Shared measurement harness for the performance benchmark suite: attaches
 * CDP counters and PerformanceObserver entries to a page, and reports the
 * result as a test attachment. Reusable across any spec tagged
 * "@performance" — see e2e/performance/publication-performance.spec.ts for
 * the current consumer.
 */

export interface BrowserPerformanceEntries {
  layoutShifts: Array<{ value: number; hadRecentInput: boolean }>;
  longAnimationFrames: number[];
  longTasks: number[];
}

interface PerformanceMetric {
  name: string;
  value: number;
}

export async function attachMetrics(
  testInfo: TestInfo,
  name: string,
  metrics: unknown,
) {
  const body = JSON.stringify(metrics, null, 2);
  console.log(`[performance] ${name}\n${body}`);
  await testInfo.attach(`${name}.json`, {
    body,
    contentType: "application/json",
  });
}

export async function installBrowserPerformanceObservers(page: Page) {
  await page.addInitScript(() => {
    const state: BrowserPerformanceEntries = {
      layoutShifts: [],
      longAnimationFrames: [],
      longTasks: [],
    };

    const observe = (
      type: string,
      onEntry: (entry: PerformanceEntry) => void,
    ) => {
      try {
        new PerformanceObserver((list) => {
          list.getEntries().forEach(onEntry);
        }).observe({ type, buffered: true });
      } catch {
        // The benchmark remains useful when a browser lacks an entry type.
      }
    };

    observe("layout-shift", (entry) => {
      const layoutShift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      };
      state.layoutShifts.push({
        value: layoutShift.value,
        hadRecentInput: layoutShift.hadRecentInput,
      });
    });
    observe("long-animation-frame", (entry) => {
      state.longAnimationFrames.push(entry.duration);
    });
    observe("longtask", (entry) => {
      state.longTasks.push(entry.duration);
    });

    const perfWindow = window as typeof window & {
      __browserPerformanceEntries: BrowserPerformanceEntries;
      __resetBrowserPerformanceEntries: () => void;
    };
    perfWindow.__browserPerformanceEntries = state;
    perfWindow.__resetBrowserPerformanceEntries = () => {
      state.layoutShifts.length = 0;
      state.longAnimationFrames.length = 0;
      state.longTasks.length = 0;
    };
  });
}

export async function resetBrowserPerformanceEntries(page: Page) {
  await page.evaluate(() => {
    const perfWindow = window as typeof window & {
      __resetBrowserPerformanceEntries: () => void;
    };
    perfWindow.__resetBrowserPerformanceEntries();
  });
}

export async function getBrowserPerformanceEntries(
  page: Page,
): Promise<BrowserPerformanceEntries> {
  return page.evaluate(() => {
    const perfWindow = window as typeof window & {
      __browserPerformanceEntries: BrowserPerformanceEntries;
    };
    return structuredClone(perfWindow.__browserPerformanceEntries);
  });
}

export async function readCdpMetrics(session: CDPSession) {
  const response = await session.send("Performance.getMetrics");
  return Object.fromEntries(
    response.metrics.map((metric: PerformanceMetric) => [
      metric.name,
      metric.value,
    ]),
  );
}

export function diffMetrics(
  before: Record<string, number>,
  after: Record<string, number>,
) {
  const delta = (name: string) => (after[name] ?? 0) - (before[name] ?? 0);

  return {
    layoutCount: delta("LayoutCount"),
    styleRecalculationCount: delta("RecalcStyleCount"),
    layoutDurationMs: delta("LayoutDuration") * 1000,
    styleRecalculationDurationMs: delta("RecalcStyleDuration") * 1000,
    scriptDurationMs: delta("ScriptDuration") * 1000,
    taskDurationMs: delta("TaskDuration") * 1000,
    heapUsedBytes: delta("JSHeapUsedSize"),
    nodeCount: delta("Nodes"),
    eventListenerCount: delta("JSEventListeners"),
  };
}

export async function installResizeListenerCounter(page: Page) {
  await page.addInitScript(() => {
    const resizeListeners = new Set<string>();
    const listenerIds = new WeakMap<
      EventListenerOrEventListenerObject,
      number
    >();
    let nextListenerId = 0;
    const captureFlag = (
      opts?: boolean | AddEventListenerOptions | EventListenerOptions,
    ) => (typeof opts === "boolean" ? opts : Boolean(opts?.capture));
    const keyFor = (
      listener: EventListenerOrEventListenerObject,
      opts?: boolean | AddEventListenerOptions | EventListenerOptions,
    ) => {
      let id = listenerIds.get(listener);
      if (id === undefined) {
        id = nextListenerId;
        nextListenerId += 1;
        listenerIds.set(listener, id);
      }
      return `${id}:${captureFlag(opts) ? 1 : 0}`;
    };
    const addEventListener = window.addEventListener.bind(window);
    const removeEventListener = window.removeEventListener.bind(window);

    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === "resize") resizeListeners.add(keyFor(listener, options));
      addEventListener(type, listener, options);
    }) as typeof window.addEventListener;

    window.removeEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) => {
      if (type === "resize") resizeListeners.delete(keyFor(listener, options));
      removeEventListener(type, listener, options);
    }) as typeof window.removeEventListener;

    const perfWindow = window as typeof window & {
      __resizeListenerCount: () => number;
    };
    perfWindow.__resizeListenerCount = () => resizeListeners.size;
  });
}

export async function getResizeListenerCount(page: Page) {
  return page.evaluate(() => {
    const perfWindow = window as typeof window & {
      __resizeListenerCount: () => number;
    };
    return perfWindow.__resizeListenerCount();
  });
}
