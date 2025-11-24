// IndexedDB utility for storing large query results

const DB_NAME = 'SAP_B1_QueryResults'
const DB_VERSION = 1
const STORE_NAME = 'queryResults'

interface QueryResultData {
  id: string
  queryResult: any
  originalQuery: string
  selectedChartType: string
  timestamp: number
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

export async function saveQueryResult(
  queryResult: any,
  originalQuery: string,
  selectedChartType: string
): Promise<string> {
  try {
    const db = await openDB()
    const id = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const data: QueryResultData = {
      id,
      queryResult,
      originalQuery,
      selectedChartType,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(data)

      request.onsuccess = () => {
        console.log(`Saved query result to IndexedDB with ID: ${id}`)
        resolve(id)
      }

      request.onerror = () => {
        reject(new Error('Failed to save query result to IndexedDB'))
      }
    })
  } catch (error) {
    console.error('Error saving to IndexedDB:', error)
    throw error
  }
}

export async function loadQueryResult(id: string): Promise<QueryResultData | null> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          console.log(`Loaded query result from IndexedDB: ${result.queryResult.data?.length || 0} records`)
        }
        resolve(result || null)
      }

      request.onerror = () => {
        reject(new Error('Failed to load query result from IndexedDB'))
      }
    })
  } catch (error) {
    console.error('Error loading from IndexedDB:', error)
    throw error
  }
}

export async function deleteQueryResult(id: string): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`Deleted query result from IndexedDB: ${id}`)
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to delete query result from IndexedDB'))
      }
    })
  } catch (error) {
    console.error('Error deleting from IndexedDB:', error)
    throw error
  }
}

// Clean up old query results (older than 1 hour)
export async function cleanupOldResults(): Promise<void> {
  try {
    const db = await openDB()
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('timestamp')
      const range = IDBKeyRange.upperBound(oneHourAgo)
      const request = index.openCursor(range)

      request.onsuccess = (event: any) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to cleanup old results'))
      }
    })
  } catch (error) {
    console.error('Error cleaning up old results:', error)
    // Don't throw - cleanup is not critical
  }
}

// Clean up sessionStorage entries to free up space
export function cleanupSessionStorage(): void {
  try {
    // Get all keys that start with 'queryResult_'
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.startsWith('queryResult_') || key === 'queryResultId')) {
        keysToRemove.push(key)
      }
    }
    
    // Remove old entries (keep only the most recent one if it exists)
    if (keysToRemove.length > 0) {
      // Sort by timestamp if possible, or just remove all except the current one
      const currentId = sessionStorage.getItem('queryResultId')
      keysToRemove.forEach(key => {
        // Keep the current result, remove others
        if (key !== 'queryResultId' && key !== `queryResult_${currentId}`) {
          try {
            sessionStorage.removeItem(key)
            console.log(`Cleaned up sessionStorage entry: ${key}`)
          } catch (e) {
            console.warn(`Failed to remove sessionStorage key ${key}:`, e)
          }
        }
      })
    }
  } catch (error) {
    console.error('Error cleaning up sessionStorage:', error)
  }
}

// Safely set item in sessionStorage with quota error handling
export function safeSetSessionStorage(key: string, value: string): boolean {
  try {
    // Try to set the item
    sessionStorage.setItem(key, value)
    return true
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn(`SessionStorage quota exceeded for key ${key}, attempting cleanup...`)
      // Try to clean up old entries
      cleanupSessionStorage()
      try {
        // Try again after cleanup
        sessionStorage.setItem(key, value)
        return true
      } catch (retryError: any) {
        console.error(`Failed to set sessionStorage after cleanup:`, retryError)
        // If still failing, clear all query result entries and try once more
        try {
          const allKeys: string[] = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i)
            if (k && (k.startsWith('queryResult_') || k === 'queryResultId')) {
              allKeys.push(k)
            }
          }
          allKeys.forEach(k => sessionStorage.removeItem(k))
          sessionStorage.setItem(key, value)
          return true
        } catch (finalError) {
          console.error(`Failed to set sessionStorage even after full cleanup:`, finalError)
          return false
        }
      }
    } else {
      console.error(`Error setting sessionStorage for key ${key}:`, error)
      return false
    }
  }
}

