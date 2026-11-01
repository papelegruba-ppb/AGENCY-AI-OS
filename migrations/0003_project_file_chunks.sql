-- Extracted text chunks for project-scoped keyword retrieval.
CREATE TABLE IF NOT EXISTS project_file_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_file_chunks_owner_project
  ON project_file_chunks(owner_id, project_id, file_id, chunk_index);
