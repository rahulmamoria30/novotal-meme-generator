import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import useMemeStore from "../store/memeStore"
import { joinMemeRoom, onReactionUpdate } from "../utils/socket"
import { getReactions } from "../utils/api"
import "./ShareSuccess.css"

const REACTIONS = [
  { type: "laugh", emoji: "😂" },
  { type: "fire", emoji: "🔥" },
  { type: "love", emoji: "❤️" },
  { type: "skull", emoji: "💀" },
  { type: "crying", emoji: "😭" },
  { type: "clap", emoji: "👏" },
]

const ShareSuccess = () => {
  const navigate = useNavigate()
  const { savedMeme, shareUrl, resetToUpload } = useMemeStore()
  const [copied, setCopied] = useState(false)
  const [reactions, setReactions] = useState({})
  const [newReaction, setNewReaction] = useState(null)

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

  const handleCreateAnother = () => {
    resetToUpload()
    navigate("/")
  }
  const fullShareUrl = `${window.location.origin}/meme/${savedMeme?.id}`
  const imageUrl = savedMeme?.imageUrl?.startsWith("http")
    ? savedMeme.imageUrl
    : `${API_BASE}${savedMeme?.imageUrl}`

  useEffect(() => {
    if (!savedMeme?.id) return

    // Load initial reactions
    getReactions(savedMeme.id).then(setReactions).catch(console.error)

    // Join room for live updates
    joinMemeRoom(savedMeme.id)

    const unsubscribe = onReactionUpdate((data) => {
      if (data.memeId === savedMeme.id) {
        setReactions(data.reactions)
        if (data.newReaction) {
          setNewReaction(data.newReaction)
          setTimeout(() => setNewReaction(null), 1000)
        }
      }
    })

    return () => unsubscribe()
  }, [savedMeme?.id])

  const copyLink = () => {
    navigator.clipboard.writeText(fullShareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToSocial = (platform) => {
    const url = encodeURIComponent(fullShareUrl)
    const text = encodeURIComponent("Check out this meme I made! 😂")

    const links = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    }

    window.open(links[platform], "_blank", "width=600,height=400")
  }

  const totalReactions = Object.values(reactions).reduce(
    (sum, count) => sum + count,
    0
  )

  if (!savedMeme) {
    return (
      <div className="share-success">
        <p>No meme to share. Create one first!</p>
        <button onClick={handleCreateAnother} className="btn btn-primary">
          Create Meme
        </button>
      </div>
    )
  }

  return (
    <div className="share-success">
      {/* Floating reaction animation */}
      {newReaction && (
        <div className="floating-reaction">
          {REACTIONS.find((r) => r.type === newReaction.type)?.emoji}
        </div>
      )}

      <div className="success-header">
        <div className="success-icon">🎉</div>
        <span className="success-kicker">it's giving... main character</span>
        <h2>you ate that fr</h2>
        <p>now post it everywhere and watch the reactions stack up</p>
      </div>

      <div className="meme-preview-card">
        <img src={imageUrl} alt="Your meme" className="preview-image" />
      </div>

      <div className="live-reactions">
        <h3>live reactions ↓</h3>
        <div className="reaction-display">
          {REACTIONS.map(({ type, emoji }) => (
            <div key={type} className="reaction-item">
              <span className="emoji">{emoji}</span>
              <span className="count">{reactions[type] || 0}</span>
            </div>
          ))}
        </div>
        <p className="total-count">{totalReactions} total · keep cookin</p>
      </div>

      <div className="share-actions">
        <div className="share-link-box">
          <input
            type="text"
            value={fullShareUrl}
            readOnly
            className="share-link-input"
          />
          <button onClick={copyLink} className="btn btn-copy">
            {copied ? "✓ yoinked" : "📋 copy link"}
          </button>
        </div>

        <div className="social-buttons">
          <button
            onClick={() => shareToSocial("twitter")}
            className="btn btn-twitter"
          >
            𝕏 ratio someone
          </button>
          <button
            onClick={() => shareToSocial("whatsapp")}
            className="btn btn-whatsapp"
          >
            💬 group chat
          </button>
          <button
            onClick={() => shareToSocial("facebook")}
            className="btn btn-facebook"
          >
            f boomer mode
          </button>
        </div>
      </div>

      <div className="action-buttons">
        <button
          onClick={() => navigate(`/meme/${savedMeme.id}`)}
          className="btn btn-view"
        >
          👁️ peek the public page
        </button>
        <button onClick={handleCreateAnother} className="btn btn-new">
          ✨ cook another
        </button>
      </div>
    </div>
  )
}

export default ShareSuccess
