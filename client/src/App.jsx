import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom"
import { useEffect } from "react"
import useMemeStore from "./store/memeStore"
import ImageUpload from "./components/ImageUpload"
import SuggestionGrid from "./components/SuggestionGrid"
import MemeEditor from "./components/MemeEditor"
import SharePage from "./components/SharePage"
import ShareSuccess from "./components/ShareSuccess"
import WallPage from "./pages/WallPage"
import { initSocket } from "./utils/socket"
import "./App.css"

// Route guards: redirect to / if required state is missing
function TemplatesRoute() {
  const { uploadedImage, isLoadingSuggestions } = useMemeStore()
  if (!uploadedImage && !isLoadingSuggestions) return <Navigate to="/" replace />
  return <SuggestionGrid />
}

function EditRoute() {
  const { selectedTemplate, uploadedImage } = useMemeStore()
  if (!selectedTemplate || !uploadedImage) return <Navigate to="/" replace />
  return <MemeEditor />
}

function ShareRoute() {
  const { savedMeme } = useMemeStore()
  if (!savedMeme) return <Navigate to="/" replace />
  return <ShareSuccess />
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
                <span>🫠</span>
              </div>
              <div className="logo-text-group">
                <span className="logo-text">MemeCook</span>
                <span className="logo-tagline">let the ai cook fr</span>
              </div>
            </a>

            <nav className="header-nav">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <span className="nav-icon">✨</span>
                Create
              </NavLink>
              <NavLink
                to="/wall"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <span className="nav-icon">🧱</span>
                Wall
              </NavLink>
              <div className="nav-badge">
                <span className="badge-dot"></span>
                claude cooking
              </div>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<ImageUpload />} />
            <Route path="/templates" element={<TemplatesRoute />} />
            <Route path="/edit" element={<EditRoute />} />
            <Route path="/share" element={<ShareRoute />} />
            <Route path="/wall" element={<WallPage />} />
            <Route path="/meme/:id" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>cooked up at novotal hackathon 2026 · no cap 🔥</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
