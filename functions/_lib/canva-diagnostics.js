const SENSITIVE_KEYS = /(?:client_secret|access_token|refresh_token|authorization|cookie|code_verifier|verifier|state|code)/i;

export function sanitizeCanvaDiagnosticMessage(message, env = {}) {
  let value = String(message || "Unknown error");
  for (const key of ["CANVA_CLIENT_SECRET", "CANVA_CLIENT_ID", "CANVA_TOKEN_ENCRYPTION_KEY"]) {
    const secret = env?.[key];
    if (typeof secret === "string" && secret.length >= 4) value = value.split(secret).join("[REDACTED]");
  }
  value = value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:client_secret|access_token|refresh_token|code_verifier|state|code)=)[^&#\s]*/gi, "$1[REDACTED]")
    .replace(/\b(client_secret|access_token|refresh_token|code_verifier|verifier|authorization|cookie)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[REDACTED]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, match => {
      try {
        const url = new URL(match);
        for (const key of [...url.searchParams.keys()]) if (SENSITIVE_KEYS.test(key)) url.searchParams.set(key, "[REDACTED]");
        return url.toString();
      } catch { return "[URL REDACTED]"; }
    });
  return value.slice(0, 240);
}
