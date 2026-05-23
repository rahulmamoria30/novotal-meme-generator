import { io } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

let socket = null

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id)
    })

    socket.on("disconnect", () => {
      console.log("Socket disconnected")
    })

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
    })
  }
  return socket
}

export const getSocket = () => {
  if (!socket) {
    return initSocket()
  }
  return socket
}

export const joinMemeRoom = (memeId) => {
  const s = getSocket()
  s.emit("join-meme", memeId)
}

export const leaveMemeRoom = (memeId) => {
  const s = getSocket()
  s.emit("leave-meme", memeId)
}

export const onReactionUpdate = (callback) => {
  const s = getSocket()
  s.on("reaction-update", callback)
  return () => s.off("reaction-update", callback)
}

export default {
  initSocket,
  getSocket,
  joinMemeRoom,
  leaveMemeRoom,
  onReactionUpdate,
}
