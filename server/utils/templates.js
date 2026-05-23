// Meme template definitions - each is a reusable recipe
const memeTemplates = [
  {
    id: "classic-top-bottom",
    name: "Classic Top/Bottom",
    description: "Traditional meme format with text at top and bottom",
    layout: {
      topText: { x: 50, y: 8, fontSize: 48, maxWidth: 90, align: "center" },
      bottomText: { x: 50, y: 92, fontSize: 48, maxWidth: 90, align: "center" },
    },
    style: {
      fontFamily: "Impact",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 3,
      shadow: true,
    },
  },
  {
    id: "demotivational",
    name: "Demotivational Poster",
    description: "Black border with title and subtitle below image",
    layout: {
      topText: { x: 50, y: 85, fontSize: 42, maxWidth: 85, align: "center" },
      bottomText: { x: 50, y: 93, fontSize: 24, maxWidth: 85, align: "center" },
    },
    style: {
      fontFamily: "Times New Roman",
      fill: "#ffffff",
      stroke: "none",
      strokeWidth: 0,
      shadow: false,
    },
    frameStyle: {
      background: "#000000",
      padding: 40,
      border: "2px solid #ffffff",
    },
  },
  {
    id: "modern-caption",
    name: "Modern Caption",
    description: "Clean white bar at top with black text",
    layout: {
      topText: { x: 50, y: 12, fontSize: 32, maxWidth: 90, align: "center" },
    },
    style: {
      fontFamily: "Arial",
      fill: "#000000",
      stroke: "none",
      strokeWidth: 0,
      shadow: false,
    },
    frameStyle: {
      topBar: { height: 80, background: "#ffffff" },
    },
  },
  {
    id: "twitter-screenshot",
    name: "Twitter/X Style",
    description: "Fake tweet format above the image",
    layout: {
      topText: { x: 10, y: 8, fontSize: 28, maxWidth: 85, align: "left" },
    },
    style: {
      fontFamily: "Helvetica",
      fill: "#0f1419",
      stroke: "none",
      strokeWidth: 0,
      shadow: false,
    },
    frameStyle: {
      topBar: { height: 100, background: "#ffffff", rounded: true },
    },
  },
  {
    id: "drake-style",
    name: "Comparison (Drake Style)",
    description: "Two-panel reaction format",
    layout: {
      topText: { x: 75, y: 25, fontSize: 28, maxWidth: 45, align: "center" },
      bottomText: { x: 75, y: 75, fontSize: 28, maxWidth: 45, align: "center" },
    },
    style: {
      fontFamily: "Arial Black",
      fill: "#000000",
      stroke: "none",
      strokeWidth: 0,
      shadow: false,
    },
    frameStyle: {
      splitVertical: true,
      imagePosition: "left",
    },
  },
  {
    id: "expanding-brain",
    name: "Expanding Brain",
    description: "Escalating levels of enlightenment",
    layout: {
      texts: [
        { x: 50, y: 12, fontSize: 20, maxWidth: 45, align: "center" },
        { x: 50, y: 37, fontSize: 20, maxWidth: 45, align: "center" },
        { x: 50, y: 62, fontSize: 20, maxWidth: 45, align: "center" },
        { x: 50, y: 87, fontSize: 20, maxWidth: 45, align: "center" },
      ],
    },
    style: {
      fontFamily: "Arial",
      fill: "#000000",
      stroke: "none",
      strokeWidth: 0,
      shadow: false,
    },
    frameStyle: {
      grid: { rows: 4, cols: 2 },
    },
  },
  {
    id: "nobody-meme",
    name: "Nobody: Meme",
    description: "Nobody: ... format with reaction below",
    layout: {
      topText: {
        x: 50,
        y: 5,
        fontSize: 24,
        maxWidth: 90,
        align: "center",
        prefix: "Nobody:\n",
      },
      bottomText: { x: 50, y: 15, fontSize: 28, maxWidth: 90, align: "center" },
    },
    style: {
      fontFamily: "Arial",
      fill: "#000000",
      stroke: "none",
      strokeWidth: 0,
      shadow: false,
    },
    frameStyle: {
      topBar: { height: 120, background: "#ffffff" },
    },
  },
  {
    id: "distracted-bf",
    name: "Distracted Boyfriend Style",
    description: "Labels pointing to subjects in image",
    layout: {
      labels: [
        {
          x: 20,
          y: 50,
          fontSize: 24,
          maxWidth: 25,
          align: "center",
          pointer: true,
        },
        {
          x: 50,
          y: 50,
          fontSize: 24,
          maxWidth: 25,
          align: "center",
          pointer: true,
        },
        {
          x: 80,
          y: 50,
          fontSize: 24,
          maxWidth: 25,
          align: "center",
          pointer: true,
        },
      ],
    },
    style: {
      fontFamily: "Arial Black",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
      shadow: true,
    },
  },
]

// Get all templates
const getAllTemplates = () => memeTemplates

// Get template by ID
const getTemplateById = (id) => memeTemplates.find((t) => t.id === id)

// Get random templates (for suggestions)
const getRandomTemplates = (count = 6) => {
  const shuffled = [...memeTemplates].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

module.exports = {
  memeTemplates,
  getAllTemplates,
  getTemplateById,
  getRandomTemplates,
}
