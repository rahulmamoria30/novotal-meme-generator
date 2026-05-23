import { create } from "zustand"
import { nanoid } from "nanoid"

// Generate a persistent session ID for the user
const getSessionId = () => {
  let sessionId = localStorage.getItem("meme-session-id")
  if (!sessionId) {
    sessionId = nanoid()
    localStorage.setItem("meme-session-id", sessionId)
  }
  return sessionId
}

export const useMemeStore = create((set, get) => ({
  // Session
  sessionId: getSessionId(),

  // Current workflow state
  step: "upload", // upload | suggest | pick | edit | share

  // Uploaded image
  uploadedImage: null,
  uploadedImageUrl: null,

  // User prompt for meme direction
  userPrompt: "",

  // AI Suggestions
  suggestions: [],
  isLoadingSuggestions: false,
  suggestionsError: null,
  draftId: null,

  // Selected suggestion/template
  selectedSuggestion: null,
  selectedTemplate: null,

  // Editor state
  editorTexts: [],
  editorConfig: {},

  // Saved meme
  savedMeme: null,
  shareUrl: null,

  // Templates
  templates: [],

  // Actions
  setStep: (step) => set({ step }),

  setUserPrompt: (prompt) => set({ userPrompt: prompt }),

  setUploadedImage: (image, imageUrl) =>
    set({
      uploadedImage: image,
      uploadedImageUrl: imageUrl,
      step: "suggest",
      suggestions: [],
      selectedSuggestion: null,
    }),

  setSuggestions: (suggestions, draftId = null) =>
    set({
      suggestions,
      draftId,
      isLoadingSuggestions: false,
      step: "pick",
    }),

  setLoadingSuggestions: (loading) => set({ isLoadingSuggestions: loading }),

  setSuggestionsError: (error) =>
    set({
      suggestionsError: error,
      isLoadingSuggestions: false,
    }),

  selectSuggestion: (suggestion) =>
    set({
      selectedSuggestion: suggestion,
      selectedTemplate: suggestion.template,
      editorTexts: [
        {
          id: "top",
          text: suggestion.topText || "",
          ...suggestion.template?.layout?.topText,
        },
        {
          id: "bottom",
          text: suggestion.bottomText || "",
          ...suggestion.template?.layout?.bottomText,
        },
      ].filter((t) => t.text),
      step: "edit",
    }),

  updateEditorText: (id, text) =>
    set((state) => ({
      editorTexts: state.editorTexts.map((t) =>
        t.id === id ? { ...t, text } : t
      ),
    })),

  updateEditorTextPosition: (id, x, y) =>
    set((state) => ({
      editorTexts: state.editorTexts.map((t) =>
        t.id === id ? { ...t, x, y } : t
      ),
    })),

  setTemplates: (templates) => set({ templates }),

  setSavedMeme: (meme, shareUrl) =>
    set({
      savedMeme: meme,
      shareUrl,
      step: "share",
    }),

  resetToUpload: () =>
    set({
      step: "upload",
      uploadedImage: null,
      uploadedImageUrl: null,
      userPrompt: "",
      suggestions: [],
      draftId: null,
      selectedSuggestion: null,
      selectedTemplate: null,
      editorTexts: [],
      savedMeme: null,
      shareUrl: null,
    }),

  // For editing - change template while keeping texts
  changeTemplate: (template) =>
    set((state) => ({
      selectedTemplate: template,
      editorTexts: [
        {
          id: "top",
          text: state.editorTexts[0]?.text || "",
          ...template?.layout?.topText,
        },
        {
          id: "bottom",
          text: state.editorTexts[1]?.text || "",
          ...template?.layout?.bottomText,
        },
      ],
    })),
}))

export default useMemeStore
