// Session manager for SAP B1 sessions with 30-minute expiration

interface SAPB1Settings {
  sapServer: string
  companyDB: string
  userName: string
  password: string
}

interface SessionCacheEntry {
  sessionId: string
  expiresAt: number // Timestamp when session expires
  createdAt: number // Timestamp when session was created
}

// In-memory session cache (Map<connectionKey, SessionCacheEntry>)
const sessionCache = new Map<string, SessionCacheEntry>()

// Session expiration time: 30 minutes
const SESSION_EXPIRATION_TIME = 30 * 60 * 1000 // 30 minutes in milliseconds

// Generate a unique key for a connection based on settings
export function getConnectionKey(settings: SAPB1Settings): string {
  // Normalize server URL for consistent key generation
  let serverUrl = settings.sapServer.trim().replace(/\/$/, '')
  if (serverUrl.includes('/b1s/v1/Login')) {
    serverUrl = serverUrl.replace('/b1s/v1/Login', '').replace(/\/$/, '')
  }
  if (serverUrl.includes('/b1s/v1')) {
    serverUrl = serverUrl.replace('/b1s/v1', '').replace(/\/$/, '')
  }
  
  // Create unique key from connection parameters
  return `${serverUrl}|${settings.companyDB}|${settings.userName}`
}

// Get valid session from cache or return null
export function getCachedSession(settings: SAPB1Settings): string | null {
  const key = getConnectionKey(settings)
  const cached = sessionCache.get(key)
  
  if (!cached) {
    return null
  }
  
  const now = Date.now()
  
  // Check if session is expired
  if (now >= cached.expiresAt) {
    // Session expired, remove from cache
    sessionCache.delete(key)
    console.log(`[SessionManager] Session expired for key: ${key}`)
    return null
  }
  
  // Session is still valid
  const timeRemaining = Math.floor((cached.expiresAt - now) / 1000 / 60) // minutes
  console.log(`[SessionManager] Reusing cached session for key: ${key}, expires in ${timeRemaining} minutes`)
  return cached.sessionId
}

// Store session in cache
export function cacheSession(settings: SAPB1Settings, sessionId: string): void {
  const key = getConnectionKey(settings)
  const now = Date.now()
  
  const entry: SessionCacheEntry = {
    sessionId,
    createdAt: now,
    expiresAt: now + SESSION_EXPIRATION_TIME,
  }
  
  sessionCache.set(key, entry)
  console.log(`[SessionManager] Cached session for key: ${key}, expires in 30 minutes`)
}

// Remove session from cache (e.g., when it becomes invalid)
export function removeSession(settings: SAPB1Settings): void {
  const key = getConnectionKey(settings)
  const removed = sessionCache.delete(key)
  if (removed) {
    console.log(`[SessionManager] Removed session for key: ${key}`)
  }
}

// Clean up expired sessions (called periodically)
export function cleanupExpiredSessions(): void {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, entry] of sessionCache.entries()) {
    if (now >= entry.expiresAt) {
      sessionCache.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`[SessionManager] Cleaned up ${cleaned} expired session(s)`)
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000) // Every 5 minutes
}

