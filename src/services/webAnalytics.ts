/** US-015 / T-003, 2026-10-29. Best-effort first-party telemetry, independent from clinical drafts and checkout locks. */
import {
  ACTIVE_IDLE_MS,
  SESSION_IDLE_MS,
  type BrowserEvent,
  type PAGE_CODES,
} from "../analytics/contracts";
type StorageLike = Pick<Storage, "getItem" | "setItem">;
export interface AnalyticsTransport {
  (
    url: string,
    init: RequestInit,
  ): Promise<Pick<Response, "ok" | "status" | "json" | "headers">>;
}
export interface ClientOptions {
  local: StorageLike;
  session: StorageLike;
  id: () => string;
  now: () => number;
  monotonic: () => number;
  send: AnalyticsTransport;
  auth: () => string | null;
  delay: (ms: number) => Promise<void>;
}
export class WebAnalyticsClient {
  private waiters: (() => void)[] = [];
  private pages = new Map<string, BrowserEvent>();
  private registeredPages = new Set<string>();
  private rotating = false;
  private sampledMs = -1;
  private token = "";
  private tokenAt = 0;
  private initializing: Promise<boolean> | null = null;
  private queue: BrowserEvent[] = [];
  private busy = false;
  private visitorId = "";
  private sessionId = "";
  private identityMode: "persistent" | "ephemeral" = "persistent";
  private sessionAt = 0;
  private viewId = "";
  private pageCode: (typeof PAGE_CODES)[number] = "other_public";
  private activeMs = 0;
  private sequence = 0;
  private tickAt = 0;
  private interactionAt = 0;
  private attemptId = "";
  private requestId = "";
  private started = new Set<string>();
  private opened = new Set<string>();
  public lostEvents = 0;
  constructor(
    private o: ClientOptions,
    private scope: string,
  ) {
    this.restore();
  }
  private restore() {
    try {
      const v = this.o.local.getItem(
        `mireceta_analytics_visitor_${this.scope}`,
      );
      this.visitorId = this.validId(v) ? v : this.o.id();
      this.o.local.setItem(
        `mireceta_analytics_visitor_${this.scope}`,
        this.visitorId,
      );
      const raw = JSON.parse(
        this.o.session.getItem(`mireceta_analytics_session_${this.scope}`) ||
          "null",
      );
      if (
        raw &&
        this.validId(raw.id) &&
        Number.isFinite(raw.at) &&
        this.o.now() - raw.at >= 0 &&
        this.o.now() - raw.at < SESSION_IDLE_MS
      ) {
        this.sessionId = raw.id;
        this.sessionAt = raw.at;
      }
    } catch {
      this.identityMode = "ephemeral";
    }
    if (!this.visitorId) this.visitorId = this.o.id();
    if (!this.sessionId) this.sessionId = this.o.id();
    this.touch();
  }
  private validId(v: unknown): v is string {
    return typeof v === "string" && /^[a-zA-Z0-9_-]{16,100}$/.test(v);
  }
  private touch() {
    this.sessionAt = this.o.now();
    try {
      this.o.session.setItem(
        `mireceta_analytics_session_${this.scope}`,
        JSON.stringify({ id: this.sessionId, at: this.sessionAt }),
      );
    } catch {
      this.identityMode = "ephemeral";
    }
  }
  private headers() {
    const auth = this.o.auth();
    return {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    };
  }
  private async ready() {
    if (this.token && this.o.now() - this.tokenAt < 23 * 3600000) return true;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      try {
        const res = await this.o.send("/api/analytics/session", {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            visitorId: this.visitorId,
            sessionId: this.sessionId,
            identityMode: this.identityMode,
            schemaVersion: 1,
          }),
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (typeof data.token !== "string") return false;
        this.token = data.token;
        this.tokenAt = this.o.now();
        return true;
      } catch {
        return false;
      } finally {
        this.initializing = null;
      }
    })();
    return this.initializing;
  }
  page(code: (typeof PAGE_CODES)[number]) {
    if (this.viewId && this.pageCode === code) return;
    if (this.viewId) void this.flush(true);
    this.pageCode = code;
    this.viewId = this.o.id();
    this.sequence = 0;
    this.activeMs = 0;
    this.sampledMs = -1;
    this.tickAt = this.o.monotonic();
    this.interactionAt = this.tickAt;
    this.touch();
    this.enqueue({
      eventId: this.o.id(),
      name: "page_view",
      pageViewId: this.viewId,
      pageCode: code,
      sequence: ++this.sequence,
    });
  }
  activity() {
    if (this.o.now() - this.sessionAt >= SESSION_IDLE_MS) {
      if (!this.rotating) void this.rotateSession();
      return;
    }
    this.interactionAt = this.o.monotonic();
    this.touch();
  }
  private async rotateSession() {
    this.rotating = true;
    try {
      await this.flush(true);
      this.sessionId = this.o.id();
      this.token = "";
      const code = this.pageCode;
      this.viewId = "";
      this.opened.clear();
      this.page(code);
      if (code === "patient_form" && this.attemptId) this.event("form_opened");
    } finally {
      this.rotating = false;
    }
  }
  tick(visible: boolean, focused: boolean) {
    const now = this.o.monotonic(),
      delta = Math.max(0, Math.min(5000, now - this.tickAt));
    if (visible && focused && now - this.interactionAt < ACTIVE_IDLE_MS)
      this.activeMs += Math.round(delta);
    this.tickAt = now;
  }
  pause() {
    this.tickAt = this.o.monotonic();
    this.sample();
    void this.flush(true);
  }
  sample() {
    if (!this.viewId || this.activeMs === this.sampledMs) return;
    this.sampledMs = this.activeMs;
    this.enqueue({
      eventId: this.o.id(),
      name: "activity",
      pageViewId: this.viewId,
      sequence: ++this.sequence,
      activeMs: this.activeMs,
    });
  }
  attempt(clientRequestId: string) {
    if (this.requestId === clientRequestId && this.attemptId) return;
    this.requestId = clientRequestId;
    try {
      const k = `mireceta_analytics_attempt_${this.scope}_${clientRequestId}`;
      const prior = this.o.local.getItem(k);
      this.attemptId = this.validId(prior) ? prior : this.o.id();
      this.o.local.setItem(k, this.attemptId);
    } catch {
      this.attemptId = this.o.id();
    }
  }
  event(
    name: BrowserEvent["name"],
    extra: Partial<Pick<BrowserEvent, "step" | "validationCategory">> = {},
  ) {
    if (!this.viewId || !this.attemptId) return;
    const key = `${this.sessionId}:${this.attemptId}`;
    if (name === "form_opened") {
      if (this.opened.has(key)) return;
      this.opened.add(key);
    }
    if (name === "form_started") {
      if (this.started.has(this.attemptId)) return;
      this.started.add(this.attemptId);
    }
    this.enqueue({
      eventId: this.o.id(),
      name,
      pageViewId: this.viewId,
      formAttemptId: this.attemptId,
      sequence: ++this.sequence,
      ...extra,
    });
    if (
      ["form_opened", "submit_attempted", "checkout_redirected"].includes(name)
    )
      void this.flush(name === "checkout_redirected");
  }
  private enqueue(e: BrowserEvent) {
    if (e.name === "page_view") {
      this.pages.set(e.pageViewId, e);
      if (this.pages.size > 100)
        this.pages.delete(this.pages.keys().next().value!);
    }
    if (e.name === "activity")
      this.queue = this.queue.filter(
        (x) => x.name !== "activity" || x.pageViewId !== e.pageViewId,
      );
    if (this.queue.length >= 100) {
      this.lostEvents++;
      return;
    }
    this.queue.push(e);
    if (this.queue.length >= 20) void this.flush();
  }
  context() {
    void this.flush();
    if (
      !this.token ||
      !this.attemptId ||
      this.o.now() - this.tokenAt >= 23 * 3600000
    )
      return undefined;
    return { token: this.token, formAttemptId: this.attemptId };
  }
  async flush(keepalive = false) {
    if (this.busy) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
      return this.queue.length ? this.flush(keepalive) : undefined;
    }
    if (!this.queue.length) return;
    this.busy = true;
    try {
      if (!(await this.ready())) {
        this.lostEvents += this.queue.length;
        this.queue = [];
        return;
      }
      while (this.queue.length) {
        const batch: BrowserEvent[] = [];
        while (this.queue.length && batch.length < 20) {
          const next = this.queue[0];
          const parent = this.pages.get(next.pageViewId);
          const needsParent =
            next.name !== "page_view" &&
            !this.registeredPages.has(next.pageViewId) &&
            parent &&
            !batch.some(
              (e) => e.name === "page_view" && e.pageViewId === next.pageViewId,
            );
          const additions = needsParent ? [parent!, next] : [next];
          if (batch.length + additions.length > 20) break;
          if (
            new TextEncoder().encode(
              JSON.stringify({ events: [...batch, ...additions] }),
            ).length > 32768
          )
            break;
          this.queue.shift();
          batch.push(...additions);
        }
        if (!batch.length) {
          this.queue.shift();
          this.lostEvents++;
          continue;
        }
        let accepted = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await this.o.send("/api/analytics/events", {
              method: "POST",
              headers: { ...this.headers(), "X-Analytics-Token": this.token },
              body: JSON.stringify({ events: batch }),
              keepalive,
              signal: AbortSignal.timeout(2000),
            });
            if (res.ok) {
              accepted = true;
              for (const e of batch)
                if (e.name === "page_view")
                  this.registeredPages.add(e.pageViewId);
              break;
            }
            if ([400, 401, 403, 413].includes(res.status)) {
              if (res.status === 401) this.token = "";
              break;
            }
            if (attempt < 2) {
              const retry =
                res.status === 429
                  ? Math.max(
                      0,
                      Number(res.headers.get("Retry-After") || 0) * 1000,
                    )
                  : [2000, 5000][attempt];
              await this.o.delay(
                Math.min(60000, retry) + Math.floor(Math.random() * 100),
              );
            }
          } catch {
            if (attempt < 2) await this.o.delay([2000, 5000][attempt]);
          }
        }
        if (!accepted) this.lostEvents += batch.length;
      }
    } finally {
      this.busy = false;
      const waiters = this.waiters.splice(0);
      for (const resolve of waiters) resolve();
    }
  }
}
let client: WebAnalyticsClient | undefined;
let stop: (() => void) | undefined;
let currentScope = "";
let pendingAttempt = "";
let pendingEvents: {
  name: BrowserEvent["name"];
  extra: Partial<Pick<BrowserEvent, "step" | "validationCategory">>;
}[] = [];
export function startWebAnalytics(
  tenantId: string,
  page: (typeof PAGE_CODES)[number],
) {
  if (!globalThis.crypto?.randomUUID) return;
  if (
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_ANALYTICS_ENABLED !== "true"
  )
    return;
  const scope = `${location.origin}:${tenantId}`;
  if (currentScope && currentScope !== scope) stopWebAnalytics();
  currentScope = scope;
  if (!client) {
    let local: StorageLike, session: StorageLike;
    try {
      local = window.localStorage;
      session = window.sessionStorage;
    } catch {
      local = session = {
        getItem() {
          throw new Error("Storage unavailable");
        },
        setItem() {
          throw new Error("Storage unavailable");
        },
      };
    }
    client = new WebAnalyticsClient(
      {
        local,
        session,
        id: () => crypto.randomUUID(),
        now: () => Date.now(),
        monotonic: () => performance.now(),
        send: (u, i) => fetch(u, i),
        auth: () => {
          try {
            return localStorage.getItem("mi-receta-jwt");
          } catch {
            return null;
          }
        },
        delay: (ms) => new Promise((r) => setTimeout(r, ms)),
      },
      scope,
    );
    const activity = () => client?.activity();
    const pause = () => client?.pause();
    for (const name of ["pointerdown", "keydown", "touchstart", "scroll"])
      window.addEventListener(name, activity, { passive: true });
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", pause);
    const shown = () => client?.tick(false, false);
    window.addEventListener("pageshow", shown);
    const tick = setInterval(
      () =>
        client?.tick(
          document.visibilityState === "visible",
          document.hasFocus(),
        ),
      5000,
    );
    const flush = setInterval(() => void client?.flush(), 10000);
    const sample = setInterval(() => client?.sample(), 30000);
    stop = () => {
      clearInterval(tick);
      clearInterval(flush);
      clearInterval(sample);
      for (const name of ["pointerdown", "keydown", "touchstart", "scroll"])
        window.removeEventListener(name, activity);
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("blur", pause);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("pageshow", shown);
    };
  }
  client.page(page);
  if (pendingAttempt) {
    client.page("patient_form");
    client.attempt(pendingAttempt);
    client.event("form_opened");
    pendingAttempt = "";
    for (const e of pendingEvents) client.event(e.name, e.extra);
    pendingEvents = [];
  }
}
export function analyticsAttempt(requestId: string) {
  try {
    if (!client) {
      pendingAttempt = requestId;
      return;
    }
    client.page("patient_form");
    client.attempt(requestId);
    client.event("form_opened");
  } catch {
    /* Measurement cannot break form navigation. */
  }
}
export function analyticsEvent(
  name: BrowserEvent["name"],
  extra: Partial<Pick<BrowserEvent, "step" | "validationCategory">> = {},
) {
  try {
    if (client) client.event(name, extra);
    else if (pendingEvents.length < 40) pendingEvents.push({ name, extra });
  } catch {
    /* Measurement cannot break form interaction. */
  }
}
export function analyticsContext() {
  try {
    return client?.context();
  } catch {
    return undefined;
  }
}
export function stopWebAnalytics() {
  stop?.();
  stop = undefined;
  client = undefined;
  currentScope = "";
  pendingAttempt = "";
  pendingEvents = [];
}
