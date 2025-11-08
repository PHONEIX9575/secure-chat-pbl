import React, { useEffect, useState } from 'react'
import MessageInput from './MessageInput'
import { decryptPrivateKeyEncrypted, importPrivateKeyFromPem, decryptMessageWithPrivateKey } from '../utils/crypto'
import axios from 'axios'

export default function ChatWindow({ socket, me, other, messages, setMessages, reloadMessages }) {
  const [decryptedPrivateKeyPem, setDecryptedPrivateKeyPem] = useState(null)
  const [privateCryptoKey, setPrivateCryptoKey] = useState(null)
  const [loadingKey, setLoadingKey] = useState(false)
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  useEffect(()=>{
    // attempt to fetch and decrypt user's encrypted private key (if user still logged in)
    // NOTE: this flow requires that the server stores privateKeyEncrypted and you can fetch it.
    // We will prompt the user for their password to decrypt locally.
  }, [])

  async function promptAndLoadPrivateKey() {
    try{
      setLoadingKey(true)
      const password = prompt('Enter your account password to unlock your private key (used locally only):')
      if (!password) { setLoadingKey(false); return }
      const token = localStorage.getItem('token')
      // fetch current user id via token decode is not done here — we'll call /api/auth/me? (not implemented)
      // Instead, we rely on a simple endpoint: GET /api/auth/mePrivate which returns privateKeyEncrypted for the authenticated user.
      const res = await axios.get(`${API}/api/auth/mePrivate`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      const privateKeyEncryptedObj = res.data.privateKeyEncrypted
      // privateKeyEncryptedObj is expected: { iv: base64, ct: base64 }
      const pem = await decryptPrivateKeyEncrypted(privateKeyEncryptedObj, password, res.data.username)
      setDecryptedPrivateKeyPem(pem)
      const cryptoKey = await importPrivateKeyFromPem(pem)
      setPrivateCryptoKey(cryptoKey)
      setLoadingKey(false)
      alert('Private key unlocked locally. You can now decrypt messages.')
    }catch(err){
      console.error(err)
      setLoadingKey(false)
      alert('Failed to decrypt private key: ' + (err?.message || JSON.stringify(err)))
    }
  }

  async function decryptAll() {
    if (!privateCryptoKey) {
      alert('Unlock your private key first.')
      return
    }
    const decrypted = []
    for (const m of messages) {
      try{
        if (m.metadata?.keyEncrypted && m.ciphertext) {
          const plain = await decryptMessageWithPrivateKey(privateCryptoKey, { ciphertext: m.ciphertext, iv: m.metadata.iv, keyEncrypted: m.metadata.keyEncrypted })
          decrypted.push({ ...m, plaintext: plain })
        } else {
          // fallback: show ciphertext
          decrypted.push({ ...m, plaintext: '[no decrypt metadata]' })
        }
      }catch(err){
        decrypted.push({ ...m, plaintext: '[decrypt error]' })
      }
    }
    setMessages(decrypted)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
        <h3>Chat with {other.username}</h3>
        <div>
          <button onClick={promptAndLoadPrivateKey} disabled={loadingKey}>{loadingKey ? 'Unlocking...' : 'Unlock Private Key'}</button>
          <button onClick={decryptAll} style={{ marginLeft: 8 }}>Decrypt Messages</button>
        </div>
      </div>

      <div className="message-list">
        {messages.map(m => (
          <div key={m._id || m.timestamp} className={`message ${m.from === other._id ? 'incoming' : 'outgoing'}`}>
            <div className="meta">
              <strong>{m.from === other._id ? other.username : 'You'}</strong>
              <small>{new Date(m.timestamp).toLocaleString?.() || ''}</small>
            </div>
            <div className="body">
              <pre style={{ whiteSpace: 'pre-wrap', margin:0 }}>{m.plaintext ?? (m.ciphertext?.slice?.(0,200) || '[file]')}</pre>
            </div>
          </div>
        ))}
      </div>

      <MessageInput socket={socket} other={other} setMessages={setMessages} />
    </div>
  )
}
