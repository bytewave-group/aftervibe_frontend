"use client";

import { apiTenantId } from "@/lib/api/env";
import { useEffect } from "react";

/**
 * Venue links/QRs from the admin (and the old hash-router customer app) look like
 * `https://voxxclub.vip/#/?tenant=<id>`. This site is one tenant per deployment: the tenant is
 * baked in at build time (NEXT_PUBLIC_API_TENANT_ID) and sent as X-Tenant-ID on every API call,
 * so the hash is not needed. Accept such a link and drop the `#/...` part so the address stays clean.
 */
export function LegacyTenantLink() {
  useEffect(() => {
    const { hash, pathname, search } = window.location;
    if (!hash.startsWith("#/")) return;
    const query = hash.indexOf("?");
    const tenant = query < 0 ? null : new URLSearchParams(hash.slice(query + 1)).get("tenant");
    const builtFor = apiTenantId();
    if (tenant && builtFor && tenant !== builtFor) {
      console.warn(`[tenant] link is for tenant ${tenant}, but this site serves ${builtFor}.`);
    }
    window.history.replaceState(window.history.state, "", `${pathname}${search}`);
  }, []);
  return null;
}
