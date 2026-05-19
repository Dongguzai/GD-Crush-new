/**
 * M6.4: Lightweight Analytics Service
 *
 * Tracks product events without collecting sensitive personal data.
 * Uses anonymous user IDs and event-based tracking.
 *
 * Event Categories:
 * - onboarding: Profile creation flow
 * - chat: Chat interactions
 * - practice: Practice chapter flow
 * - action: Real-world action tracking
 * - reality: Reality event capture
 * - memory: Memory/recall interactions
 *
 * Privacy: No PII collected, events are anonymized
 */

type EventCategory =
  | "onboarding"
  | "chat"
  | "practice"
  | "action"
  | "reality"
  | "memory"
  | "voice"
  | "system";

type EventAction =
  | "started"
  | "completed"
  | "failed"
  | "abandoned"
  | "sent"
  | "received"
  | "created"
  | "updated"
  | "deleted";

interface AnalyticsEvent {
  category: EventCategory;
  action: EventAction;
  label?: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp: number;
}

interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, for sampling
  debug: boolean;
}

const defaultConfig: AnalyticsConfig = {
  enabled: true,
  sampleRate: 1.0, // Track all events by default
  debug: process.env.NODE_ENV !== "production",
};

// In-memory event buffer (for batching in production)
const eventBuffer: AnalyticsEvent[] = [];
const MAX_BUFFER_SIZE = 20;

/**
 * Get or generate anonymous session ID
 * This is not tied to user identity, just for session grouping
 */
function getAnonymousSessionId(): string {
  if (typeof window === "undefined") {
    return `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const storageKey = "gd_anonymous_session";
  let sessionId = sessionStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

/**
 * Track an analytics event
 */
export function trackEvent(
  category: EventCategory,
  action: EventAction,
  options?: {
    label?: string;
    metadata?: Record<string, string | number | boolean>;
    sampleRate?: number;
  }
): void {
  const config: AnalyticsConfig = {
    ...defaultConfig,
    sampleRate: options?.sampleRate ?? defaultConfig.sampleRate,
  };

  // Skip if disabled or sampling
  if (!config.enabled || Math.random() > config.sampleRate) {
    return;
  }

  const event: AnalyticsEvent = {
    category,
    action,
    label: options?.label,
    metadata: options?.metadata,
    timestamp: Date.now(),
  };

  // Log in debug mode
  if (config.debug) {
    console.debug(`[Analytics] ${category}.${action}`, {
      label: options?.label,
      ...options?.metadata,
    });
  }

  // Add to buffer
  eventBuffer.push(event);

  // Flush if buffer is full (in production, this would send to analytics backend)
  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    flushEvents();
  }
}

/**
 * Flush buffered events to analytics backend
 */
export function flushEvents(): AnalyticsEvent[] {
  const events = [...eventBuffer];
  eventBuffer.length = 0;

  if (events.length === 0) {
    return [];
  }

  // In production, this would POST to an analytics endpoint
  // For now, just return the events for testing
  if (defaultConfig.debug) {
    console.debug("[Analytics] Flushed events:", events.length);
  }

  return events;
}

/**
 * Get current event buffer (for testing)
 */
export function getEventBuffer(): AnalyticsEvent[] {
  return [...eventBuffer];
}

/**
 * Clear event buffer (for testing)
 */
export function clearEventBuffer(): void {
  eventBuffer.length = 0;
}

// Convenience functions for common events

export function trackOnboardingStep(step: string, action: EventAction) {
  trackEvent("onboarding", action, { label: step });
}

export function trackChatMessage(sent: boolean) {
  trackEvent("chat", sent ? "sent" : "received");
}

export function trackPracticeChapter(
  action: "started" | "completed" | "abandoned",
  scenarioType?: string
) {
  trackEvent("practice", action, {
    label: scenarioType,
    metadata: scenarioType ? { scenarioType } : undefined,
  });
}

export function trackRealityCapture(action: "created" | "failed") {
  trackEvent("reality", action);
}

export function trackAction(action: "created" | "updated" | "deleted", status?: string) {
  trackEvent("action", action, {
    metadata: status ? { status } : undefined,
  });
}

export function trackMemory(action: "created" | "viewed", sourceType?: string) {
  trackEvent("memory", action, {
    label: sourceType,
    metadata: sourceType ? { sourceType } : undefined,
  });
}

export function trackVoiceGeneration(success: boolean, provider?: string) {
  trackEvent("voice", success ? "completed" : "failed", {
    metadata: provider ? { provider } : undefined,
  });
}

// AI performance tracking (for cost monitoring)

export interface AiMetrics {
  latencyMs: number;
  success: boolean;
  errorType?: string;
  tokens?: number;
}

export function trackAiMetrics(
  operation: string,
  metrics: AiMetrics
): void {
  trackEvent("system", metrics.success ? "completed" : "failed", {
    label: operation,
    metadata: {
      latencyMs: metrics.latencyMs,
      errorType: metrics.errorType,
      tokens: metrics.tokens ?? 0,
    },
  });
}
