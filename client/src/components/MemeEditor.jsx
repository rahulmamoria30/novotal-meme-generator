import React, { useRef, useState, useEffect, useCallback } from "react"
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text,
  Rect,
  Transformer,
} from "react-konva"
import useImage from "use-image"
import { toPng } from "html-to-image"
import { saveAs } from "file-saver"
import { useNavigate } from "react-router-dom"
import useMemeStore from "../store/memeStore"
import { saveMeme, getTemplates, getSuggestions } from "../utils/api"
import "./MemeEditor.css"

// Vibe presets — one-click style swaps
const VIBES = [
  {
    id: "impact",
    name: "classic",
    emoji: "💪",
    bg: "var(--c-paper)",
    style: {
      fontFamily: "Impact",
      textColor: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 3,
    },
  },
  {
    id: "comic",
    name: "chaos",
    emoji: "🤡",
    bg: "var(--c-pink)",
    style: {
      fontFamily: "Comic Sans MS",
      textColor: "#ffffff",
      strokeColor: "#ff3d8a",
      strokeWidth: 4,
    },
  },
  {
    id: "neon",
    name: "cursed",
    emoji: "👁️",
    bg: "var(--c-purple)",
    style: {
      fontFamily: "Arial Black",
      textColor: "#b6ff3d",
      strokeColor: "#6c49ff",
      strokeWidth: 5,
    },
  },
  {
    id: "y2k",
    name: "y2k",
    emoji: "💿",
    bg: "var(--c-cyan)",
    style: {
      fontFamily: "Helvetica",
      textColor: "#46e4ff",
      strokeColor: "#ff3d8a",
      strokeWidth: 3,
    },
  },
  {
    id: "minimal",
    name: "minimal",
    emoji: "🧊",
    bg: "var(--c-bg-2)",
    style: {
      fontFamily: "Helvetica",
      textColor: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 1,
    },
  },
  {
    id: "ransom",
    name: "ransom",
    emoji: "📰",
    bg: "var(--c-yellow)",
    style: {
      fontFamily: "Times New Roman",
      textColor: "#000000",
      strokeColor: "#ffffff",
      strokeWidth: 2,
    },
  },
]

const FONT_OPTIONS = [
  "Impact",
  "Arial Black",
  "Comic Sans MS",
  "Helvetica",
  "Times New Roman",
]

const PRO_TIPS = [
  "drag the text. you have the rizz.",
  "shorter caption = more ratio potential",
  "if it makes YOU laugh, it ate.",
  "white text + black outline is undefeated",
  "the contrast between caption and pic is the joke",
  "no caption is also a vibe",
]

