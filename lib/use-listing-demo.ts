"use client";
import { useEffect, useSyncExternalStore } from "react";
const storageKey = "tetamo:local-listing-demo";
function readScope() {
  if (process.env.NODE_ENV !== "development") return "";
  try {
    const requested = new URL(window.location.href).searchParams.get("listingDemo");
    return requested && /^[a-z0-9-]{1,64}$/.test(requested) ? requested : sessionStorage.getItem(storageKey) || "";
  } catch { return ""; }
}
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
export function useListingDemo() {
  const scope = useSyncExternalStore(subscribe, readScope, () => "");
  useEffect(() => { if (scope) { try { sessionStorage.setItem(storageKey, scope); } catch { /* Tab remains isolated while the demo URL is present. */ } } }, [scope]);
  return scope;
}
