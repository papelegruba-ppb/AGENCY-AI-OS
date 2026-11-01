import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const api=await readFile(new URL("../functions/api/social-studio.js",import.meta.url),"utf8");
const ui=await readFile(new URL("../social-studio.js",import.meta.url),"utf8");
const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
test("Social Studio requires private owner session and validates platform and campaign goal",()=>{
 assert.match(api,/ownerSession/);assert.match(api,/sameOrigin/);
 assert.match(api,/PLATFORMS\.has\(platform\)/);assert.match(api,/GOALS\.has\(goal\)/);
});
test("Social Studio uses the existing guarded AI runtime and does not publish",()=>{
 assert.match(api,/runAiText/);assert.match(api,/publication:"manual-approval-required"/);
 assert.match(api,/No publiques, programes ni conectes cuentas/);
});
test("Social Studio is project-scoped and integrated into the workspace",()=>{
 assert.match(ui,/agency-ai-os\.social-studio\.v1/);assert.match(ui,/project\.id/);
 assert.match(ui,/agency:active-project-change/);assert.match(ui,/\/api\/social-studio/);
 assert.match(html,/id="ss-title"/);assert.match(html,/src="social-studio.js"/);
});

test("project tools are collapsible and do not displace the chat composer",()=>{
 const chatPosition=html.indexOf('id="chat-messages"');
 const composerPosition=html.indexOf('id="chat-form"');
 const toolsPosition=html.indexOf('workspace-tool-accordions');
 assert.ok(chatPosition>=0&&composerPosition>chatPosition&&toolsPosition>composerPosition);
 assert.match(html,/<details class="workspace-tool-accordion">/);
});
