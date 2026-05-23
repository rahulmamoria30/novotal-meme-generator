import React, { useCallback, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useNavigate } from "react-router-dom"
import useMemeStore from "../store/memeStore"
import { uploadImage, getSuggestions } from "../utils/api"
import "./ImageUpload.css"

const ImageUpload = () => {
  const navigate = useNavigate()
  const {
    setUploadedImage,
    setSuggestions,
    setLoadingSuggestions,
    setSuggestionsError,
    setUserPrompt,
  } = useMemeStore()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [userText, setUserText] = useState("")
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const textareaRef = useRef(null)

  const processAndGenerate = async (file, imageUrl) => {
    try {
      setIsUploading(false)
      setLoadingSuggestions(true)
      navigate("/templates")

      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result
        setUploadedImage(base64, imageUrl)
        if (setUserPrompt) setUserPrompt(userText)

        try {
          const suggestions = await getSuggestions(
            imageUrl,
            base64,
            file.type,
            userText
          )
          setSuggestions(suggestions)
        } catch (err) {
          console.error("Error getting suggestions:", err)
          setSuggestionsError(err.message)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(err.message)
      setIsUploading(false)
      setLoadingSuggestions(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    setError(null)
    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    noKeyboard: true,
  })

  const handleGenerate = async () => {
    if (!selectedImage) {
      setError("Please add an image first")
      return
    }
    setIsUploading(true)
    try {
      const result = await uploadImage(selectedImage)
      await processAndGenerate(selectedImage, result.imageUrl)
    } catch (err) {
      setError("Failed to process image")
      setIsUploading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && selectedImage) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          setSelectedImage(file)
          const reader = new FileReader()
          reader.onload = (ev) => setImagePreview(ev.target.result)
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }, [])

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setShowWebcam(true)
    } catch (err) {
      setError("Could not access webcam")
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0)
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], "webcam-capture.jpg", {
          type: "image/jpeg",
        })
        setSelectedImage(file)
        setImagePreview(canvas.toDataURL("image/jpeg"))
        stopWebcam()
      },
      "image/jpeg",
      0.9
    )
  }

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowWebcam(false)
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  React.useEffect(() => {
    document.addEventListener("paste", handlePaste)
    return () => {
      document.removeEventListener("paste", handlePaste)
      stopWebcam()
    }
  }, [handlePaste])

  if (showWebcam) {
    return (
      <div className="webcam-modal">
        <div className="webcam-content">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="webcam-video"
          />
          <div className="webcam-actions">
            <button onClick={capturePhoto} className="webcam-btn capture">
              <span>📸</span> Take Photo
            </button>
            <button onClick={stopWebcam} className="webcam-btn cancel">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gpt-container" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="drag-overlay">
          <div className="drag-content">
            <span className="drag-icon">📷</span>
            <p>Drop your image here</p>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="gpt-content">
        {!selectedImage ? (
          // Empty state
          <div className="empty-state">
            <div className="empty-icon">🎭</div>
            <h1>Create a Meme</h1>
            <p>
              Upload an image, add your text, and AI will turn it into a
              hilarious meme
            </p>

            <div className="quick-actions">
              <button onClick={open} className="action-card">
                <span className="action-icon">📤</span>
                <span className="action-label">Upload Image</span>
              </button>
              <button onClick={startWebcam} className="action-card">
                <span className="action-icon">📷</span>
                <span className="action-label">Take Photo</span>
              </button>
              <button
                onClick={() => textareaRef.current?.focus()}
                className="action-card"
              >
                <span className="action-icon">📋</span>
                <span className="action-label">Paste Image</span>
              </button>
            </div>
          </div>
        ) : (
          // Image selected state
          <div className="preview-state">
            <div className="image-card">
              <img src={imagePreview} alt="Preview" />
              <button
                onClick={clearImage}
                className="remove-btn"
                title="Remove image"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="gpt-input-wrapper">
        <div className="gpt-input-container">
          {selectedImage && (
            <div className="attached-preview">
              <img src={imagePreview} alt="attached" />
              <button onClick={clearImage} className="attached-remove">
                ×
              </button>
            </div>
          )}

          <div className="input-row">
            <button onClick={open} className="input-btn" title="Upload image">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedImage
                  ? "Type your meme text here... AI will enhance it!"
                  : "Upload an image to get started..."
              }
              rows={1}
              className="gpt-textarea"
            />

            <button
              onClick={handleGenerate}
              disabled={!selectedImage || isUploading}
              className={`send-btn ${
                selectedImage && !isUploading ? "active" : ""
              }`}
              title="Generate memes"
            >
              {isUploading ? (
                <div className="spinner" />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <p className="input-hint">
          {selectedImage
            ? "Your text becomes the meme caption • AI will make it funnier"
            : "Drag & drop, paste (Ctrl+V), or click to upload an image"}
        </p>
      </div>

      {error && <div className="error-toast">{error}</div>}
    </div>
  )
}

export default ImageUpload
