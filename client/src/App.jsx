import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { useEffect } from "react"
import useMemeStore from "./store/memeStore"
import ImageUpload from "./components/ImageUpload"
import SuggestionGrid from "./components/SuggestionGrid"
import MemeEditor from "./components/MemeEditor"
import SharePage from "./components/SharePage"
import ShareSuccess from "./components/ShareSuccess"
import { initSocket } from "./utils/socket"
import "./App.css"

// Main meme creation workflow
function MemeCreator() {
  const { step } = useMemeStore()

  return (
    <div className="meme-creator">
      {step === "upload" && <ImageUpload />}
      {(step === "suggest" || step === "pick") && <SuggestionGrid />}
      {step === "edit" && <MemeEditor />}
      {step === "share" && <ShareSuccess />}
    </div>
  )
}

function App() {
  useEffect(() => {
    initSocket()
  }, [])

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <a href="/" className="logo">
              <div className="logo-icon">
                <span>🎭</span>
              </div>
              <div className="logo-text-group">
                <span className="logo-text">MemeForge</span>
                <span className="logo-tagline">AI-Powered Memes</span>
              </div>
            </a>

            <nav className="header-nav">
              <a href="/" className="nav-link active">
                <span className="nav-icon">✨</span>
                Create
              </a>
              <div className="nav-badge">
                <span className="badge-dot"></span>
                Powered by Claude
              </div>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<MemeCreator />} />
            <Route path="/meme/:id" element={<SharePage />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>Made with 🔥 for Novotal Hackathon 2026</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
