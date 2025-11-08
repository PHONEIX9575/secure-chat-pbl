import React, { useState } from 'react'
import { encryptMessageWithRemotePublicKey } from '../utils/crypto'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function MessageInput({ socket, other, setMessages }) {
  const [text, setText] = useState('')
  const [algo, setAlgo] = useState('AES')
  const [sending, setSending] = useState(false)

  async function send(){
    if (!text) return
    setSending(true)
    try{
      // fetch recipient public key
      const res = await fetch(`${API}/api/auth/${other._id}/publicKey`)
      const data = await res.json()
      if (!data.publicKey) throw new Error('Recipient public key not available')

      const payload = await encryptMessageWithRemotePublicKey(data.publicKey, text)
      socket.emit('send_message', { to: other._id, algorithm: 'AES', ciphertext: payload.ciphertext, metadata: { iv: payload.iv, keyEncrypted: payload.keyEncrypted } })
      setMessages(m => [...m, { _id: `local-${Date.now()}`, from: 'me', to: other._id, algorithm: 'AES', ciphertext: payload.ciphertext, metadata:{ iv: payload.iv }, timestamp: new Date(), plaintext: text }])
      setText('')
    }catch(err){
      console.error(err)
      alert('Send failed: ' + (err?.message || err))
    }finally{
      setSending(false)
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <select value={algo} onChange={e=>setAlgo(e.target.value)}>
          <option>AES</option>
          <option>RSA</option>
          <option>DES</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap:8 }}>
        <input value={text} onChange={e=>setText(e.target.value)} style={{ flex:1 }} placeholder="Type your message..." />
        <button onClick={send} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
      </div>
    </div>
  )
}
