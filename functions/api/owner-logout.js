import { ownerLogout } from "../_lib/owner-auth.js";
export async function onRequestPost({ request, env }) { return ownerLogout(request, env); }
