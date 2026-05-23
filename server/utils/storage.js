const fs = require("fs")
const path = require("path")
const Database = require("better-sqlite3")

const DATA_DIR = path.join(__dirname, "../data")
const DB_FILE = path.join(DATA_DIR, "memes.db")
const LEGACY_JSON = path.join(DATA_DIR, "memes.json")

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(DB_FILE)
db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

db.exec(`
  CREATE TABLE IF NOT EXISTS memes (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    template_id TEXT,
    texts TEXT,
    creator_session_id TEXT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'shared',
    suggestions TEXT,
    user_prompt TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_memes_created_at ON memes(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_memes_creator ON memes(creator_session_id);

  CREATE TABLE IF NOT EXISTS reactions (
    meme_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (meme_id, reaction_type, session_id),
    FOREIGN KEY (meme_id) REFERENCES memes(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_reactions_meme ON reactions(meme_id);

  CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER,
    duration_ms INTEGER,
    session_id TEXT,
    ip TEXT,
    user_agent TEXT,
    bytes_in INTEGER,
    bytes_out INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_log_created_at ON request_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_log_session ON request_log(session_id);
  CREATE INDEX IF NOT EXISTS idx_log_path ON request_log(path);
`)

// Column-level migrations for older databases (CREATE TABLE IF NOT EXISTS
// won't add new columns to an existing table)
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.find((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}
ensureColumn("memes", "status", "TEXT NOT NULL DEFAULT 'shared'")
ensureColumn("memes", "suggestions", "TEXT")
ensureColumn("memes", "user_prompt", "TEXT")

// Indexes that depend on migrated columns
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_memes_status ON memes(status)"
)

// One-time migration: import legacy JSON if SQLite is empty and JSON exists
;(function migrateFromJson() {
  const memeCount = db.prepare("SELECT COUNT(*) AS c FROM memes").get().c
  if (memeCount > 0 || !fs.existsSync(LEGACY_JSON)) return

  try {
    const raw = fs.readFileSync(LEGACY_JSON, "utf8")
    const legacy = JSON.parse(raw)
    const memes = legacy.memes || {}

    const insertMeme = db.prepare(`
      INSERT INTO memes (id, image_url, template_id, texts, creator_session_id, created_at)
      VALUES (@id, @image_url, @template_id, @texts, @creator_session_id, @created_at)
    `)
    const insertReaction = db.prepare(`
      INSERT OR IGNORE INTO reactions (meme_id, reaction_type, session_id, created_at)
      VALUES (?, ?, ?, ?)
    `)

    const migrate = db.transaction(() => {
      for (const meme of Object.values(memes)) {
        insertMeme.run({
          id: meme.id,
          image_url: meme.imageUrl || "",
          template_id: meme.templateId || null,
          texts: JSON.stringify(meme.texts || {}),
          creator_session_id: meme.creatorSessionId || null,
          created_at: meme.createdAt || new Date().toISOString(),
        })

        const reactions = meme.reactions || {}
        const createdAt = meme.createdAt || new Date().toISOString()
        for (const [type, sessions] of Object.entries(reactions)) {
          if (!Array.isArray(sessions)) continue
          for (const sid of sessions) {
            insertReaction.run(meme.id, type, sid, createdAt)
          }
        }
      }
    })

    migrate()
    fs.renameSync(LEGACY_JSON, `${LEGACY_JSON}.migrated`)
    console.log(
      `[storage] Migrated ${Object.keys(memes).length} memes from memes.json to SQLite`
    )
  } catch (err) {
    console.error("[storage] Migration failed:", err.message)
  }
})()

// Row mappers
function rowToMeme(row) {
  if (!row) return null
  return {
    id: row.id,
    imageUrl: row.image_url,
    templateId: row.template_id,
    texts: row.texts ? JSON.parse(row.texts) : {},
    creatorSessionId: row.creator_session_id,
    createdAt: row.created_at,
    status: row.status || "shared",
    suggestions: row.suggestions ? JSON.parse(row.suggestions) : null,
    userPrompt: row.user_prompt || "",
    reactions: getReactionsBySessionList(row.id),
  }
}

function getReactionsBySessionList(memeId) {
  const rows = db
    .prepare(
      "SELECT reaction_type, session_id FROM reactions WHERE meme_id = ?"
    )
    .all(memeId)
  const out = {}
  for (const r of rows) {
    if (!out[r.reaction_type]) out[r.reaction_type] = []
    out[r.reaction_type].push(r.session_id)
  }
  return out
}

// Save a shared meme. If draftId is provided, upgrade the existing draft row
// to status='shared' with the final template + texts. Otherwise insert new.
function saveMeme(meme) {
  const draftId = meme.draftId || null
  const existing = draftId
    ? db.prepare("SELECT id FROM memes WHERE id = ?").get(draftId)
    : null

  if (existing) {
    db.prepare(
      `UPDATE memes
       SET image_url = @image_url,
           template_id = @template_id,
           texts = @texts,
           status = 'shared'
       WHERE id = @id`
    ).run({
      id: draftId,
      image_url: meme.imageUrl,
      template_id: meme.templateId || null,
      texts: JSON.stringify(meme.texts || {}),
    })
    return getMeme(draftId)
  }

  db.prepare(
    `INSERT INTO memes (id, image_url, template_id, texts, creator_session_id, created_at, status)
     VALUES (@id, @image_url, @template_id, @texts, @creator_session_id, @created_at, 'shared')`
  ).run({
    id: meme.id,
    image_url: meme.imageUrl,
    template_id: meme.templateId || null,
    texts: JSON.stringify(meme.texts || {}),
    creator_session_id: meme.creatorSessionId || null,
    created_at: new Date().toISOString(),
  })
  return getMeme(meme.id)
}

