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
        setDimensions({
          width: containerWidth,
          height: Math.min(calculatedHeight, containerWidth),
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

  const renderText = (text, position, isTop = true) => {
    if (!text) return null

    const fontSize = (position?.fontSize || 48) * (dimensions.width / 500)
    const x = ((position?.x || 50) / 100) * dimensions.width
    const y = isTop
      ? ((position?.y || 8) / 100) * dimensions.height
      : dimensions.height - fontSize * 2 - 20

    return (
      <Text
        text={text.toUpperCase()}
        x={0}
        y={y}
        width={dimensions.width}
        fontSize={fontSize}
        fontFamily={style.fontFamily || "Impact"}
        fill={style.fill || "#ffffff"}
        stroke={style.stroke || "#000000"}
        strokeWidth={style.strokeWidth || 3}
        align="center"
        verticalAlign="middle"
        shadowColor={style.shadow ? "#000000" : "transparent"}
        shadowBlur={style.shadow ? 4 : 0}
        shadowOffsetX={style.shadow ? 2 : 0}
        shadowOffsetY={style.shadow ? 2 : 0}
        wrap="word"
        lineHeight={1.2}
      />
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
