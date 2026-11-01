# Project-scoped assistant and fallback workflow

## Product contract
- A project is the unit of context, history, task planning and deliverables.
- Agents/tools are selected per request; no background agent execution is implied.
- The shared chat remains the conversational entry point and receives the active project context.
- A fallback plan must state: limitation/reason, recommended app, why it is used, cost/plan caveat, ready-to-copy prompt, expected output, destination inside the project, integration steps and validation.
- Never claim a third-party action, publication or deployment has happened unless the relevant integration confirms it.
- Do not send client documents to an external app without user choice and approval.

## Current implementation slice
- Adds a project-scoped task/alternative panel to the existing chat workspace.
- Tasks are keyed by project ID in a separate local browser store; this avoids mutating the existing project object or overwriting concurrent app state.
- The panel generates a structured fallback prompt for web, social, video, image, research and automation tasks.
- It stores up to 50 task plans per project and exposes copy/open workflows.
- The application catalogue is advisory. Pricing, free tiers, region availability, API access and export capabilities must be checked at the time of use.
- No external provider is invoked and no billable service is activated by this module.

## Deliberate limitations / next integration steps
- This is a deterministic fallback planner, not yet an AI capability detector. The assistant must later return a structured capability decision from the orchestrator (supported / unavailable / approval-required) and call this planner when needed.
- Task records currently live in localStorage and are not yet synced to Cloudflare D1/R2. Do not represent them as cloud-backed or multi-device.
- File ingestion, OCR, RAG, citations and social account analytics/publication are separate backend milestones; this UI does not claim to implement them.
- External recommendations are not guaranteed free. Verify current terms, quotas, export and commercial-use rights before customer work.
