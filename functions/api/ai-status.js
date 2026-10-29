import { aiStatus } from "../_lib/ai-runtime.js";

export async function onRequestGet({ env }) {
  const status = aiStatus(env);
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
