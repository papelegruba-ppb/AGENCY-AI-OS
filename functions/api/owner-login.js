import { ownerLogin } from "../_lib/owner-auth.js";
export async function onRequestPost({ request, env }) { return ownerLogin(request, env); }
