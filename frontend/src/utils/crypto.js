// Web Crypto utilities for RSA-AES hybrid encryption and decryption.
// Exports:
// - generateRsaKeyPairAndExport() -> { publicKeyPem, privateKeyPem }
// - encryptPrivateKeyWithPassword(privateKeyPem, password, username) -> { iv, ct } (both base64)
// - decryptPrivateKeyEncrypted(privateKeyEncryptedObj, password, username) -> privateKeyPem
// - importPrivateKeyFromPem(privateKeyPem) -> CryptoKey (private)
// - encryptMessageWithRemotePublicKey(remotePublicKeyPem, plaintext) -> { ciphertext, iv, keyEncrypted }
// - decryptMessageWithPrivateKey(privateCryptoKey, payload) -> plaintext

function arrayBufferToBase64(buffer){
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i=0;i<bytes.byteLength;i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
function base64ToArrayBuffer(b64){
  const bin = atob(b64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// RSA key pair generation and export PEMs
export async function generateRsaKeyPairAndExport(){
  const keyPair = await window.crypto.subtle.generateKey({
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1,0,1]),
    hash: 'SHA-256'
  }, true, ['encrypt','decrypt'])

  const pub = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
  const priv = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${arrayBufferToBase64(pub)}\n-----END PUBLIC KEY-----`
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${arrayBufferToBase64(priv)}\n-----END PRIVATE KEY-----`
  return { publicKeyPem, privateKeyPem }
}

// Encrypt private key PEM with password-derived AES key (PBKDF2)
export async function encryptPrivateKeyWithPassword(privateKeyPem, password, username){
  const salt = new TextEncoder().encode(username || 'salt')
  const baseKey = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey'])
  const aesKey = await window.crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, baseKey, { name:'AES-GCM', length: 256 }, true, ['encrypt','decrypt'])
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const ct = await window.crypto.subtle.encrypt({ name:'AES-GCM', iv }, aesKey, new TextEncoder().encode(privateKeyPem))
  return { iv: arrayBufferToBase64(iv), ct: arrayBufferToBase64(ct) }
}

// Decrypt the encrypted private key object { iv, ct } using password & username as salt
export async function decryptPrivateKeyEncrypted(privateKeyEncryptedObj, password, username){
  const iv = base64ToArrayBuffer(privateKeyEncryptedObj.iv)
  const ct = base64ToArrayBuffer(privateKeyEncryptedObj.ct)
  const salt = new TextEncoder().encode(username || 'salt')
  const baseKey = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey'])
  const aesKey = await window.crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, baseKey, { name:'AES-GCM', length: 256 }, true, ['decrypt'])
  const decryptedBuf = await window.crypto.subtle.decrypt({ name:'AES-GCM', iv: new Uint8Array(iv) }, aesKey, ct)
  return new TextDecoder().decode(decryptedBuf)
}

// Import private key PEM to CryptoKey
export async function importPrivateKeyFromPem(privateKeyPem){
  const pemStr = privateKeyPem.replace(/-----.*-----/g,'').replace(/\s+/g,'')
  const privBuf = base64ToArrayBuffer(pemStr)
  const cryptoKey = await window.crypto.subtle.importKey('pkcs8', privBuf, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt'])
  return cryptoKey
}

// Hybrid encryption: AES-GCM message + RSA-OAEP encrypt AES key
export async function encryptMessageWithRemotePublicKey(remotePublicKeyPem, plaintext){
  const pem = remotePublicKeyPem.replace(/-----.*-----/g,'').replace(/\s+/g,'')
  const pubBuf = base64ToArrayBuffer(pem)
  const pubKey = await window.crypto.subtle.importKey('spki', pubBuf, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])

  // generate AES key
  const aesKey = await window.crypto.subtle.generateKey({ name:'AES-GCM', length: 256 }, true, ['encrypt','decrypt'])
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder().encode(plaintext)
  const ciphertextBuf = await window.crypto.subtle.encrypt({ name:'AES-GCM', iv }, aesKey, enc)
  const ciphertext = arrayBufferToBase64(ciphertextBuf)
  const ivB64 = arrayBufferToBase64(iv)

  // export raw AES key and encrypt with RSA-OAEP
  const rawAes = await window.crypto.subtle.exportKey('raw', aesKey)
  const keyEncryptedBuf = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, rawAes)
  const keyEncrypted = arrayBufferToBase64(keyEncryptedBuf)

  return { ciphertext, iv: ivB64, keyEncrypted }
}

// Decrypt hybrid payload with private key CryptoKey
export async function decryptMessageWithPrivateKey(privateCryptoKey, payload){
  // payload: { ciphertext: base64, iv: base64, keyEncrypted: base64 }
  const keyEncryptedBuf = base64ToArrayBuffer(payload.keyEncrypted)
  const rawAes = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateCryptoKey, keyEncryptedBuf)
  const aesKey = await window.crypto.subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, ['decrypt'])
  const iv = base64ToArrayBuffer(payload.iv)
  const cipherBuf = base64ToArrayBuffer(payload.ciphertext)
  const plainBuf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, aesKey, cipherBuf)
  return new TextDecoder().decode(plainBuf)
}
