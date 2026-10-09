// Phase 1 observation only. No prompts, messages, audio, credentials or DB writes.
// Enable explicitly in BOTH local processes: MONA_PHASE1_TRACE=1.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const storage = new AsyncLocalStorage();
const processId = randomUUID();
let sequence = 0;
let spanSequence = 0;
let buffered = [];
let scheduled = false;
let dropped = 0;
const LIMIT = 20000;
const noop = Object.freeze({ phase() {}, end() {}, error() {} });
const enabled = () => process.env.MONA_PHASE1_TRACE === "1";
const safeId = value => typeof value === "string" && /^[A-Za-z0-9_.:-]{1,160}$/.test(value) ? value : null;

function attributes(values = {}) {
  const result = {};
  for (const [key, value] of Object.entries(values)) {
    if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;
    if (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) result[key] = value;
    else if (typeof value === "string") result[key] = value.slice(0, 160);
  }
  return result;
}

export function phase1Flush() {
  scheduled = false;
  const batch = buffered;
  buffered = [];
  if (dropped) {
    batch.push({ schema: "mona.phase1.v1", kind: "trace.dropped", process_id: processId, dropped });
    dropped = 0;
  }
  try {
    if (batch.length) process.stdout.write(batch.map(value => "MONA_PHASE1 " + JSON.stringify(value) + "\n").join(""));
  } catch { /* Telemetry must never control Mona. */ }
}

function record(context, value) {
  try {
    if (!context) return;
    if (buffered.length >= LIMIT) { dropped++; return; }
    buffered.push({
      schema: "mona.phase1.v1", process_id: processId, pid: process.pid,
      event_seq: ++sequence, wall_ms: Date.now(), mono_ms: performance.now(),
      ...context.ids, ...value,
    });
    if (!scheduled) { scheduled = true; setImmediate(phase1Flush); }
  } catch { /* Observation is best effort. */ }
}

export function phase1CallId() {
  try { return enabled() ? randomUUID() : null; } catch { return null; }
}

export function phase1Run(ids, operation) {
  if (!enabled()) return operation();
  let context;
  try { context = { ids: attributes(ids), stack: [], spanNumber: 0 }; }
  catch { return operation(); }
  return storage.run(context, operation);
}

export function phase1Mark(name, values = {}) {
  try {
    const context = storage.getStore();
    record(context, { kind: "event", name, parent_id: context?.stack.at(-1)?.id || null, attrs: attributes(values) });
  } catch { /* Observation only. */ }
}

export function phase1Stage(name, values = {}, receivedAt) {
  try {
    const context = storage.getStore();
    if (!context) return noop;
    const now = performance.now();
    const start = Number.isFinite(receivedAt) && receivedAt >= 0 && receivedAt <= now ? receivedAt : now;
    const entry = { id: `${processId}:${++spanSequence}`, name };
    const parentId = context.stack.at(-1)?.id || null;
    context.stack.push(entry);
    let phase = null;
    let closed = false;
    let failed = false;
    const finishPhase = now => {
      if (!phase) return;
      record(context, { kind: "phase", name: phase.name, span_id: entry.id, stage: name,
        start_ms: phase.start, end_ms: now, duration_ms: now - phase.start, attrs: phase.attrs });
      phase = null;
    };
    record(context, { kind: "span.start", name, span_id: entry.id, parent_id: parentId, start_ms: start, attrs: attributes(values) });
    return {
      phase(phaseName, phaseValues = {}) {
        try {
          if (closed) return;
          const now = performance.now();
          finishPhase(now);
          phase = { name: phaseName, start: now, attrs: attributes(phaseValues) };
        } catch { /* Observation only. */ }
      },
      error(error) {
        try {
          if (closed) return;
          failed = true;
          record(context, { kind: "event", name: "stage.error", parent_id: entry.id,
            attrs: { error_type: safeId(error?.name), http_status: typeof error?.status === "number" ? error.status : null } });
        } catch { /* Never log exception messages or bodies. */ }
      },
      end(endValues = {}) {
        try {
          if (closed) return;
          const now = performance.now();
          finishPhase(now);
          closed = true;
          const index = context.stack.indexOf(entry);
          if (index >= 0) context.stack.splice(index, 1);
          record(context, { kind: "span.end", name, span_id: entry.id, parent_id: parentId,
            start_ms: start, end_ms: now, duration_ms: now - start, error: failed, attrs: attributes(endValues) });
        } catch { /* Observation only. */ }
      },
    };
  } catch { return noop; }
}

