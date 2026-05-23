const fs = require("fs")
const path = require("path")

const DATA_FILE = path.join(__dirname, "../data/memes.json")

// Ensure data file exists
function initDataFile() {
  const dataDir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ memes: {}, reactions: {} }, null, 2)
    )
  }
}

// Read all data
function readData() {
  initDataFile()
  const data = fs.readFileSync(DATA_FILE, "utf8")
  return JSON.parse(data)
}

// Write data
function writeData(data) {
  initDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// Save a meme
function saveMeme(meme) {
  const data = readData()
  data.memes[meme.id] = {
    ...meme,
    createdAt: new Date().toISOString(),
    reactions: {},
  }
  writeData(data)
  return data.memes[meme.id]
}

// Get a meme by ID
function getMeme(id) {
  const data = readData()
  return data.memes[id] || null
}

// Get all memes (for global wall)
function getAllMemes(limit = 50) {
  const data = readData()
  const memes = Object.values(data.memes)
  return memes
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

// Add reaction to a meme
function addReaction(memeId, reactionType, sessionId) {
  const data = readData()
  if (!data.memes[memeId]) {
    return null
  }

  if (!data.memes[memeId].reactions) {
    data.memes[memeId].reactions = {}
  }

  if (!data.memes[memeId].reactions[reactionType]) {
    data.memes[memeId].reactions[reactionType] = []
  }

  // Check if this session already reacted with this type
  if (!data.memes[memeId].reactions[reactionType].includes(sessionId)) {
    data.memes[memeId].reactions[reactionType].push(sessionId)
  }

  writeData(data)
  return data.memes[memeId].reactions
}

// Remove reaction from a meme
function removeReaction(memeId, reactionType, sessionId) {
  const data = readData()
  if (!data.memes[memeId] || !data.memes[memeId].reactions) {
    return null
  }

  if (data.memes[memeId].reactions[reactionType]) {
    data.memes[memeId].reactions[reactionType] = data.memes[memeId].reactions[
      reactionType
    ].filter((id) => id !== sessionId)
  }

  writeData(data)
  return data.memes[memeId].reactions
}

// Get reaction counts for a meme
function getReactionCounts(memeId) {
  const data = readData()
  const meme = data.memes[memeId]
  if (!meme || !meme.reactions) {
    return {}
  }

  const counts = {}
  for (const [type, sessions] of Object.entries(meme.reactions)) {
    counts[type] = sessions.length
  }
  return counts
}

// Get top memes by reactions (for leaderboard)
function getTopMemes(limit = 10) {
  const data = readData()
  const memes = Object.values(data.memes).map((meme) => {
    const totalReactions = Object.values(meme.reactions || {}).reduce(
      (sum, arr) => sum + arr.length,
      0
    )
    return { ...meme, totalReactions }
  })

  return memes
    .sort((a, b) => b.totalReactions - a.totalReactions)
    .slice(0, limit)
}

module.exports = {
  saveMeme,
  getMeme,
  getAllMemes,
  addReaction,
  removeReaction,
  getReactionCounts,
  getTopMemes,
}