// Save a draft (image uploaded + AI suggestions returned, not yet shared)
function saveDraft({ id, imageUrl, suggestions, creatorSessionId, userPrompt }) {
  db.prepare(
    `INSERT INTO memes (id, image_url, texts, creator_session_id, created_at, status, suggestions, user_prompt)
     VALUES (@id, @image_url, '{}', @creator_session_id, @created_at, 'draft', @suggestions, @user_prompt)`
  ).run({
    id,
    image_url: imageUrl,
    creator_session_id: creatorSessionId || null,
    created_at: new Date().toISOString(),
    suggestions: JSON.stringify(suggestions || []),
    user_prompt: userPrompt || "",
  })
  return getMeme(id)
}

// Get a meme by ID
function getMeme(id) {
  const row = db.prepare("SELECT * FROM memes WHERE id = ?").get(id)
  return rowToMeme(row)
}

// Get all memes for the global wall — public, so drafts are excluded.
function getAllMemes(limit = 50) {
  const rows = db
    .prepare(
      `SELECT * FROM memes
       WHERE status = 'shared'
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit)
  return rows.map(rowToMeme)
}

// Get memes created by a given session (history)
function getMemesBySession(sessionId, limit = 100) {
  if (!sessionId) return []
  const rows = db
    .prepare(
      `SELECT * FROM memes
       WHERE creator_session_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(sessionId, limit)
  return rows.map(rowToMeme)
}

// Add reaction
function addReaction(memeId, reactionType, sessionId) {
  const exists = db.prepare("SELECT 1 FROM memes WHERE id = ?").get(memeId)
  if (!exists) return null

  db.prepare(
    `INSERT OR IGNORE INTO reactions (meme_id, reaction_type, session_id, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(memeId, reactionType, sessionId, new Date().toISOString())

  return getReactionsBySessionList(memeId)
}

// Remove reaction
function removeReaction(memeId, reactionType, sessionId) {
  const exists = db.prepare("SELECT 1 FROM memes WHERE id = ?").get(memeId)
  if (!exists) return null

  db.prepare(
    `DELETE FROM reactions
     WHERE meme_id = ? AND reaction_type = ? AND session_id = ?`
  ).run(memeId, reactionType, sessionId)

  return getReactionsBySessionList(memeId)
}

// Counts (used by socket emit + GET reactions)
function getReactionCounts(memeId) {
  const rows = db
    .prepare(
      `SELECT reaction_type, COUNT(*) AS c
       FROM reactions WHERE meme_id = ?
       GROUP BY reaction_type`
    )
    .all(memeId)
  const out = {}
  for (const r of rows) out[r.reaction_type] = r.c
  return out
}

// Top memes by total reactions — only shared.
function getTopMemes(limit = 10) {
  const rows = db
    .prepare(
      `SELECT m.*, COALESCE(r.total, 0) AS total_reactions
       FROM memes m
       LEFT JOIN (
         SELECT meme_id, COUNT(*) AS total
         FROM reactions
         GROUP BY meme_id
       ) r ON r.meme_id = m.id
       WHERE m.status = 'shared'
       ORDER BY total_reactions DESC, m.created_at DESC
       LIMIT ?`
    )
    .all(limit)
  return rows.map((row) => ({
    ...rowToMeme(row),
    totalReactions: row.total_reactions,
  }))
}

// ===== REQUEST LOG =====

const insertRequestLog = db.prepare(`
  INSERT INTO request_log (
    method, path, status, duration_ms, session_id, ip, user_agent,
    bytes_in, bytes_out, created_at
  ) VALUES (
    @method, @path, @status, @duration_ms, @session_id, @ip, @user_agent,
    @bytes_in, @bytes_out, @created_at
  )
`)

function logRequest(entry) {
  try {
    insertRequestLog.run({
      method: entry.method || "",
      path: entry.path || "",
      status: entry.status ?? null,
      duration_ms: entry.durationMs ?? null,
      session_id: entry.sessionId || null,
      ip: entry.ip || null,
      user_agent: entry.userAgent || null,
      bytes_in: entry.bytesIn ?? null,
      bytes_out: entry.bytesOut ?? null,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[storage] failed to log request:", err.message)
  }
}

function getRequestLog({ sessionId, limit = 100 } = {}) {
  if (sessionId) {
    return db
      .prepare(
        `SELECT * FROM request_log
         WHERE session_id = ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(sessionId, limit)
  }
  return db
    .prepare("SELECT * FROM request_log ORDER BY id DESC LIMIT ?")
    .all(limit)
}

module.exports = {
  saveMeme,
  saveDraft,
  getMeme,
  getAllMemes,
  getMemesBySession,
  addReaction,
  removeReaction,
  getReactionCounts,
  getTopMemes,
  logRequest,
  getRequestLog,
}
