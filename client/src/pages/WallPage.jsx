import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getAllMemes } from "../utils/api"
import "./WallPage.css"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const totalReactions = (reactions) => {
  if (!reactions) return 0
  return Object.values(reactions).reduce(
    (sum, sessions) => sum + (Array.isArray(sessions) ? sessions.length : 0),
    0
  )
}

const formatDate = (iso) => {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const WallPage = () => {
  const [memes, setMemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAllMemes(50)
      .then((data) => {
        if (!cancelled) setMemes(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load memes")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="wall-state">
        <div className="wall-spinner" />
        <p>scrolling the timeline...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="wall-state">
        <p className="wall-error">{error}</p>
        <Link to="/" className="wall-link-btn">
          back home
        </Link>
      </div>
    )
  }

  if (!memes.length) {
    return (
      <div className="wall-state">
        <h2>nothing here yet 🦗</h2>
        <p>be the first to ratio the timeline</p>
        <Link to="/" className="wall-link-btn">
          cook the first one
        </Link>
      </div>
    )
  }

  return (
    <div className="wall-container">
      <div className="wall-header">
        <span className="wall-kicker">the timeline</span>
        <h2>the meme wall 🧱</h2>
        <p>{memes.length} cooked up by the community · keep scrolling</p>
      </div>

      <div className="wall-grid">
        {memes.map((meme) => (
          <Link
            key={meme.id}
            to={`/meme/${meme.id}`}
            className="wall-card"
          >
            <div className="wall-image-wrap">
              <img
                src={`${API_BASE_URL}${meme.imageUrl}`}
                alt={meme.texts?.topText || "Meme"}
                loading="lazy"
              />
            </div>
            <div className="wall-meta">
              <span className="wall-reactions">
                ❤️ {totalReactions(meme.reactions)}
              </span>
              <span className="wall-date">{formatDate(meme.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default WallPage
