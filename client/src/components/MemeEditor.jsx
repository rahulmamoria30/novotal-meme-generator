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
import { saveMeme, getTemplates } from "../utils/api"
import "./MemeEditor.css"

// Style presets — one-click style swaps
const VIBES = [
  {
    id: "impact",
    name: "Classic",
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
    name: "Comic",
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
    name: "Neon",
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
    name: "Y2K",
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
    name: "Minimal",
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
    name: "Ransom",
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
  "Drag the text to reposition it.",
  "Shorter captions usually land better.",
  "If it makes you laugh, it works.",
  "White text with a black outline is a safe default.",
  "Contrast between caption and image makes the joke.",
  "Sometimes no caption is best.",
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
  const [proTipIndex] = useState(() =>
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
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState(
    selectedTemplate?.style?.fontFamily || "Impact"
  )
  const [textColor, setTextColor] = useState("#ffffff")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [topAlign, setTopAlign] = useState("center")
  const [bottomAlign, setBottomAlign] = useState("center")

  // Text box width — narrower than canvas so text can be dragged horizontally
  const textPadding = 16
  const textBoxWidth = Math.max(120, dimensions.width * 0.85)

  // Text positions (draggable)
  const [topTextPos, setTopTextPos] = useState({ x: 0, y: 30 })
  const [bottomTextPos, setBottomTextPos] = useState({ x: 0, y: 0 })

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
      const cs = window.getComputedStyle(containerRef.current)
      const innerPad =
        parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0)
      const containerWidth = Math.min(
        containerRef.current.offsetWidth - innerPad,
        600
      )

      const boxWidth = Math.max(120, containerWidth * 0.85)
      const centerX = (containerWidth - boxWidth) / 2

      if (image) {
        const aspectRatio = image.width / image.height
        const height = containerWidth / aspectRatio
        const finalHeight = Math.min(height, 600)
        setDimensions({ width: containerWidth, height: finalHeight })
        setTopTextPos({ x: centerX, y: 30 })
        setBottomTextPos({ x: centerX, y: finalHeight - 80 })
      } else {
        setDimensions({ width: containerWidth, height: containerWidth })
        setTopTextPos({ x: centerX, y: 30 })
        setBottomTextPos({ x: centerX, y: containerWidth - 80 })
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

  // Apply a one-click style preset — keep text color white by default;
  // the user can override via the color picker if they want.
  const applyVibe = (vibe) => {
    setFontFamily(vibe.style.fontFamily)
    setStrokeColor(vibe.style.strokeColor)
    setStrokeWidth(vibe.style.strokeWidth)
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
          ← Back to suggestions
        </button>
        <div className="editor-title-block">
          <span className="editor-kicker">Editor</span>
          <h2>Edit your meme</h2>
        </div>
        <div className="editor-header-actions">
          <button onClick={handleDownload} className="btn btn-download">
            📥 Download
          </button>
          <button onClick={handleCopyToClipboard} className="btn btn-copy">
            📋 Copy
          </button>
          <button
            onClick={handleShare}
            className="btn btn-share"
            disabled={isSaving}
          >
            {isSaving ? "Sharing..." : "🚀 Share"}
          </button>
        </div>
      </div>

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
              <span className="section-title">Caption</span>
            </div>

            <div className="control-group">
              <div className="label-row">
                <label>Top text</label>
                <span className="char-chip">{topText.length} chars</span>
              </div>
              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="Enter top caption..."
                rows={2}
              />
            </div>

            <div className="control-group">
              <div className="label-row">
                <label>Bottom text</label>
                <span className="char-chip">{bottomText.length} chars</span>
              </div>
              <textarea
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="Enter bottom caption..."
                rows={2}
              />
            </div>
          </section>

          {/* === VIBE SECTION === */}
          <section className="control-section">
            <div className="section-head">
              <span className="section-tag">02</span>
              <span className="section-title">Style presets</span>
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
              <span className="section-title">Style</span>
            </div>

            <div className="control-group">
              <label>Size · {fontSize}px</label>
              <input
                type="range"
                min="14"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Font</label>
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
                <label>Text</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </div>
              <div className="control-group">
                <label>Outline</label>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                />
              </div>
            </div>

            <div className="control-group">
              <label>Outline width · {strokeWidth}px</label>
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
              <span className="section-title">Template</span>
            </div>
            <button
              className="btn btn-template"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              🎨 {showTemplates ? "Hide templates" : "Change template"}
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
            <span className="pro-tip-label">💡 Tip</span>
            <span className="pro-tip-text">{PRO_TIPS[proTipIndex]}</span>
          </div>

        </div>
      </div>
    </div>
  )
}

export default MemeEditor
