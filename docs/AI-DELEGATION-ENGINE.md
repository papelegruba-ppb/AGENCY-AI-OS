# AI Delegation Engine

Manual-first workflow for delegating work to Claude, ChatGPT, Gemini, DeepSeek or Perplexity.

## Behaviour
- Builds a structured prompt with task, optional context, project briefing fields, repository guidance, security constraints, test requirements and acceptance criteria.
- Project context is read locally from the active project and excludes phone/contact fields.
- Nothing is sent to an external provider. The user copies the prompt and opens the provider manually.
- Stores a project-scoped history in localStorage (maximum 100 global records; 30 shown per project).
- Accepts a pasted external response, provides a human checklist, and exports a Markdown review report.
- Does not execute returned code, access provider sessions, create commits, merge pull requests or deploy.

## Privacy and safety
- Provider credentials are never requested or stored.
- External AI output is untrusted input and must be reviewed before any code is applied.
- The review checklist is advisory; it does not certify code correctness.
- The project context deliberately excludes phone numbers and direct contact fields.
