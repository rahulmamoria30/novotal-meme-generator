// In-memory storage for memes, reactions, and request logs.
// Data is non-persistent across process restarts — fine for ephemeral
// serverless deployments (Vercel) where the filesystem isn't durable.

const memes = new Map() // id -> meme record
const reactions = new Map() // memeId -> Map(reactionType -> Set(sessionId))
const requestLogEntries = [] // newest entries pushed to the front
const REQUEST_LOG_CAP = 1000

function getReactionsBySessionList(memeId) {
  const out = {}
  const byType = reactions.get(memeId)
  if (!byType) return out
  for (const [type, sessions] of byType.entries()) {
    out[type] = Array.from(sessions)
  }
  return out
}

function toMeme(record) {
  if (!record) return null
  return {
    id: record.id,
    imageUrl: record.imageUrl,
    templateId: record.templateId || null,
    texts: record.texts || {},
    creatorSessionId: record.creatorSessionId || null,
    createdAt: record.createdAt,
    status: record.status || "shared",
    suggestions: record.suggestions || null,
    userPrompt: record.userPrompt || "",
    reactions: getReactionsBySessionList(record.id),
  }
}

// Save a shared meme. If draftId is provided, upgrade the existing draft row
// to status='shared' with the final template + texts.
function saveMeme(meme) {
  const draftId = meme.draftId || null
  const existing = draftId ? memes.get(draftId) : null

  if (existing) {
    existing.imageUrl = meme.imageUrl
    existing.templateId = meme.templateId || null
    existing.texts = meme.texts || {}
    existing.status = "shared"
    return toMeme(existing)
  }

  const record = {
    id: meme.id,
    imageUrl: meme.imageUrl,
    templateId: meme.templateId || null,
    texts: meme.texts || {},
    creatorSessionId: meme.creatorSessionId || null,
    createdAt: new Date().toISOString(),
    status: "shared",
    suggestions: null,
    userPrompt: "",
  }
  memes.set(record.id, record)
  return toMeme(record)
}

// Save a draft (image uploaded + AI suggestions returned, not yet shared)
function saveDraft({ id, imageUrl, suggestions, creatorSessionId, userPrompt }) {
  const record = {
    id,
    imageUrl,
    templateId: null,
    texts: {},
    creatorSessionId: creatorSessionId || null,
    createdAt: new Date().toISOString(),
    status: "draft",
    suggestions: suggestions || [],
    userPrompt: userPrompt || "",
  }
  memes.set(id, record)
  return toMeme(record)
}

function getMeme(id) {
  return toMeme(memes.get(id))
}

// Sorted by createdAt DESC
function sortedMemes() {
  return Array.from(memes.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

function getAllMemes(limit = 50) {
  return sortedMemes()
    .filter((m) => m.status === "shared")
    .slice(0, limit)
    .map(toMeme)
}

function getMemesBySession(sessionId, limit = 100) {
  if (!sessionId) return []
  return sortedMemes()
    .filter((m) => m.creatorSessionId === sessionId)
    .slice(0, limit)
    .map(toMeme)
}

function addReaction(memeId, reactionType, sessionId) {
  if (!memes.has(memeId)) return null

  let byType = reactions.get(memeId)
  if (!byType) {
    byType = new Map()
    reactions.set(memeId, byType)
  }
  let sessions = byType.get(reactionType)
  if (!sessions) {
    sessions = new Set()
    byType.set(reactionType, sessions)
  }
  sessions.add(sessionId)

  return getReactionsBySessionList(memeId)
}

function removeReaction(memeId, reactionType, sessionId) {
  if (!memes.has(memeId)) return null

  const byType = reactions.get(memeId)
  if (byType) {
    const sessions = byType.get(reactionType)
    if (sessions) {
      sessions.delete(sessionId)
      if (sessions.size === 0) byType.delete(reactionType)
    }
    if (byType.size === 0) reactions.delete(memeId)
  }

  return getReactionsBySessionList(memeId)
}

function getReactionCounts(memeId) {
  const out = {}
  const byType = reactions.get(memeId)
  if (!byType) return out
  for (const [type, sessions] of byType.entries()) {
    out[type] = sessions.size
  }
  return out
}

function getTopMemes(limit = 10) {
  return sortedMemes()
    .filter((m) => m.status === "shared")
    .map((m) => {
      const counts = getReactionCounts(m.id)
      const total = Object.values(counts).reduce((s, n) => s + n, 0)
      return { record: m, total }
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      return b.record.createdAt.localeCompare(a.record.createdAt)
    })
    .slice(0, limit)
    .map(({ record, total }) => ({
      ...toMeme(record),
      totalReactions: total,
    }))
}

// ===== REQUEST LOG =====

function logRequest(entry) {
  try {
    requestLogEntries.unshift({
      id: requestLogEntries.length + 1,
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
    if (requestLogEntries.length > REQUEST_LOG_CAP) {
      requestLogEntries.length = REQUEST_LOG_CAP
    }
  } catch (err) {
    console.error("[storage] failed to log request:", err.message)
  }
}

function getRequestLog({ sessionId, limit = 100 } = {}) {
  const filtered = sessionId
    ? requestLogEntries.filter((e) => e.session_id === sessionId)
    : requestLogEntries
  return filtered.slice(0, limit)
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
