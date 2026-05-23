import React, { useRef, useState, useEffect, useCallback } from "react"
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text,
  Transformer,
} from "react-konva"
import useImage from "use-image"
import { toPng } from "html-to-image"
import { saveAs } from "file-saver"
import useMemeStore from "../store/memeStore"
import { saveMeme, getTemplates } from "../utils/api"
import "./MemeEditor.css"

const MemeEditor = () => {
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

  const {
    uploadedImage,
    selectedTemplate,
    editorTexts,
    updateEditorText,
    setSavedMeme,
    resetToUpload,
    changeTemplate,
    sessionId,
  } = useMemeStore()

  const [image] = useImage(uploadedImage, "anonymous")

  const [topText, setTopText] = useState(editorTexts[0]?.text || "")
  const [bottomText, setBottomText] = useState(editorTexts[1]?.text || "")
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState(
    selectedTemplate?.style?.fontFamily || "Impact"
  )
  const [textColor, setTextColor] = useState("#ffffff")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(3)

  // Text positions (draggable)
  const [topTextPos, setTopTextPos] = useState({ x: 0, y: 30 })
  const [bottomTextPos, setBottomTextPos] = useState({ x: 0, y: 0 })

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
    if (isTop) {
      setTopTextPos(pos)
    } else {
      setBottomTextPos(pos)
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
      })

      setSavedMeme(result.meme, result.shareUrl)
    } catch (err) {
      console.error("Failed to save meme:", err)
      alert("Failed to share meme")
    } finally {
      setIsSaving(false)
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
        <button onClick={resetToUpload} className="btn btn-back">
          ← Start Over
        </button>
        <h2>Edit Your Meme</h2>
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
              <Text
                ref={topTextRef}
                text={topText.toUpperCase()}
                x={topTextPos.x}
                y={topTextPos.y}
                width={dimensions.width}
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
              />

              {/* Bottom Text */}
              <Text
                ref={bottomTextRef}
                text={bottomText.toUpperCase()}
                x={bottomTextPos.x}
                y={bottomTextPos.y}
                width={dimensions.width}
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
          <div className="control-group">
            <label>Top Text</label>
            <textarea
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              placeholder="Enter top text..."
              rows={2}
            />
          </div>

          <div className="control-group">
            <label>Bottom Text</label>
            <textarea
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              placeholder="Enter bottom text..."
              rows={2}
            />
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Font Size</label>
              <input
                type="range"
                min="20"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span>{fontSize}px</span>
            </div>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Font</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                <option value="Impact">Impact</option>
                <option value="Arial Black">Arial Black</option>
                <option value="Comic Sans MS">Comic Sans</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>
            </div>
          </div>

          <div className="control-row colors">
            <div className="control-group">
              <label>Text Color</label>
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
            <label>Outline Width</label>
            <input
              type="range"
              min="0"
              max="8"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
            />
          </div>

          <button
            className="btn btn-template"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            🎨 Change Template
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

          <div className="action-buttons">
            <button onClick={handleDownload} className="btn btn-download">
              📥 Download PNG
            </button>
            <button onClick={handleCopyToClipboard} className="btn btn-copy">
              📋 Copy
            </button>
            <button
              onClick={handleShare}
              className="btn btn-share"
              disabled={isSaving}
            >
              {isSaving ? "..." : "🔗 Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemeEditor
