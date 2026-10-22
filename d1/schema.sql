-- Cloudflare D1 (SQLite) Schema for SD Infinova
-- Version: 001_initial_schema

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  deliverables TEXT DEFAULT '[]',
  workflow TEXT DEFAULT '[]',
  problems_solved TEXT DEFAULT '[]',
  icon_name TEXT NOT NULL DEFAULT 'Code',
  sort_order INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_case_study TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  gallery_images TEXT DEFAULT '[]',
  tech_stack TEXT DEFAULT '[]',
  live_url TEXT,
  repo_url TEXT,
  client_name TEXT,
  completion_date TEXT,
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  metrics TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'SD Infinova Team',
  cover_image TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  reading_time_minutes INTEGER DEFAULT 5,
  is_published INTEGER DEFAULT 1,
  published_at TEXT DEFAULT (datetime('now')),
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  project_type TEXT NOT NULL,
  budget_range TEXT NOT NULL,
  expected_timeline TEXT,
  description TEXT NOT NULL,
  preferred_contact TEXT DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'new',
  internal_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  date_str TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_date_path ON page_views (date_str, path);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs (created_at DESC);
