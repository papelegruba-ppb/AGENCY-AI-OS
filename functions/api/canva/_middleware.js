import { requireOwner } from "../../_lib/owner-auth.js";

// Canva must be able to reach the OAuth redirect without the owner's browser
// session. The callback is protected by the short-lived, single-flow OAuth
// state checked by finishCanvaOAuth(); all other Canva API routes stay private.
export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;
  if (pathname === "/api/canva/callback") return context.next();
  return requireOwner(context);
}
