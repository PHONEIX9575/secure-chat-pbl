import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Register from './pages/Register'
import Login from './pages/Login'
import Chat from './pages/Chat'

export default function App(){
  return (
    <BrowserRouter>
      <nav style={{ padding: 10, borderBottom: '1px solid #eee' }}>
        <Link to="/register" style={{ marginRight: 8 }}>Register</Link>
        <Link to="/login" style={{ marginRight: 8 }}>Login</Link>
        <Link to="/chat">Chat</Link>
      </nav>

      <Routes>
        <Route path="/register" element={<Register/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/chat" element={<Chat/>} />
        <Route index element={<Login/>} />
      </Routes>
    </BrowserRouter>
  )
}
