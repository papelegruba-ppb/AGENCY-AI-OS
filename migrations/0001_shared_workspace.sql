CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'owner',
  name TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_owner_updated
  ON projects(owner_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS project_events (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'owner',
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_events_owner_project
  ON project_events(owner_id, project_id, created_at DESC);
