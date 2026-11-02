import test from "node:test";
import assert from "node:assert/strict";

import { onRequestPost as projectAssistant } from "../functions/api/project-assistant.js";
import { onRequestPost as generateProposal } from "../functions/api/generate-proposal.js";
import { onRequestPost as webBuild } from "../functions/api/web-build.js";
import { onRequestGet as pagespeed } from "../functions/api/pagespeed.js";
import { onRequestPost as siteAudit } from "../functions/api/site-audit.js";
import { onRequestPost as seoAudit } from "../functions/api/seo-audit.js";
import { onRequestPost as driveSave } from "../functions/api/drive-save.js";
import { onRequestPost as gscData } from "../functions/api/gsc-data.js";
import { onRequestGet as integrationsStatus } from "../functions/api/integrations/status.js";
import { onRequestGet as driveAuth } from "../functions/api/drive-auth.js";
import { onRequestGet as driveCallback } from "../functions/api/drive-callback.js";
import { onRequestGet as gscAuth } from "../functions/api/gsc-auth.js";
import { onRequestGet as gscCallback } from "../functions/api/gsc-callback.js";
import { onRequestPost as chat } from "../functions/api/chat.js";
import { onRequestPost as agentOrchestrator } from "../functions/api/agent-orchestrator.js";
import { onRequestPost as socialStudio } from "../functions/api/social-studio.js";

const protectedRoutes = [
  ["project assistant", projectAssistant, "POST"],
  ["proposal generation", generateProposal, "POST"],
  ["web build", webBuild, "POST"],
  ["PageSpeed", pagespeed, "GET"],
  ["site audit", siteAudit, "POST"],
  ["legacy SEO audit", seoAudit, "POST"],
  ["Google Drive save", driveSave, "POST"],
  ["Search Console data", gscData, "POST"],
  ["integration status", integrationsStatus, "GET"],
  ["Google Drive OAuth start", driveAuth, "GET"],
  ["Google Drive OAuth callback", driveCallback, "GET"],
  ["Search Console OAuth start", gscAuth, "GET"],
  ["Search Console OAuth callback", gscCallback, "GET"],
  ["chat", chat, "POST"],
  ["agent orchestrator", agentOrchestrator, "POST"],
  ["social studio", socialStudio, "POST"]
];

function makeContext(method, origin = "https://agency.test") {
  const request = new Request("https://agency.test/api/test", {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: method === "POST" ? "{}" : undefined
  });
  return { request, env: {} };
}

for (const [name, handler, method] of protectedRoutes) {
  test(name + " rejects unauthenticated requests before doing work", async () => {
    const response = method === "GET"
      ? await handler(makeContext(method))
      : await handler(makeContext(method));
    assert.equal(response.status, 401, name + " must require an owner session");
    const body = await response.json();
    assert.equal(body.code, "OWNER_AUTH_REQUIRED");
  });

  test(name + " rejects cross-origin requests", async () => {
    const response = await handler(makeContext(method, "https://attacker.test"));
    assert.equal(response.status, 403, name + " must reject cross-origin requests");
  });
}
