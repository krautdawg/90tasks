import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db
  
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tasks.db')
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  db = new Database(dbPath)

  // Initialize database
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      list_id INTEGER,
      title TEXT NOT NULL,
      notes TEXT,
      due_date DATE,
      completed BOOLEAN DEFAULT FALSE,
      completed_at DATETIME,
      position INTEGER DEFAULT 0,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (list_id) REFERENCES lists(id),
      FOREIGN KEY (parent_id) REFERENCES tasks(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `)
  
  return db
}

// Helper functions
export function getUser(email: string) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as { id: number; email: string } | undefined
}

export function createUser(email: string) {
  const result = getDb().prepare('INSERT INTO users (email) VALUES (?)').run(email)
  return { id: result.lastInsertRowid as number, email }
}

export function getOrCreateUser(email: string) {
  return getUser(email) || createUser(email)
}

export function createMagicLink(id: string, email: string, expiresAt: Date) {
  getDb().prepare('INSERT INTO magic_links (id, email, expires_at) VALUES (?, ?, ?)').run(id, email, expiresAt.toISOString())
}

export function getMagicLink(id: string) {
  return getDb().prepare('SELECT * FROM magic_links WHERE id = ? AND used = FALSE AND expires_at > datetime("now")').get(id) as { id: string; email: string } | undefined
}

export function useMagicLink(id: string) {
  getDb().prepare('UPDATE magic_links SET used = TRUE WHERE id = ?').run(id)
}

export function createSession(id: string, userId: number, expiresAt: Date) {
  getDb().prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expiresAt.toISOString())
}

export function getSession(id: string) {
  return getDb().prepare(`
    SELECT s.*, u.email 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.id = ? AND s.expires_at > datetime("now")
  `).get(id) as { id: string; user_id: number; email: string } | undefined
}

export function deleteSession(id: string) {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

// Task functions
export function getTasks(userId: number, listId?: number) {
  if (listId) {
    return getDb().prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? AND list_id = ? AND parent_id IS NULL
      ORDER BY completed ASC, position ASC, created_at DESC
    `).all(userId, listId)
  }
  return getDb().prepare(`
    SELECT * FROM tasks 
    WHERE user_id = ? AND parent_id IS NULL
    ORDER BY completed ASC, position ASC, created_at DESC
  `).all(userId)
}

export function getTask(id: number, userId: number) {
  return getDb().prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId)
}

export function createTask(userId: number, data: { title: string; notes?: string; due_date?: string; list_id?: number; parent_id?: number }) {
  const result = getDb().prepare(`
    INSERT INTO tasks (user_id, title, notes, due_date, list_id, parent_id) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, data.title, data.notes || null, data.due_date || null, data.list_id || null, data.parent_id || null)
  return { id: result.lastInsertRowid as number, ...data }
}

export function updateTask(id: number, userId: number, data: Partial<{ title: string; notes: string; due_date: string; completed: boolean; position: number; list_id: number }>) {
  const fields: string[] = []
  const values: unknown[] = []
  
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
  if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date) }
  if (data.completed !== undefined) { 
    fields.push('completed = ?'); 
    values.push(data.completed ? 1 : 0)
    fields.push('completed_at = ?')
    values.push(data.completed ? new Date().toISOString() : null)
  }
  if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position) }
  if (data.list_id !== undefined) { fields.push('list_id = ?'); values.push(data.list_id) }
  
  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id, userId)
  
  getDb().prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
}

export function deleteTask(id: number, userId: number) {
  // Delete subtasks first
  getDb().prepare('DELETE FROM tasks WHERE parent_id = ? AND user_id = ?').run(id, userId)
  getDb().prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId)
}

// List functions
export function getLists(userId: number) {
  return getDb().prepare('SELECT * FROM lists WHERE user_id = ? ORDER BY position ASC').all(userId)
}

export function createList(userId: number, name: string) {
  const result = getDb().prepare('INSERT INTO lists (user_id, name) VALUES (?, ?)').run(userId, name)
  return { id: result.lastInsertRowid as number, name }
}

export function deleteList(id: number, userId: number) {
  // Move tasks to no list
  getDb().prepare('UPDATE tasks SET list_id = NULL WHERE list_id = ? AND user_id = ?').run(id, userId)
  getDb().prepare('DELETE FROM lists WHERE id = ? AND user_id = ?').run(id, userId)
}

export default { getDb }
