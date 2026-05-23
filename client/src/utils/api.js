import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout for AI calls
})

// Templates
export const getTemplates = async () => {
  const response = await api.get("/api/templates")
  return response.data.templates
}

// Upload image
export const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append("image", file)
  const response = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return response.data
}

// Upload base64 image
export const uploadBase64Image = async (base64, mimeType) => {
  const response = await api.post("/api/upload/base64", {
    image: base64,
    mimeType,
  })
  return response.data
}

// Get AI suggestions. Returns { suggestions, draftId } so the client can
// link the eventual shared meme to its draft row in history.
export const getSuggestions = async (
  imageUrl,
  imageBase64,
  mimeType,
  userPrompt = "",
  creatorSessionId = ""
) => {
  const response = await api.post("/api/suggest", {
    imageUrl,
    imageBase64,
    mimeType,
    userPrompt,
    creatorSessionId,
  })
  return {
    suggestions: response.data.suggestions,
    draftId: response.data.draftId || null,
  }
}

// Save meme
export const saveMeme = async (memeData) => {
  const response = await api.post("/api/memes", memeData)
  return response.data
}

// Get meme by ID
export const getMeme = async (id) => {
  const response = await api.get(`/api/memes/${id}`)
  return response.data.meme
}

// Get all memes
export const getAllMemes = async (limit = 50) => {
  const response = await api.get(`/api/memes?limit=${limit}`)
  return response.data.memes
}

// Get memes created by a session (history)
export const getMemesBySession = async (sessionId, limit = 50) => {
  const response = await api.get(
    `/api/memes/by-session/${sessionId}?limit=${limit}`
  )
  return response.data.memes
}

// Get top memes
export const getTopMemes = async (limit = 10) => {
  const response = await api.get(`/api/memes/top/leaderboard?limit=${limit}`)
  return response.data.memes
}

// Add reaction
export const addReaction = async (memeId, reactionType, sessionId) => {
  const response = await api.post(`/api/memes/${memeId}/react`, {
    reactionType,
    sessionId,
  })
  return response.data
}

// Remove reaction
export const removeReaction = async (memeId, reactionType, sessionId) => {
  const response = await api.delete(`/api/memes/${memeId}/react`, {
    data: { reactionType, sessionId },
  })
  return response.data
}

// Get reactions
export const getReactions = async (memeId) => {
  const response = await api.get(`/api/memes/${memeId}/reactions`)
  return response.data.reactions
}

export default api
