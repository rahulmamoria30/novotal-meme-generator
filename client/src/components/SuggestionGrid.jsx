import React from "react"
import { useNavigate } from "react-router-dom"
import useMemeStore from "../store/memeStore"
import MemePreview from "./MemePreview"
import "./SuggestionGrid.css"

const SuggestionGrid = () => {
  const navigate = useNavigate()
  const {
    suggestions,
    isLoadingSuggestions,
    uploadedImage,
    selectSuggestion,
    resetToUpload,
  } = useMemeStore()

  const handlePick = (suggestion) => {
    selectSuggestion(suggestion)
    navigate("/edit")
  }

  const handleBack = () => {
    resetToUpload()
    navigate("/")
  }

  if (isLoadingSuggestions) {
    return (
      <div className="suggestion-loading">
        <div className="ai-loader">
          <div className="ai-brain">🧠</div>
          <div className="ai-sparkles">✨</div>
        </div>
        <h2>cooking it up...</h2>
        <p>ai is in the kitchen, plating 6 hot takes</p>
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="no-suggestions">
        <p>kitchen's closed bestie 🫥 try another pic?</p>
        <button onClick={handleBack} className="btn btn-retry">
          start over
        </button>
      </div>
    )
  }

  return (
    <div className="suggestion-container">
      <div className="suggestion-header">
        <span className="suggestion-kicker">pick your fighter</span>
        <h2>the menu 🍽️</h2>
        <p>ai served 6 takes. pick the one that ate the most.</p>
        <button onClick={handleBack} className="btn btn-back">
          ← yuck, new pic
        </button>
      </div>

      <div className="suggestion-grid">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="suggestion-card"
            onClick={() => handlePick(suggestion)}
          >
            <div className="preview-wrapper">
              <MemePreview
                imageUrl={uploadedImage}
                template={suggestion.template}
                topText={suggestion.topText}
                bottomText={suggestion.bottomText}
                size="preview"
              />
            </div>
            <div className="suggestion-info">
              <span className="template-name">{suggestion.template?.name}</span>
              <span className="humor-badge">{suggestion.humor_type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SuggestionGrid
