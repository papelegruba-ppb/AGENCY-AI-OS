import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const CANVA_MCP_URL = "https://api.canva.com/connect/v1/mcp";
const PREFIX = "canva-oauth:";
const TOKEN_KEY = PREFIX + "tokens";
const STATE_KEY = PREFIX + "state";
const VERIFIER_KEY = PREFIX + "verifier";
const DISCOVERY_KEY = PREFIX + "discovery";
const ENCRYPTION_SECRET_KEY = "CANVA_TOKEN_ENCRYPTION_KEY";
const CALLBACK_PATH = "/api/canva/callback";

function randomId(bytes = 32) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map(v => v.toString(16).padStart(2, "0")).join("");
}
function parse(raw) { try { return raw ? JSON.parse(raw) : undefined; } catch { return undefined; } }
function toBase64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function fromBase64(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
async function tokenCryptoKey(env) {
  const secret = String(env[ENCRYPTION_SECRET_KEY] || "");
  if (secret.length < 32) throw new Error("CANVA_TOKEN_ENCRYPTION_KEY must be configured as a 32+ character Cloudflare Secret.");
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function encryptTokens(env, tokens) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await tokenCryptoKey(env);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(tokens)));
  return JSON.stringify({ version: 1, iv: toBase64(iv), ciphertext: toBase64(ciphertext) });
}
async function decryptTokens(env, raw) {
  if (!raw) return undefined;
  const record = parse(raw);
  if (!record || record.version !== 1 || !record.iv || !record.ciphertext) throw new Error("Stored Canva token record is invalid.");
  const key = await tokenCryptoKey(env);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(record.iv) }, key, fromBase64(record.ciphertext));
  return parse(new TextDecoder().decode(plaintext));
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
export { json as canvaJson };

export class CanvaOAuthProvider {
  constructor(env, origin) {
    this.env = env;
    this.kv = env.AGENCY_KV;
    this.redirectUrl = new URL(CALLBACK_PATH, origin).toString();
    this.clientMetadata = {
      client_name: "Agency AI OS",
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "client_secret_basic",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web"
    };
    this.authorizationUrl = "";
  }
  clientInformation() {
    return {
      client_id: this.env.CANVA_CLIENT_ID,
      client_secret: this.env.CANVA_CLIENT_SECRET,
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "client_secret_basic"
    };
  }
  async saveClientInformation() { /* Developer Portal credentials remain in Cloudflare Secrets only. */ }
  async tokens() { return decryptTokens(this.env, await this.kv.get(TOKEN_KEY)); }
  async saveTokens(tokens) { await this.kv.put(TOKEN_KEY, await encryptTokens(this.env, tokens)); }
  async state() {
    const value = randomId();
    await this.kv.put(STATE_KEY, value, { expirationTtl: 900 });
    return value;
  }
  async saveCodeVerifier(value) { await this.kv.put(VERIFIER_KEY, value, { expirationTtl: 900 }); }
  async codeVerifier() {
    const value = await this.kv.get(VERIFIER_KEY);
    if (!value) throw new Error("OAuth PKCE verifier missing or expired");
    return value;
  }
  async saveDiscoveryState(value) { await this.kv.put(DISCOVERY_KEY, JSON.stringify(value), { expirationTtl: 900 }); }
  async discoveryState() {
    const value = parse(await this.kv.get(DISCOVERY_KEY));
    if (!value) throw new Error("OAuth discovery state missing or expired");
    return value;
  }
  redirectToAuthorization(url) { this.authorizationUrl = url.toString(); }
  async validateResourceURL(serverUrl, resource) {
    const expected = new URL(serverUrl.toString());
    expected.hash = "";
    if (resource && new URL(resource).origin !== expected.origin) throw new Error("Canva MCP resource metadata origin mismatch");
    return expected;
  }
  async clearPending() {
    await Promise.all([this.kv.delete(STATE_KEY), this.kv.delete(VERIFIER_KEY), this.kv.delete(DISCOVERY_KEY)]);
  }
  async clearTokens() { await this.kv.delete(TOKEN_KEY); }
}

function makeClient(provider) {
  const client = new Client({ name: "agency-ai-os", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(CANVA_MCP_URL), { authProvider: provider });
  return { client, transport };
}
export async function connectCanva(env, origin) {
  if (!env.CANVA_CLIENT_ID || !env.CANVA_CLIENT_SECRET || !env.CANVA_TOKEN_ENCRYPTION_KEY || String(env.CANVA_TOKEN_ENCRYPTION_KEY).length < 32 || !env.AGENCY_KV) throw new Error("Configura CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_TOKEN_ENCRYPTION_KEY (32+ caracteres) y AGENCY_KV.");
  const provider = new CanvaOAuthProvider(env, origin);
  const { client, transport } = makeClient(provider);
  try {
    await client.connect(transport);
    const result = await client.listTools();
    await env.AGENCY_KV.put(PREFIX + "tools", JSON.stringify(result.tools || []));
    await env.AGENCY_KV.put("canva_connection_status", "connected");
    return { connected: true, tools: result.tools || [] };
  } catch (error) {
    if (provider.authorizationUrl) {
      return { authorizationUrl: provider.authorizationUrl };
    }
    throw error;
  } finally {
    try { await client.close(); } catch {}
  }
}
export async function finishCanvaOAuth(env, origin, params) {
  const expectedState = await env.AGENCY_KV.get(STATE_KEY);
  if (!expectedState || params.get("state") !== expectedState) throw new Error("OAuth state no válido o caducado.");
  if (params.has("error")) throw new Error("Canva no ha autorizado la conexión. Reinicia el proceso desde Agency AI OS.");
  const provider = new CanvaOAuthProvider(env, origin);
  const first = makeClient(provider);
  try {
    await first.transport.finishAuth(params);
  } finally {
    try { await first.client.close(); } catch {}
  }
  await provider.clearPending();
  const fresh = makeClient(provider);
  try {
    await fresh.client.connect(fresh.transport);
    const result = await fresh.client.listTools();
    await env.AGENCY_KV.put(PREFIX + "tools", JSON.stringify(result.tools || []));
    await env.AGENCY_KV.put("canva_connection_status", "connected");
    return { connected: true, tools: result.tools || [] };
  } finally {
    try { await fresh.client.close(); } catch {}
  }
}
export async function withCanvaClient(env, origin, action) {
  const provider = new CanvaOAuthProvider(env, origin);
  const tokens = await provider.tokens();
  if (!tokens?.access_token) throw new Error("Canva no está autorizada. Pulsa Conectar Canva.");
  const { client, transport } = makeClient(provider);
  try {
    await client.connect(transport);
    return await action(client);
  } finally {
    try { await client.close(); } catch {}
  }
}
export async function disconnectCanva(env) {
  const provider = new CanvaOAuthProvider(env, "https://localhost");
  await Promise.all([
    provider.clearTokens(), provider.clearPending(),
    env.AGENCY_KV.delete(PREFIX + "tools"),
    env.AGENCY_KV.delete("canva_connection_status")
  ]);
}
