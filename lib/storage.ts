// Utility for managing session storage with expiration (30 minutes)

const STORAGE_KEY = 'sap_b1_settings'
const EXPIRATION_TIME = 30 * 60 * 1000 // 30 minutes in milliseconds

export interface StoredSettings {
  settings: {
    sapServer: string
    companyDB: string
    userName: string
    password: string
    openaiApiKey: string
    openaiModel: string
  }
  timestamp: number
  loginSuccess: boolean // Track if login was successful
}

export function saveSettings(settings: any, loginSuccess: boolean = false): void {
  if (typeof window === 'undefined') return
  
  const data: StoredSettings = {
    settings,
    timestamp: Date.now(),
    loginSuccess,
  }
  
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save settings to session storage:', error)
  }
}

export function loadSettings(): { settings: any; loginSuccess: boolean } | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const data: StoredSettings = JSON.parse(stored)
    const now = Date.now()
    
    // Check if expired (30 minutes)
    if (now - data.timestamp > EXPIRATION_TIME) {
      // Clear expired data
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    
    return {
      settings: data.settings,
      loginSuccess: data.loginSuccess,
    }
  } catch (error) {
    console.error('Failed to load settings from session storage:', error)
    return null
  }
}

export function clearSettings(): void {
  if (typeof window === 'undefined') return
  
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear settings from session storage:', error)
  }
}

export function updateLoginStatus(loginSuccess: boolean): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return
    
    const data: StoredSettings = JSON.parse(stored)
    data.loginSuccess = loginSuccess
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to update login status:', error)
  }
}

