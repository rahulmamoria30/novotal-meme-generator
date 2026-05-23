import React, { useEffect, useRef, useState } from "react"
import { Stage, Layer, Image as KonvaImage, Text, Rect } from "react-konva"
import useImage from "use-image"

const MemePreview = ({
  imageUrl,
  template,
  topText,
  bottomText,
  size = "preview",
  width: propWidth,
  height: propHeight,
}) => {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 })

  // Load image
  const [image] = useImage(imageUrl, "anonymous")

  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (propWidth && propHeight) {
        setDimensions({ width: propWidth, height: propHeight })
      } else if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const aspectRatio = image ? image.width / image.height : 1
        const calculatedHeight = containerWidth / aspectRatio
        // Use real aspect ratio, but clamp very tall/wide images so layout stays sane
        const maxHeight = containerWidth * 1.4
        const minHeight = containerWidth * 0.6
        setDimensions({
          width: containerWidth,
          height: Math.max(minHeight, Math.min(calculatedHeight, maxHeight)),
        })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [image, propWidth, propHeight])

  const style = template?.style || {
    fontFamily: "Impact",
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 3,
  }

  const padding = 16
  const textWidth = Math.max(100, dimensions.width - padding * 2)

  const renderText = (text, position, isTop = true) => {
    if (!text) return null

    // Scale font with width — kept intentionally small so captions don't
    // dominate the image on either previews or the edit canvas.
    const scaledFontSize = (position?.fontSize || 48) * (dimensions.width / 560)
    const floor = dimensions.width < 220 ? 14 : 18
    let fontSize = Math.max(scaledFontSize, floor)

    // Each text block can use up to 35% of the canvas height — leaves more
    // room for the image, since text is smaller now.
    const maxBlockHeight = dimensions.height * 0.35
    const lineHeight = 1.15
    const verticalPadding = 10

    // Estimate lines at current font size; if it overflows the cap, shrink to fit
    const estimateLines = (size) => {
      const charsPerLine = Math.max(6, Math.floor(textWidth / (size * 0.55)))
      return Math.max(1, Math.ceil(text.length / charsPerLine))
    }

    let lines = estimateLines(fontSize)
    let blockHeight = fontSize * lineHeight * lines + verticalPadding

    if (blockHeight > maxBlockHeight) {
      // Shrink font until block fits, with a hard floor so it stays legible
      const scale = maxBlockHeight / blockHeight
      fontSize = Math.max(14, fontSize * scale)
      lines = estimateLines(fontSize)
      blockHeight = Math.min(
        maxBlockHeight,
        fontSize * lineHeight * lines + verticalPadding
      )
    }

    const y = isTop
      ? padding
      : dimensions.height - blockHeight - padding

    return (
      <>
        <Rect
          x={padding / 2}
          y={y}
          width={dimensions.width - padding}
          height={blockHeight}
          fill="rgba(0, 0, 0, 0.85)"
          cornerRadius={8}
        />
        <Text
          text={text.toUpperCase()}
          x={padding}
          y={y}
          width={textWidth}
          height={blockHeight}
          fontSize={fontSize}
          fontFamily={style.fontFamily || "Impact"}
          fontStyle="bold"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth={Math.max(1.5, fontSize * 0.06)}
          align="center"
          verticalAlign="middle"
          shadowColor="#000000"
          shadowBlur={6}
          shadowOffsetX={1}
          shadowOffsetY={1}
          wrap="word"
          lineHeight={lineHeight}
          ellipsis={true}
        />
      </>
    )
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer>
          {/* Background for demotivational style */}
          {template?.frameStyle?.background && (
            <Rect
              x={0}
              y={0}
              width={dimensions.width}
              height={dimensions.height}
              fill={template.frameStyle.background}
            />
          )}

          {/* Top bar for modern caption style */}
          {template?.frameStyle?.topBar && (
            <Rect
              x={0}
              y={0}
              width={dimensions.width}
              height={
                template.frameStyle.topBar.height * (dimensions.height / 500)
              }
              fill={template.frameStyle.topBar.background}
            />
          )}

          {/* Image */}
          {image && (
            <KonvaImage
              image={image}
              x={
                template?.frameStyle?.padding ? template.frameStyle.padding : 0
              }
              y={
                template?.frameStyle?.topBar
                  ? template.frameStyle.topBar.height *
                    (dimensions.height / 500)
                  : template?.frameStyle?.padding || 0
              }
              width={
                dimensions.width -
                (template?.frameStyle?.padding
                  ? template.frameStyle.padding * 2
                  : 0)
              }
              height={
                dimensions.height -
                (template?.frameStyle?.topBar
                  ? template.frameStyle.topBar.height *
                    (dimensions.height / 500)
                  : 0) -
                (template?.frameStyle?.padding || 0)
              }
            />
          )}

          {/* Top text */}
          {renderText(topText, template?.layout?.topText, true)}

          {/* Bottom text */}
          {renderText(bottomText, template?.layout?.bottomText, false)}
        </Layer>
      </Stage>
    </div>
  )
}

export default MemePreview