const MemeEditor = () => {
  const navigate = useNavigate()
  const stageRef = useRef(null)
  const topTextRef = useRef(null)
  const bottomTextRef = useRef(null)
  const transformerRef = useRef(null)
  const containerRef = useRef(null)

  const [selectedId, setSelectedId] = useState(null)
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 })
  const [isSaving, setIsSaving] = useState(false)
  const [templates, setTemplates] = useState([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [isRemixing, setIsRemixing] = useState(false)
  const [remixError, setRemixError] = useState(null)
  const [proTipIndex, setProTipIndex] = useState(() =>
    Math.floor(Math.random() * PRO_TIPS.length)
  )

  const {
    uploadedImage,
    selectedTemplate,
    editorTexts,
    updateEditorText,
    setSavedMeme,
    resetToUpload,
    changeTemplate,
    sessionId,
    draftId,
  } = useMemeStore()

  const [image] = useImage(uploadedImage, "anonymous")

  const [topText, setTopText] = useState(editorTexts[0]?.text || "")
  const [bottomText, setBottomText] = useState(editorTexts[1]?.text || "")
  const [fontSize, setFontSize] = useState(28)
  const [fontFamily, setFontFamily] = useState(
    selectedTemplate?.style?.fontFamily || "Impact"
  )
  const [textColor, setTextColor] = useState("#ffffff")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(3)

  // Text positions (draggable)
  const [topTextPos, setTopTextPos] = useState({ x: 0, y: 30 })
  const [bottomTextPos, setBottomTextPos] = useState({ x: 0, y: 0 })

  const textPadding = 16
  const clampTextPos = (x, y, node) => {
    if (!node) return { x, y }
    const rect = node.getClientRect()
    const maxX = Math.max(0, dimensions.width - rect.width)
    const maxY = Math.max(0, dimensions.height - rect.height)
    return {
      x: Math.min(Math.max(x, 0), maxX),
      y: Math.min(Math.max(y, 0), maxY),
    }
  }

  // Load templates
  useEffect(() => {
    getTemplates().then(setTemplates).catch(console.error)
  }, [])

  // Update dimensions based on container and image
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      const containerWidth = Math.min(
        containerRef.current.offsetWidth - 40,
        600
      )

      if (image) {
        const aspectRatio = image.width / image.height
        const height = containerWidth / aspectRatio
        setDimensions({ width: containerWidth, height: Math.min(height, 600) })
        setBottomTextPos({ x: 0, y: Math.min(height, 600) - 80 })
      } else {
        setDimensions({ width: containerWidth, height: containerWidth })
        setBottomTextPos({ x: 0, y: containerWidth - 80 })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [image])

  // Sync with store
  useEffect(() => {
    if (editorTexts[0]) setTopText(editorTexts[0].text)
    if (editorTexts[1]) setBottomText(editorTexts[1].text)
  }, [editorTexts])

  // Keyboard shortcuts when no text input is focused
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase()
      const inField = tag === "input" || tag === "textarea" || tag === "select"
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === "r") handleRemix()
      else if (key === "x") handleSurprise()
      else if (key === "u") handleReset()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })

  // Update transformer
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node =
        selectedId === "top" ? topTextRef.current : bottomTextRef.current
      if (node) {
        transformerRef.current.nodes([node])
        transformerRef.current.getLayer().batchDraw()
      }
    }
  }, [selectedId])

  const handleTextClick = (id) => {
    setSelectedId(id)
  }

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null)
    }
  }

  const handleDragEnd = (e, isTop) => {
    const pos = { x: e.target.x(), y: e.target.y() }
    const clamped = clampTextPos(pos.x, pos.y, e.target)
    if (isTop) {
      setTopTextPos(clamped)
    } else {
      setBottomTextPos(clamped)
    }
  }

  const exportMeme = useCallback(async () => {
    if (!stageRef.current) return null

    setSelectedId(null) // Hide transformer

    // Wait for transformer to hide
    await new Promise((resolve) => setTimeout(resolve, 100))

    const dataUrl = stageRef.current.toDataURL({
      pixelRatio: 2,
      mimeType: "image/png",
    })

    return dataUrl
  }, [])

  const handleDownload = async () => {
    const dataUrl = await exportMeme()
    if (dataUrl) {
      saveAs(dataUrl, `meme-${Date.now()}.png`)
    }
  }

  const handleCopyToClipboard = async () => {
    const dataUrl = await exportMeme()
    if (dataUrl) {
      try {
        const blob = await (await fetch(dataUrl)).blob()
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
        alert("Copied to clipboard!")
      } catch (err) {
        console.error("Failed to copy:", err)
        alert("Failed to copy to clipboard")
      }
    }
  }

  const handleShare = async () => {
    setIsSaving(true)
    try {
      const imageBase64 = await exportMeme()

      const result = await saveMeme({
        imageBase64,
        templateId: selectedTemplate?.id,
        texts: { topText, bottomText },
        creatorSessionId: sessionId,
        draftId,
      })

      setSavedMeme(result.meme, result.shareUrl)
      navigate("/share")
    } catch (err) {
      console.error("Failed to save meme:", err)
      alert("Failed to share meme")
    } finally {
      setIsSaving(false)
    }
  }

  // Back button goes to the templates page so users can pick a different
  // suggestion without losing their uploaded image or the 6 AI options.
  const handleBackToTemplates = () => {
    navigate("/templates")
  }

  // Apply a one-click vibe preset (font + colors + outline width)
  const applyVibe = (vibe) => {
    setFontFamily(vibe.style.fontFamily)
    setTextColor(vibe.style.textColor)
    setStrokeColor(vibe.style.strokeColor)
    setStrokeWidth(vibe.style.strokeWidth)
  }

  // Reset caption text back to whatever the AI originally suggested
  const handleReset = () => {
    setTopText(editorTexts[0]?.text || "")
    setBottomText(editorTexts[1]?.text || "")
  }

  // Surprise me: random template + random font + random vibe + random font size
  const handleSurprise = () => {
    if (templates.length > 0) {
      const t = templates[Math.floor(Math.random() * templates.length)]
      changeTemplate(t)
    }
    const v = VIBES[Math.floor(Math.random() * VIBES.length)]
    applyVibe(v)
    setFontSize(20 + Math.floor(Math.random() * 30))
    setProTipIndex((i) => (i + 1) % PRO_TIPS.length)
  }

  // Re-roll the AI for fresh captions on the same image
  const handleRemix = async () => {
    if (!uploadedImage || isRemixing) return
    setIsRemixing(true)
    setRemixError(null)
    try {
      const { suggestions } = await getSuggestions(
        null,
        uploadedImage,
        "image/png",
        "",
        sessionId
      )
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error("AI returned nothing")
      }
      // Prefer a suggestion that uses the current template, else first.
      const match =
        suggestions.find((s) => s.templateId === selectedTemplate?.id) ||
        suggestions[0]
      setTopText(match.topText || "")
      setBottomText(match.bottomText || "")
    } catch (err) {
      console.error("Remix failed:", err)
      setRemixError(err.message || "remix flopped")
    } finally {
      setIsRemixing(false)
    }
  }

  const handleTemplateChange = (template) => {
    changeTemplate(template)
    setFontFamily(template?.style?.fontFamily || "Impact")
    setShowTemplates(false)
  }

  const scaledFontSize = fontSize * (dimensions.width / 500)

  return (
    <div className="editor-container">
      <div className="editor-header">
        <button onClick={handleBackToTemplates} className="btn btn-back">
          ← back to menu
        </button>
        <div className="editor-title-block">
          <span className="editor-kicker">main character mode</span>
          <h2>cook it your way</h2>
        </div>
        <div className="editor-quick-row">
          <button
            onClick={handleRemix}
            className="quick-chip chip-remix"
            disabled={isRemixing}
            title="get new AI captions (R)"
          >
            {isRemixing ? "🌀 cooking..." : "🌀 remix"}
          </button>
          <button
            onClick={handleSurprise}
            className="quick-chip chip-surprise"
            title="random vibe (X)"
          >
            🎲 surprise
          </button>
          <button
            onClick={handleReset}
            className="quick-chip chip-reset"
            title="undo to AI original (U)"
          >
            ↺ reset
          </button>
        </div>
      </div>

      {remixError && (
        <div className="editor-flash">remix flopped: {remixError}</div>
      )}

      <div className="editor-layout">
        {/* Canvas */}
        <div className="canvas-container" ref={containerRef}>
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            onClick={handleStageClick}
            onTap={handleStageClick}
          >
            <Layer>
              {/* Image */}
              {image && (
                <KonvaImage
                  image={image}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              )}

              {/* Top Text */}
              <Rect
                x={0}
                y={Math.max(0, topTextPos.y - 14)}
                width={dimensions.width}
                height={scaledFontSize * 2.2 + 24}
                fill="rgba(0, 0, 0, 0.35)"
                cornerRadius={12}
              />
              <Text
                ref={topTextRef}
                text={topText.toUpperCase()}
                x={topTextPos.x}
                y={topTextPos.y}
                width={Math.max(100, dimensions.width - textPadding * 2)}
                fontSize={scaledFontSize}
                fontFamily={fontFamily}
                fill={textColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                align="center"
                draggable
                onClick={() => handleTextClick("top")}
                onTap={() => handleTextClick("top")}
                onDragEnd={(e) => handleDragEnd(e, true)}
                shadowColor="#000000"
                shadowBlur={4}
                shadowOffsetX={2}
                shadowOffsetY={2}
                wrap="word"
                lineHeight={1.2}
                padding={textPadding}
              />

              {/* Bottom Text */}
              <Rect
                x={0}
                y={Math.max(0, bottomTextPos.y - 14)}
                width={dimensions.width}
                height={scaledFontSize * 2.2 + 24}
                fill="rgba(0, 0, 0, 0.35)"
                cornerRadius={12}
              />
              <Text
                ref={bottomTextRef}
                text={bottomText.toUpperCase()}
                x={bottomTextPos.x}
                y={bottomTextPos.y}
                width={Math.max(100, dimensions.width - textPadding * 2)}
                fontSize={scaledFontSize}
                fontFamily={fontFamily}
                fill={textColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                align="center"
                draggable
                onClick={() => handleTextClick("bottom")}
                onTap={() => handleTextClick("bottom")}
                onDragEnd={(e) => handleDragEnd(e, false)}
                shadowColor="#000000"
                shadowBlur={4}
                shadowOffsetX={2}
                shadowOffsetY={2}
                wrap="word"
                lineHeight={1.2}
                padding={textPadding}
              />

              {/* Transformer for selected text */}
              {selectedId && (
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    // Limit resize
                    if (newBox.width < 50 || newBox.height < 20) {
                      return oldBox
                    }
                    return newBox
                  }}
                />
              )}
            </Layer>
          </Stage>
        </div>

        {/* Controls */}
        <div className="controls-panel">
          {/* === TEXT SECTION === */}
          <section className="control-section">
            <div className="section-head">
              <span className="section-tag">01</span>
              <span className="section-title">caption</span>
            </div>

            <div className="control-group">
              <div className="label-row">
                <label>top text 🔝</label>
                <span className="char-chip">{topText.length} chars</span>
              </div>
              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="spill it..."
                rows={2}
              />
            </div>

            <div className="control-group">
              <div className="label-row">
                <label>bottom text 👇</label>
                <span className="char-chip">{bottomText.length} chars</span>
              </div>
              <textarea
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="...and the kicker"
                rows={2}
              />
            </div>
          </section>

          {/* === VIBE SECTION === */}
          <section className="control-section">
            <div className="section-head">
              <span className="section-tag">02</span>
              <span className="section-title">vibe presets</span>
            </div>
            <div className="vibe-grid">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="vibe-chip"
                  style={{ background: v.bg }}
                  onClick={() => applyVibe(v)}
                >
                  <span className="vibe-emoji">{v.emoji}</span>
                  <span className="vibe-name">{v.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* === STYLE SECTION === */}
          <section className="control-section">
            <div className="section-head">
              <span className="section-tag">03</span>
              <span className="section-title">style tweaks</span>
            </div>

            <div className="control-group">
              <label>size · {fontSize}px</label>
              <input
                type="range"
                min="14"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>font</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-row colors">
              <div className="control-group">
                <label>text</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </div>
              <div className="control-group">
                <label>outline</label>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                />
              </div>
            </div>

            <div className="control-group">
              <label>outline thiccness · {strokeWidth}px</label>
              <input
                type="range"
                min="0"
                max="8"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
              />
            </div>
          </section>

          {/* === TEMPLATE SECTION === */}
          <section className="control-section">
            <div className="section-head">
              <span className="section-tag">04</span>
              <span className="section-title">template</span>
            </div>
            <button
              className="btn btn-template"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              🎨 {showTemplates ? "hide templates" : "swap template"}
            </button>
            {showTemplates && (
              <div className="template-picker">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    className={`template-option ${
                      selectedTemplate?.id === t.id ? "active" : ""
                    }`}
                    onClick={() => handleTemplateChange(t)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* === PRO TIP === */}
          <div className="pro-tip">
            <span className="pro-tip-label">💡 pro tip</span>
            <span className="pro-tip-text">{PRO_TIPS[proTipIndex]}</span>
          </div>

          {/* === KEYBOARD HINTS === */}
          <div className="kb-hints">
            <span><kbd>R</kbd> remix</span>
            <span><kbd>X</kbd> surprise</span>
            <span><kbd>U</kbd> reset</span>
          </div>

          {/* === ACTIONS (sticky) === */}
          <div className="action-buttons">
            <button onClick={handleDownload} className="btn btn-download">
              📥 save the W
            </button>
            <button onClick={handleCopyToClipboard} className="btn btn-copy">
              📋 yoink
            </button>
            <button
              onClick={handleShare}
              className="btn btn-share"
              disabled={isSaving}
            >
              {isSaving ? "cooking..." : "🚀 post it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemeEditor
