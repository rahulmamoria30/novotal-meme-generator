const { memeTemplates } = require("./templates")

// Best-effort JSON extraction: handles raw JSON, markdown ```json fences,
// and stray prose around a JSON object. Returns the parsed object or null.
function extractJson(text) {
  if (!text || typeof text !== "string") return null

  const tryParse = (s) => {
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }

  // 1. Direct parse
  let result = tryParse(text.trim())
  if (result) return result

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) {
    result = tryParse(fenceMatch[1].trim())
    if (result) return result
  }

  // 3. Grab the first {...} balanced-ish block
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first !== -1 && last > first) {
    result = tryParse(text.slice(first, last + 1))
    if (result) return result
  }

  return null
}

// AI utility to analyze an image and generate meme caption suggestions using OpenRouter API and a set of predefined templates.
/**
 * Analyze image and generate meme suggestions using OpenRouter API
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} mimeType - Image MIME type
 * @param {string} userPrompt - Optional user context/direction for the meme
 * @returns {Promise<Array>} Array of meme suggestions
 */
async function generateMemeSuggestions(
  imageBase64,
  mimeType = "image/jpeg",
  userPrompt = ""
) {
  const templates = memeTemplates

  const templateDescriptions = templates
    .map((t) => `- ${t.id}: ${t.name} - ${t.description}`)
    .join("\n")

  // Build the prompt based on whether user provided text
  let userContext = ""
  let instructions = ""

  if (userPrompt && userPrompt.trim()) {
    userContext = `
USER'S TEXT: "${userPrompt}"

CRITICAL: The user has provided their own text/idea! Your job is to:
1. USE THEIR TEXT DIRECTLY in the meme captions (as top or bottom text)
2. ENHANCE IT to make it funnier while keeping their core message
3. Create variations that INCORPORATE their words
4. Make it work with the image - add visual humor
`
    instructions = `
REQUIREMENTS FOR USER-PROVIDED TEXT:
- Suggestions 1-2: Use their EXACT text (or very close) as the main caption, add complementary text
- Suggestions 3-4: Enhance/remix their text to make it funnier (keep the spirit)
- Suggestions 5-6: Creative variations inspired by their theme

The user's text MUST be recognizable in at least 4 of the 6 suggestions!
`
  } else {
    instructions = `
Generate 6 completely original meme captions based on what you see in the image.
Use internet humor, cultural references, and relatable situations.
`
  }

  const prompt = `You are a meme expert and comedy writer. Analyze this image and create exactly 6 meme suggestions.
${userContext}
Available meme templates:
${templateDescriptions}

${instructions}

For each suggestion:
1. Pick the most fitting template for the joke
2. Write captions that are ACTUALLY FUNNY - use wordplay, irony, unexpected twists
3. Connect the caption to what's VISUALLY in the image
4. Be edgy but not offensive - aim for viral-worthy humor

IMPORTANT: The humor should come from the CONTRAST or CONNECTION between the image and the text. Generic descriptions are NOT funny.

Respond with JSON:
{
  "suggestions": [
    {
      "templateId": "template-id-here",
      "name": "A short, catchy label for this meme (e.g. 'POV: Monday morning', 'When the code finally works') — 2-5 words, no quotes",
      "topText": "Top caption text",
      "bottomText": "Bottom caption text (if template supports it)",
      "humor_type": "irony|absurdist|relatable|observational|dark|wholesome",
      "explanation": "Brief explanation of why this is funny"
    }
  ]
}

CRITICAL: You MUST return exactly 6 suggestions. Pick 6 different templates from the list above (no repeats), and vary the humor style across them. Be creative and make people laugh.

Also keep captions SHORT (under 8 words per line) so they stay readable on small previews.`

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server")
  }

  const imageDataUrl = `data:${mimeType};base64,${imageBase64}`

  console.log("Calling OpenRouter API for meme suggestions...")
  console.log("User prompt:", userPrompt || "(none)")

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "Novotal Meme Generator",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "~anthropic/claude-sonnet-latest",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    }
  )

  console.log("OpenRouter response status:", response.status)

  if (!response.ok) {
    const errorBody = await response.text()
    let errorMessage = response.statusText
    try {
      const errorJson = JSON.parse(errorBody)
      errorMessage = errorJson.error?.message || errorMessage
    } catch {
      errorMessage = errorBody || errorMessage
    }
    console.error("OpenRouter API error:", errorMessage)
    throw new Error(
      `OpenRouter API error (${response.status}): ${errorMessage}`
    )
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("LLM returned an empty response")
  }

  const parsed = extractJson(content)
  if (!parsed) {
    console.error("Could not parse JSON from AI response. Raw content:", content)
    throw new Error("Failed to parse meme suggestions from AI response")
  }
  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
    throw new Error("LLM returned no meme suggestions")
  }

  console.log("Parsed", parsed.suggestions.length, "meme suggestions")
  return parsed.suggestions.map((suggestion) => ({
    ...suggestion,
    template:
      templates.find((t) => t.id === suggestion.templateId) || templates[0],
  }))
}

module.exports = {
  generateMemeSuggestions,
}
