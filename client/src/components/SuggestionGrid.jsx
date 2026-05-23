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
        <h2>AI is analyzing your image...</h2>
        <p>Generating 6 hilarious meme ideas</p>
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="no-suggestions">
        <p>No suggestions available. Try uploading a different image.</p>
        <button onClick={handleBack} className="btn btn-retry">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="suggestion-container">
      <div className="suggestion-header">
        <h2>Pick Your Meme</h2>
        <p>AI generated 6 different formats based on your photo</p>
        <button onClick={handleBack} className="btn btn-back">
          ← Different Photo
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
