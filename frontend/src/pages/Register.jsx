import React, { useState } from 'react'
import axios from 'axios'
import { generateRsaKeyPairAndExport, encryptPrivateKeyWithPassword } from '../utils/crypto'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Register(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    setMsg('Generating keys (this may take a moment)...')
    try{
      const { publicKeyPem, privateKeyPem } = await generateRsaKeyPairAndExport()
      setMsg('Encrypting private key with password...')
      const privateKeyEncrypted = await encryptPrivateKeyWithPassword(privateKeyPem, password, username)

      setMsg('Registering...')
      const res = await axios.post(`${API}/api/auth/register`, {
        username, password, publicKey: publicKeyPem, privateKeyEncrypted
      })
      localStorage.setItem('token', res.data.token)
      setMsg('Registered — redirecting to chat...')
      window.location.href = '/chat'
    }catch(err){
      console.error(err)
      setMsg(err?.response?.data?.error || err.message)
    }
  }

  return (
    <div className="page">
      <h2>Register</h2>
      <form onSubmit={onSubmit} className="card">
        <label>Username</label>
        <input placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} required />
        <label>Password</label>
        <input type="password" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div style={{ marginTop: 8 }}>
          <button type="submit">Register</button>
        </div>
        <div className="msg">{msg}</div>
      </form>
    </div>
  )
}
