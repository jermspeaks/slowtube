-- Migration: Create settings table
-- This migration creates a table for storing application settings (e.g., timezone preference)

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