// Identity wrapper: the original expression is evaluated first and returned unchanged.
export function phase1Next(stage, phase, value) {
  try { stage.phase(phase); } catch { /* Observation only. */ }
  return value;
}

export function phase1Request(stage, value) {
  try { stage.phase("provider.request", { model: value.model, max_output_tokens: value.max_output_tokens }); }
  catch { /* Observation only. */ }
  return value;
}

export function phase1Response(stage, response) {
  try {
    stage.phase("parse");
    phase1Mark("provider.response", {
      request_id: safeId(response?._request_id), status: safeId(response?.status),
      model: safeId(response?.model), input_tokens: response?.usage?.input_tokens,
      cached_input_tokens: response?.usage?.input_tokens_details?.cached_tokens,
      output_tokens: response?.usage?.output_tokens,
    });
  } catch { /* Never log output_text or request input. */ }
}

export function phase1Result(stage, value, branch) {
  try {
    phase1Mark("stage.return", { branch, action: safeId(value?.action),
      source: safeId(value?.source), verdict: safeId(value?.verdict),
      status: typeof value?.status === "number" ? value.status : safeId(value?.status),
      strategist: safeId(value?.strategist) });
  } catch { /* Return the exact original value. */ }
  return value;
}

// Observe fetch-to-headers per SDK attempt. Return the identical Response/error;
// do not consume/clone bodies or modify request options, retries or cancellation.
export function phase1OpenAIOptions() {
  if (!enabled()) return {};
  const originalFetch = globalThis.fetch;
  if (typeof originalFetch !== "function") return {};
  return { fetch: function (...args) {
    if (!storage.getStore()) return originalFetch(...args);
    const stage = phase1Stage("provider.http_attempt");
    stage.phase("fetch_to_headers");
    try {
      return originalFetch(...args).then(response => {
        try { stage.end({ http_status: response.status, request_id: safeId(response.headers.get("x-request-id")) }); }
        catch { stage.end(); }
        return response;
      }, error => { stage.error(error); stage.end(); throw error; });
    } catch (error) { stage.error(error); stage.end(); throw error; }
  } };
}

export function phase1Headers() {
  try {
    const ids = storage.getStore()?.ids;
    if (!ids) return {};
    const result = {};
    for (const key of ["call_id", "turn_id", "item_id", "turn_generation", "completion_seq"]) {
      const value = String(ids[key] ?? "");
      if (safeId(value)) result["x-mona-phase1-" + key.replaceAll("_", "-")] = value;
    }
    return result;
  } catch { return {}; }
}

export function phase1RouteIds(request) {
  try {
    if (!enabled()) return {};
    const result = { side: "route" };
    for (const key of ["call_id", "turn_id", "item_id", "turn_generation", "completion_seq"]) {
      result[key] = safeId(request.headers.get("x-mona-phase1-" + key.replaceAll("_", "-")));
    }
    result.call_id ||= phase1CallId();
    result.turn_id ||= "route-" + phase1CallId();
    return result;
  } catch { return { side: "route", call_id: phase1CallId(), turn_id: phase1CallId() }; }
}

export function phase1Runtime() {
  try {
    let hostname = null;
    try { hostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname; } catch {}
    return { supabase_hostname: hostname, node_version: process.version, node_env: process.env.NODE_ENV || null };
  } catch { return {}; }
}
