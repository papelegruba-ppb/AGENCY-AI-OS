const PROVIDERS = {
  deepseek: { key: "DEEPSEEK_API_KEY", model: "DEEPSEEK_MODEL" },
  openai: { key: "OPENAI_API_KEY", model: "OPENAI_MODEL" },
  gemini: { key: "GEMINI_API_KEY", model: "GEMINI_MODEL" },
  anthropic: { key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
  perplexity: { key: "PERPLEXITY_API_KEY", model: "PERPLEXITY_MODEL" }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
const boundedInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function aiStatus(env) {
  const provider = String(env.AI_PROVIDER || "").toLowerCase();
  const spec = PROVIDERS[provider];
  const configuredProviders = Object.entries(PROVIDERS).filter(([, item]) => Boolean(env[item.key] && env[item.model] && env.AGENCY_KV)).map(([id, item]) => ({ id, model: String(env[item.model]), configured: true }));
  const configured = Boolean(env.AI_ENABLED === "true" && spec && env[spec.key] && env[spec.model] && env.AGENCY_KV);
  return {
    ok: true,
    enabled: env.AI_ENABLED === "true",
    configured,
    provider: spec ? provider : null,
    configuredProviders,
    modelConfigured: Boolean(spec && env[spec.model]),
    keyConfigured: Boolean(spec && env[spec.key]),
    usageStoreConfigured: Boolean(env.AGENCY_KV),
    limits: {
      globalDailyRequests: boundedInt(env.AI_DAILY_LIMIT, 20, 1, 100),
      perIpDailyRequests: boundedInt(env.AI_IP_DAILY_LIMIT, 5, 1, 30),
      maxOutputTokens: boundedInt(env.AI_MAX_OUTPUT_TOKENS, 1200, 128, 2000)
    },
    safety: "El uso de IA está cerrado por defecto. Solo se activa con AI_ENABLED=true, un proveedor/modelo explícito y AGENCY_KV. Los límites diarios son un freno operativo, no un límite monetario garantizado."
  };
}

export async function reserveAiCall({ env, request, endpoint, providerOverride }) {
  const status = aiStatus(env);
  const selectedProvider = String(providerOverride || status.provider || "").toLowerCase();
  const selectedSpec = PROVIDERS[selectedProvider];
  if (!status.enabled) return { ok: false, response: json({ ok: false, error: "Las llamadas de IA están desactivadas. Activa AI_ENABLED=true solo después de revisar el proveedor y su facturación.", code: "AI_DISABLED" }, 503) };
  if (env.AI_BILLABLE_ENABLED !== "true") return { ok: false, response: json({ ok: false, error: "Integración de IA desactivada por la política de coste cero. No se ha contactado con ningún proveedor. Revisa precio y cuotas y autoriza AI_BILLABLE_ENABLED=true en Cloudflare para activarla.", code: "INTEGRATION_DISABLED", integration: "ai" }, 503) };
  if (!selectedSpec || !env[selectedSpec.key] || !env[selectedSpec.model] || !env.AGENCY_KV) return { ok: false, response: json({ ok: false, error: "El proveedor seleccionado no tiene clave, modelo o almacenamiento de cuotas configurados.", code: "AI_PROVIDER_NOT_CONFIGURED", provider: selectedProvider || null }, 503) };

  const provider = selectedProvider;
  const spec = selectedSpec;
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await digest(ip);
  const globalKey = "ai-usage:global:" + day;
  const ipKey = "ai-usage:ip:" + day + ":" + ipHash;
  const kv = env.AGENCY_KV;

  try {
    const [globalRaw, ipRaw] = await Promise.all([kv.get(globalKey), kv.get(ipKey)]);
    const globalCount = Number.parseInt(globalRaw || "0", 10) || 0;
    const ipCount = Number.parseInt(ipRaw || "0", 10) || 0;
    if (globalCount >= status.limits.globalDailyRequests) {
      return { ok: false, response: json({ ok: false, error: "Se ha alcanzado el límite diario global de IA. Vuelve a intentarlo mañana.", code: "AI_DAILY_LIMIT_REACHED" }, 429) };
    }
    if (ipCount >= status.limits.perIpDailyRequests) {
      return { ok: false, response: json({ ok: false, error: "Has alcanzado el límite diario de solicitudes de IA desde esta conexión.", code: "AI_IP_LIMIT_REACHED" }, 429) };
    }
    const options = { expirationTtl: 172800 };
    await Promise.all([
      kv.put(globalKey, String(globalCount + 1), options),
      kv.put(ipKey, String(ipCount + 1), options)
    ]);
  } catch {
    return { ok: false, response: json({ ok: false, error: "No se pudo comprobar el límite de uso. Por seguridad, la llamada de IA se ha bloqueado.", code: "AI_USAGE_STORE_UNAVAILABLE" }, 503) };
  }

  return {
    ok: true,
    provider,
    model: env[spec.model],
    apiKey: env[spec.key],
    maxOutputTokens: status.limits.maxOutputTokens,
    endpoint
  };
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export async function runAiText({ env, request, endpoint, system, input, provider: providerOverride, maxOutputTokens = 1200, jsonMode = false, temperature = 0.4 }) {
  const reserved = await reserveAiCall({ env, request, endpoint, providerOverride });
  if (!reserved.ok) return reserved;

  const provider = reserved.provider;
  const model = reserved.model;
  const apiKey = reserved.apiKey;
  const outputLimit = Math.min(reserved.maxOutputTokens, boundedInt(maxOutputTokens, reserved.maxOutputTokens, 128, 2000));
  let url, headers = { "content-type": "application/json" }, body;

  if (provider === "deepseek" || provider === "perplexity") {
    url = provider === "deepseek" ? "https://api.deepseek.com/chat/completions" : "https://api.perplexity.ai/chat/completions";
    headers.authorization = "Bearer " + apiKey;
    body = {
      model, messages: [{ role: "system", content: system }, { role: "user", content: input }],
      max_tokens: outputLimit, temperature, stream: false,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {})
    };
  } else if (provider === "openai") {
    url = "https://api.openai.com/v1/responses";
    headers.authorization = "Bearer " + apiKey;
    body = { model, instructions: system, input, max_output_tokens: outputLimit };
  } else if (provider === "gemini") {
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
    headers["x-goog-api-key"] = apiKey;
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: input }] }],
      generationConfig: { maxOutputTokens: outputLimit, temperature, ...(jsonMode ? { responseMimeType: "application/json" } : {}) }
    };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = { model, system, messages: [{ role: "user", content: input }], max_tokens: outputLimit, temperature };
  } else {
    return { ok: false, response: json({ ok: false, error: "Proveedor no compatible.", code: "AI_PROVIDER_UNSUPPORTED" }, 503) };
  }

  try {
    const response = await fetch(url, {
      method: "POST", headers, body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error(JSON.stringify({ event: "ai_provider_failure", endpoint, provider, status: response.status }));
      return { ok: false, response: json({
        ok: false, error: response.status === 429 ? "El proveedor ha alcanzado su cuota o límite. No se cambiará automáticamente a otro proveedor." : "El proveedor de IA no pudo completar la solicitud. Revisa el modelo y la cuota configurados.",
        code: response.status === 429 ? "AI_PROVIDER_RATE_LIMIT" : "AI_PROVIDER_ERROR", provider, providerStatus: response.status
      }, response.status === 429 ? 429 : response.status >= 500 ? 502 : 400) };
    }

    let output = "";
    if (provider === "deepseek" || provider === "perplexity") output = data?.choices?.[0]?.message?.content || "";
    else if (provider === "openai") output = (data?.output || []).flatMap(item => item.content || []).filter(item => item.type === "output_text").map(item => item.text || "").join("\n");
    else if (provider === "gemini") output = (data?.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("\n");
    else if (provider === "anthropic") output = (data?.content || []).filter(item => item.type === "text").map(item => item.text || "").join("\n");

    if (!output || output.length > 40000) return { ok: false, response: json({ ok: false, error: "El proveedor devolvió una respuesta vacía o demasiado larga.", code: "AI_INVALID_RESPONSE", provider }, 502) };
    return { ok: true, provider, model, text: output };
  } catch (error) {
    const timeout = error?.name === "TimeoutError";
    console.error(JSON.stringify({ event: "ai_provider_exception", endpoint, provider, code: timeout ? "AI_TIMEOUT" : "AI_CONNECTION_ERROR" }));
    return { ok: false, response: json({ ok: false, error: timeout ? "La solicitud de IA superó el tiempo límite." : "No se pudo conectar con el proveedor de IA.", code: timeout ? "AI_TIMEOUT" : "AI_CONNECTION_ERROR", provider }, 502) };
  }
}
