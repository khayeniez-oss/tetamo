export function isStaleMonaFollowUpClaim(
  claimedAt: string | null | undefined,
  lastInboundAt: string | null | undefined
): boolean {
  const claimed = Date.parse(claimedAt || "");
  const inbound = Date.parse(lastInboundAt || "");

  return (
    !Number.isFinite(claimed) ||
    (Number.isFinite(inbound) && inbound >= claimed)
  );
}
