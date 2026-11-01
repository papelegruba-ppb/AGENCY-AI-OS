# Project file vault — deployment and limits

Adds a private owner-only upload/list/delete API for project files. Binaries are stored in a private R2 bucket and metadata in D1. It does not yet extract text, run OCR, index documents, or send files to an AI provider.

## Cloudflare setup required
1. Create a private R2 bucket. Do not enable a public r2.dev URL or public custom domain.
2. Add an R2 binding named AGENCY_FILES to the Pages project/functions environment, pointing to that bucket.
3. Apply migrations/0002_project_files.sql to the same D1 database already bound as AGENCY_DB.
4. Deploy the branch preview and test while authenticated in the private owner workspace.

No API key or paid third-party service is activated. Cloudflare quotas and plan terms still apply.

## API
- GET /api/project-files?projectId=<id> lists metadata for files belonging to the owner and project.
- POST /api/project-files streams a raw file body; headers: x-project-id, x-file-name and the actual Content-Type.
- DELETE /api/project-files?projectId=<id>&fileId=<uuid> deletes the private object and metadata.

## Security limits
- Existing owner session and same-origin checks are mandatory.
- Owner/project checks are enforced server-side for every operation.
- Allowlist: PDF, PNG, JPG/JPEG, WEBP, GIF, TXT, MD, CSV, JSON, DOCX, XLSX and PPTX.
- Maximum 8 MiB per file; maximum 100 files per project.
- Files are not publicly served and no public object URL is returned.
- MIME and extension are checked, but this is not a malware scanner or full file signature validation. Do not upload executable files or highly sensitive data.
- Uploads are marked pending; no claim of OCR, parsing, embeddings or AI retrieval is made.

## Next
Add content extraction in an isolated processing step, safe PDF/Office parsing, OCR for scanned files/images, chunking with page/sheet/slide provenance, and retrieval constrained by project ID. Treat document contents as untrusted input and ignore embedded prompt instructions.
