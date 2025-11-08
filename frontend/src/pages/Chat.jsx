import React, { useEffect, useState } from 'react'
import io from 'socket.io-client'
import axios from 'axios'
import ChatWindow from '../components/ChatWindow'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Chat() {
  const [socket, setSocket] = useState(null)
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const s = io(API, { auth: { token } })
    console.log("Token being sent:", token)
    s.on('connect_error', (err) => {
      console.error('socket error', err)
      if (err.message === 'Authentication error') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    })
    s.on('message', (msg) => {
      setMessages((m) => [...m, msg])
    })
    setSocket(s)
    setMe({ token })
    return () => s.close()
  }, [])

  // Load initial contact list (all users)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${API}/api/users/search?q=`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUsers(res.data.filter((u) => u.username))
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  async function loadMessages(withUserId) {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${API}/api/messages?with=${withUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setMessages(res.data)
  }

  async function selectUser(u) {
    setSelectedUser(u)
    await loadMessages(u._id)
  }

  // Handle user search
  async function handleSearch(e) {
    const value = e.target.value
    setSearch(value)
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get(
        `${API}/api/users/search?q=${encodeURIComponent(value)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      setSearchResults(res.data)
    } catch (err) {
      console.error('Search error', err)
    }
  }

  const displayList = search ? searchResults : users

  return (
    <div className="chat-area">
      <aside className="contacts">
        <h3>Contacts</h3>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={handleSearch}
          style={{ width: '90%', margin: '8px 0', padding: '5px' }}
        />
        {displayList.length === 0 && <div>No users found</div>}
        {displayList.map((u) => (
          <div
            key={u._id}
            className="contact"
            onClick={() => selectUser(u)}
            style={{
              cursor: 'pointer',
              background: selectedUser?._id === u._id ? '#eef' : 'transparent',
            }}
          >
            {u.username}
          </div>
        ))}
      </aside>

      <main className="conversation">
        {selectedUser ? (
          <ChatWindow
            socket={socket}
            me={me}
            other={selectedUser}
            messages={messages}
            setMessages={setMessages}
            reloadMessages={() => loadMessages(selectedUser._id)}
          />
        ) : (
          <div className="placeholder">Select or search a user to chat</div>
        )}
      </main>
    </div>
  )
}
