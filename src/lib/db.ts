import { Pool, QueryResult } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      list_id INTEGER REFERENCES lists(id),
      title TEXT NOT NULL,
      notes TEXT,
      due_date TEXT,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      starred BOOLEAN DEFAULT FALSE,
      position INTEGER DEFAULT 0,
      parent_id INTEGER REFERENCES tasks(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `)
}

let initialized = false
async function ensureInit() {
  if (!initialized) {
    await initDb()
    initialized = true
  }
}

// Helper functions
export async function getUser(email: string) {
  await ensureInit()
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  return res.rows[0] as { id: number; email: string } | undefined
}

export async function createUser(email: string) {
  await ensureInit()
  const res = await pool.query('INSERT INTO users (email) VALUES ($1) RETURNING id, email', [email])
  return res.rows[0] as { id: number; email: string }
}

export async function getOrCreateUser(email: string) {
  const user = await getUser(email)
  if (user) return user
  return createUser(email)
}

export async function createMagicLink(id: string, email: string, expiresAt: Date) {
  await ensureInit()
  await pool.query('INSERT INTO magic_links (id, email, expires_at) VALUES ($1, $2, $3)', [id, email, expiresAt.toISOString()])
}

export async function getMagicLink(id: string) {
  await ensureInit()
  const res = await pool.query("SELECT * FROM magic_links WHERE id = $1 AND used = FALSE AND expires_at > NOW()", [id])
  return res.rows[0] as { id: string; email: string } | undefined
}

export async function useMagicLink(id: string) {
  await ensureInit()
  await pool.query('UPDATE magic_links SET used = TRUE WHERE id = $1', [id])
}

export async function createSession(id: string, userId: number, expiresAt: Date) {
  await ensureInit()
  await pool.query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)', [id, userId, expiresAt.toISOString()])
}

export async function getSession(id: string) {
  await ensureInit()
  const res = await pool.query(`
    SELECT s.*, u.email
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = $1 AND s.expires_at > NOW()
  `, [id])
  return res.rows[0] as { id: string; user_id: number; email: string } | undefined
}

export async function deleteSession(id: string) {
  await ensureInit()
  await pool.query('DELETE FROM sessions WHERE id = $1', [id])
}

// Task functions
export async function getTasks(userId: number, listId?: number) {
  await ensureInit()
  if (listId) {
    const res = await pool.query(`
      SELECT * FROM tasks
      WHERE user_id = $1 AND list_id = $2 AND parent_id IS NULL
      ORDER BY completed ASC, position ASC, created_at DESC
    `, [userId, listId])
    return res.rows
  }
  const res = await pool.query(`
    SELECT * FROM tasks
    WHERE user_id = $1 AND parent_id IS NULL
    ORDER BY completed ASC, position ASC, created_at DESC
  `, [userId])
  return res.rows
}

export async function getTask(id: number, userId: number) {
  await ensureInit()
  const res = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, userId])
  return res.rows[0]
}

export async function createTask(userId: number, data: { title: string; notes?: string; due_date?: string; list_id?: number; parent_id?: number }) {
  await ensureInit()
  const res = await pool.query(`
    INSERT INTO tasks (user_id, title, notes, due_date, list_id, parent_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [userId, data.title, data.notes || null, data.due_date || null, data.list_id || null, data.parent_id || null])
  return res.rows[0]
}

export async function updateTask(id: number, userId: number, data: Partial<{ title: string; notes: string; due_date: string; completed: boolean; position: number; list_id: number; starred: boolean }>) {
  await ensureInit()
  const fields: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title) }
  if (data.notes !== undefined) { fields.push(`notes = $${paramIndex++}`); values.push(data.notes) }
  if (data.due_date !== undefined) { fields.push(`due_date = $${paramIndex++}`); values.push(data.due_date) }
  if (data.completed !== undefined) {
    fields.push(`completed = $${paramIndex++}`)
    values.push(data.completed)
    fields.push(`completed_at = $${paramIndex++}`)
    values.push(data.completed ? new Date().toISOString() : null)
  }
  if (data.position !== undefined) { fields.push(`position = $${paramIndex++}`); values.push(data.position) }
  if (data.list_id !== undefined) { fields.push(`list_id = $${paramIndex++}`); values.push(data.list_id) }
  if (data.starred !== undefined) { fields.push(`starred = $${paramIndex++}`); values.push(data.starred) }

  fields.push(`updated_at = $${paramIndex++}`)
  values.push(new Date().toISOString())
  values.push(id, userId)

  await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`, values)
}

export async function deleteTask(id: number, userId: number) {
  await ensureInit()
  await pool.query('DELETE FROM tasks WHERE parent_id = $1 AND user_id = $2', [id, userId])
  await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId])
}

// List functions
export async function getLists(userId: number) {
  await ensureInit()
  const res = await pool.query('SELECT * FROM lists WHERE user_id = $1 ORDER BY position ASC', [userId])
  return res.rows
}

export async function createList(userId: number, name: string) {
  await ensureInit()
  const res = await pool.query('INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING *', [userId, name])
  return res.rows[0]
}

export async function deleteList(id: number, userId: number) {
  await ensureInit()
  await pool.query('UPDATE tasks SET list_id = NULL WHERE list_id = $1 AND user_id = $2', [id, userId])
  await pool.query('DELETE FROM lists WHERE id = $1 AND user_id = $2', [id, userId])
}

export default { pool }
