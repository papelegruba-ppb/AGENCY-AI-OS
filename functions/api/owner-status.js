import { jsonResponse, ownerSession } from "../_lib/owner-auth.js";

export async function onRequestGet({ request, env }) {
  const ownerPasswordConfigured = Boolean(env.OWNER_PASSWORD);
  const agencyKvBound = Boolean(env.AGENCY_KV);
  const configured = ownerPasswordConfigured && agencyKvBound;

  return jsonResponse({
    ok: true,
    configured,
    authenticated: configured ? await ownerSession(request, env) : false,
    diagnostics: {
      ownerPasswordConfigured,
      agencyKvBound,
    },
  });
}
