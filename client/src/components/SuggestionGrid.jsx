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
        <h2>Generating suggestions...</h2>
        <p>The AI is creating 6 caption options for your image.</p>
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="no-suggestions">
        <p>No suggestions available. Try another image.</p>
        <button onClick={handleBack} className="btn btn-retry">
          Start over
        </button>
      </div>
    )
  }

  return (
    <div className="suggestion-container">
      <div className="suggestion-header">
        <span className="suggestion-kicker">Choose a suggestion</span>
        <h2>AI suggestions</h2>
        <p>6 AI-generated captions. Pick the one you like best.</p>
        <button onClick={handleBack} className="btn btn-back">
          ← Upload a different image
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
              <span className="template-name">
                {suggestion.name || suggestion.template?.name}
              </span>
              <span className="humor-badge">{suggestion.humor_type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SuggestionGrid
