export type MonaOutboundFollowUpOutcome =
  | "send_failed"
  | "outbound_not_stored"
  | "started"
  | "persistence_failed";

export async function applyMonaOutboundFollowUpPolicy(params: {
  metaSendSucceeded: boolean;
  outboundStored: boolean;
  persist: () => Promise<unknown>;
  onPersistenceError?: (error: unknown) => void;
}): Promise<MonaOutboundFollowUpOutcome> {
  if (!params.metaSendSucceeded) {
    return "send_failed";
  }

  if (!params.outboundStored) {
    return "outbound_not_stored";
  }

  try {
    await params.persist();
    return "started";
  } catch (error) {
    params.onPersistenceError?.(error);
    return "persistence_failed";
  }
}
