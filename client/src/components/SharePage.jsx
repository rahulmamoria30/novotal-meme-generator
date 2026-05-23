import React, { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getMeme, addReaction, getReactions } from "../utils/api"
import { joinMemeRoom, leaveMemeRoom, onReactionUpdate } from "../utils/socket"
import useMemeStore from "../store/memeStore"
import "./SharePage.css"

const REACTIONS = [
  { type: "laugh", emoji: "😂", label: "Hilarious" },
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "skull", emoji: "💀", label: "Dead" },
  { type: "crying", emoji: "😭", label: "Crying" },
  { type: "clap", emoji: "👏", label: "Clapping" },
]

const SharePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sessionId } = useMemeStore()

  const [meme, setMeme] = useState(null)
  const [reactions, setReactions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [myReactions, setMyReactions] = useState(new Set())
  const [showCopied, setShowCopied] = useState(false)
  const [newReaction, setNewReaction] = useState(null)

  // Load meme and reactions
  useEffect(() => {
    const loadMeme = async () => {
      try {
        const memeData = await getMeme(id)
        setMeme(memeData)

        const reactionData = await getReactions(id)
        setReactions(reactionData)

        // Check which reactions this session has made
        // (In a real app, this would come from the backend)
        setLoading(false)
      } catch (err) {
        console.error("Error loading meme:", err)
        setError("Meme not found")
        setLoading(false)
      }
    }

    loadMeme()
  }, [id])

  // Socket connection for real-time updates
  useEffect(() => {
    if (!id) return

    joinMemeRoom(id)

    const unsubscribe = onReactionUpdate((data) => {
      if (data.memeId === id) {
        setReactions(data.reactions)

        // Show animation for new reaction
        if (data.newReaction) {
          setNewReaction(data.newReaction)
          setTimeout(() => setNewReaction(null), 1000)
        }
      }
    })

    return () => {
      leaveMemeRoom(id)
      unsubscribe()
    }
  }, [id])

  const handleReaction = async (reactionType) => {
    try {
      const isRemoving = myReactions.has(reactionType)

      if (isRemoving) {
        // Remove reaction (would need to implement on backend)
        setMyReactions((prev) => {
          const next = new Set(prev)
          next.delete(reactionType)
          return next
        })
      } else {
        await addReaction(id, reactionType, sessionId)
        setMyReactions((prev) => new Set(prev).add(reactionType))
      }
    } catch (err) {
      console.error("Error adding reaction:", err)
    }
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  const shareToSocial = (platform) => {
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent("Check out this meme I made! 😂")

    const links = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      reddit: `https://reddit.com/submit?url=${url}&title=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    }

    window.open(links[platform], "_blank", "width=600,height=400")
  }

  if (loading) {
    return (
      <div className="share-page loading">
        <div className="spinner"></div>
        <p>Loading meme...</p>
      </div>
    )
  }

  if (error || !meme) {
    return (
      <div className="share-page error">
        <h2>Not found</h2>
        <p>{error || "This meme is no longer available."}</p>
        <button onClick={() => navigate("/")} className="btn btn-primary">
          Create a new meme
        </button>
      </div>
    )
  }

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"
  const imageUrl = meme.imageUrl?.startsWith("http")
    ? meme.imageUrl
    : `${API_BASE}${meme.imageUrl}`

  const totalReactions = Object.values(reactions).reduce(
    (sum, count) => sum + count,
    0
  )

  return (
    <div className="share-page">
      {/* Floating reaction animation */}
      {newReaction && (
        <div className="floating-reaction">
          {REACTIONS.find((r) => r.type === newReaction.type)?.emoji}
        </div>
      )}

      <div className="share-content">
        <div className="meme-display">
          <img src={imageUrl} alt="Shared meme" className="meme-image" />
        </div>

        <div className="reactions-section">
          <h3>React</h3>
          <div className="reaction-buttons">
            {REACTIONS.map(({ type, emoji, label }) => (
              <button
                key={type}
                className={`reaction-btn ${
                  myReactions.has(type) ? "active" : ""
                }`}
                onClick={() => handleReaction(type)}
                title={label}
              >
                <span className="reaction-emoji">{emoji}</span>
                <span className="reaction-count">{reactions[type] || 0}</span>
              </button>
            ))}
          </div>

          <div className="reaction-total">
            {totalReactions} reaction{totalReactions !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="share-section">
          <h3>Share</h3>
          <div className="share-buttons">
            <button onClick={copyShareLink} className="share-btn copy">
              {showCopied ? "✓ Copied" : "🔗 Copy link"}
            </button>
            <button
              onClick={() => shareToSocial("twitter")}
              className="share-btn twitter"
            >
              𝕏 Share on X
            </button>
            <button
              onClick={() => shareToSocial("facebook")}
              className="share-btn facebook"
            >
              f Facebook
            </button>
            <button
              onClick={() => shareToSocial("whatsapp")}
              className="share-btn whatsapp"
            >
              💬 WhatsApp
            </button>
          </div>
        </div>

        <button onClick={() => navigate("/")} className="btn btn-create">
          ✨ Create your own
        </button>
      </div>
    </div>
  )
}

export default SharePage
