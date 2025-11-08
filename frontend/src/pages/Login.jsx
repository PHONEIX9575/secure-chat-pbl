import React, { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    try{
      const res = await axios.post(`${API}/api/auth/login`, { username, password })
      localStorage.setItem('token', res.data.token)
      setMsg('Logged in — redirecting...')
      window.location.href = '/chat'
    }catch(err){
      console.error(err)
      setMsg(err?.response?.data?.error || err.message)
    }
  }

  return (
    <div className="page">
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="card">
        <label>Username</label>
        <input placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} required />
        <label>Password</label>
        <input type="password" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div style={{ marginTop: 8 }}>
          <button type="submit">Login</button>
        </div>
        <div className="msg">{msg}</div>
      </form>
    </div>
  )
}
