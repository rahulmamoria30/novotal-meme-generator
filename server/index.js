const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const http = require("http")
const { Server } = require("socket.io")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { nanoid } = require("nanoid")

// Load environment variables
dotenv.config()

// Import utilities
const { getAllTemplates, getTemplateById } = require("./utils/templates")
const { generateMemeSuggestions } = require("./utils/ai")
const {
  saveMeme,
  getMeme,
  getAllMemes,
  addReaction,
  removeReaction,
  getReactionCounts,
  getTopMemes,
} = require("./utils/storage")

const app = express()
const server = http.createServer(app)

// Socket.io setup for real-time reactions
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
})

const PORT = process.env.PORT || 5000

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${nanoid()}-${Date.now()}${path.extname(
      file.originalname
    )}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    )
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error("Only image files are allowed"))
  },
})

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use("/uploads", express.static(uploadsDir))

// ============ ROUTES ============

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Novotal Meme Generator API",
    version: "1.0.0",
  })
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// ============ TEMPLATE ROUTES ============

// Get all meme templates
app.get("/api/templates", (req, res) => {
  const templates = getAllTemplates()
  res.json({ templates })
})

// Get single template
app.get("/api/templates/:id", (req, res) => {
  const template = getTemplateById(req.params.id)
  if (!template) {
    return res.status(404).json({ error: "Template not found" })
  }
  res.json({ template })
})

// ============ IMAGE UPLOAD ROUTES ============

// Upload image file
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" })
  }

  const imageUrl = `/uploads/${req.file.filename}`
  res.json({
    success: true,
    imageUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
  })
})

// Upload image as base64
app.post("/api/upload/base64", (req, res) => {
  const { image, mimeType } = req.body

  if (!image) {
    return res.status(400).json({ error: "No image data provided" })
  }

  // Remove data URL prefix if present
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "")
  const extension = mimeType ? mimeType.split("/")[1] : "png"
  const filename = `${nanoid()}-${Date.now()}.${extension}`
  const filepath = path.join(uploadsDir, filename)

  fs.writeFileSync(filepath, base64Data, "base64")

  res.json({
    success: true,
    imageUrl: `/uploads/${filename}`,
    filename,
  })
})

// ============ AI SUGGESTION ROUTES ============

// Generate meme suggestions from uploaded image
app.post("/api/suggest", async (req, res) => {
  try {
    const { imageUrl, imageBase64, mimeType, userPrompt } = req.body

    let base64Data = imageBase64
    let imageMimeType = mimeType || "image/jpeg"

    // If imageUrl provided, read the file
    if (imageUrl && !imageBase64) {
      const filename = imageUrl.replace("/uploads/", "")
      const filepath = path.join(uploadsDir, filename)

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "Image not found" })
      }

      base64Data = fs.readFileSync(filepath, "base64")
      const ext = path.extname(filename).toLowerCase()
      imageMimeType =
        ext === ".png"
          ? "image/png"
          : ext === ".gif"
          ? "image/gif"
          : ext === ".webp"
          ? "image/webp"
          : "image/jpeg"
    }

    if (!base64Data) {
      return res.status(400).json({ error: "No image provided" })
    }

    // Remove data URL prefix if present
    base64Data = base64Data.replace(/^data:image\/\w+;base64,/, "")

    const suggestions = await generateMemeSuggestions(
      base64Data,
      imageMimeType,
      userPrompt
    )

    res.json({
      success: true,
      suggestions,
    })
  } catch (error) {
    console.error("Error generating suggestions:", error)
    res.status(500).json({
      error: "Failed to generate suggestions",
      message: error.message,
    })
  }
})

// ============ MEME CRUD ROUTES ============

// Save a created meme
app.post("/api/memes", (req, res) => {
  try {
    const { imageUrl, imageBase64, templateId, texts, creatorSessionId } =
      req.body

    const memeId = nanoid(10)

    // If base64 image provided, save it
    let finalImageUrl = imageUrl
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
      const filename = `meme-${memeId}.png`
      const filepath = path.join(uploadsDir, filename)
      fs.writeFileSync(filepath, base64Data, "base64")
      finalImageUrl = `/uploads/${filename}`
    }

    const meme = saveMeme({
      id: memeId,
      imageUrl: finalImageUrl,
      templateId,
      texts,
      creatorSessionId,
    })

    res.json({
      success: true,
      meme,
      shareUrl: `/meme/${memeId}`,
    })
  } catch (error) {
    console.error("Error saving meme:", error)
    res.status(500).json({ error: "Failed to save meme" })
  }
})

// Get a single meme
app.get("/api/memes/:id", (req, res) => {
  const meme = getMeme(req.params.id)
  if (!meme) {
    return res.status(404).json({ error: "Meme not found" })
  }
  res.json({ meme })
})

// Get all memes (for global wall)
app.get("/api/memes", (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const memes = getAllMemes(limit)
  res.json({ memes })
})

// Get top memes (leaderboard)
app.get("/api/memes/top/leaderboard", (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  const memes = getTopMemes(limit)
  res.json({ memes })
})

// ============ REACTION ROUTES ============

// Add reaction to a meme
app.post("/api/memes/:id/react", (req, res) => {
  const { reactionType, sessionId } = req.body
  const memeId = req.params.id

  if (!reactionType || !sessionId) {
    return res.status(400).json({ error: "Missing reactionType or sessionId" })
  }

  const reactions = addReaction(memeId, reactionType, sessionId)

  if (!reactions) {
    return res.status(404).json({ error: "Meme not found" })
  }

  // Emit real-time update to all connected clients viewing this meme
  io.to(`meme-${memeId}`).emit("reaction-update", {
    memeId,
    reactions: getReactionCounts(memeId),
    newReaction: { type: reactionType, sessionId },
  })

  res.json({ success: true, reactions: getReactionCounts(memeId) })
})

// Remove reaction from a meme
app.delete("/api/memes/:id/react", (req, res) => {
  const { reactionType, sessionId } = req.body
  const memeId = req.params.id

  const reactions = removeReaction(memeId, reactionType, sessionId)

  if (!reactions) {
    return res.status(404).json({ error: "Meme not found" })
  }

  // Emit real-time update
  io.to(`meme-${memeId}`).emit("reaction-update", {
    memeId,
    reactions: getReactionCounts(memeId),
  })

  res.json({ success: true, reactions: getReactionCounts(memeId) })
})

// Get reactions for a meme
app.get("/api/memes/:id/reactions", (req, res) => {
  const reactions = getReactionCounts(req.params.id)
  res.json({ reactions })
})

// ============ SOCKET.IO ============

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  // Join a meme room to receive real-time reaction updates
  socket.on("join-meme", (memeId) => {
    socket.join(`meme-${memeId}`)
    console.log(`Socket ${socket.id} joined meme-${memeId}`)
  })

  // Leave a meme room
  socket.on("leave-meme", (memeId) => {
    socket.leave(`meme-${memeId}`)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error(err.stack)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message })
  }
  res.status(500).json({ error: "Something went wrong!" })
})

// ============ START SERVER ============

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`)
  console.log(`📁 Uploads directory: ${uploadsDir}`)
})
