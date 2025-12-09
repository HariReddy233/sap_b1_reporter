import { NextRequest, NextResponse } from 'next/server'
import { getCachedSession, cacheSession, removeSession } from '@/lib/session-manager'

interface SAPB1Settings {
  sapServer: string
  companyDB: string
  userName: string
  password: string
}

async function loginToSAPB1(settings: SAPB1Settings, forceNew: boolean = false): Promise<string | null> {
  // Check for existing valid session first (unless forcing new login)
  if (!forceNew) {
    const cachedSession = getCachedSession(settings)
    if (cachedSession) {
      return cachedSession
    }
  }
  
  // No valid cached session, create new one
  try {
    // Clean up server URL
    let serverUrl = settings.sapServer.trim().replace(/\/$/, '')
    if (serverUrl.includes('/b1s/v1/Login')) {
      serverUrl = serverUrl.replace('/b1s/v1/Login', '').replace(/\/$/, '')
    }
    if (serverUrl.includes('/b1s/v1')) {
      serverUrl = serverUrl.replace('/b1s/v1', '').replace(/\/$/, '')
    }
    
    const loginUrl = `${serverUrl}/b1s/v1/Login`
    
    // Use https module directly to handle SSL certificates properly
    const https = require('https')
    const { URL } = require('url')
    
    const urlObj = new URL(loginUrl)
    const isHttps = urlObj.protocol === 'https:'
    
    // Create a custom agent that accepts self-signed certificates
    const agent = isHttps ? new https.Agent({
      rejectUnauthorized: false, // Accept self-signed certificates
    }) : undefined
    
    // Use https module directly for better SSL control
    const makeRequest = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const requestData = JSON.stringify({
          CompanyDB: settings.companyDB,
          UserName: settings.userName,
          Password: settings.password,
        })
        
        const requestOptions: any = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestData),
          },
        }
        
        if (isHttps && agent) {
          requestOptions.agent = agent
        }
        
        const protocol = isHttps ? https : require('http')
        const req = protocol.request(requestOptions, (res: any) => {
          let data = ''
          res.on('data', (chunk: any) => {
            data += chunk
          })
          res.on('end', () => {
            const response = {
              ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              json: async () => {
                try {
                  return JSON.parse(data)
                } catch (e) {
                  throw new Error(`Failed to parse JSON: ${data}`)
                }
              },
              text: async () => data,
            }
            resolve(response)
          })
        })
        
        req.on('error', (error: any) => {
          reject(error)
        })
        
        req.write(requestData)
        req.end()
      })
    }
    
    const response = await makeRequest()

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SAP B1 Login failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const sessionId = data.SessionId || null
    
    // Cache the session if login was successful
    if (sessionId) {
      cacheSession(settings, sessionId)
    } else if (forceNew) {
      // If forcing new login but got no session, remove any cached invalid session
      removeSession(settings)
    }
    
    return sessionId
  } catch (error) {
    console.error('SAP B1 Login error:', error)
    // If login fails, remove any cached session for this connection
    removeSession(settings)
    return null
  }
}

async function fetchAnalysisData(sessionId: string, server: string, analysisType: 'SalesAnalysis' | 'PurchaseAnalysis'): Promise<any> {
  try {
    // Clean up server URL
    let serverUrl = server.trim().replace(/\/$/, '')
    if (serverUrl.includes('/b1s/v1/Login')) {
      serverUrl = serverUrl.replace('/b1s/v1/Login', '').replace(/\/$/, '')
    }
    if (serverUrl.includes('/b1s/v1')) {
      serverUrl = serverUrl.replace('/b1s/v1', '').replace(/\/$/, '')
    }
    
    const endpoint = analysisType === 'SalesAnalysis' 
      ? 'b1s/v1/sml.svc/SalesAnalysisQuery'
      : 'b1s/v1/sml.svc/PurchaseAnalysisQuery'
    const url = `${serverUrl}/${endpoint}`
    
    // Use https module directly to handle SSL certificates properly
    const https = require('https')
    const { URL } = require('url')
    
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    
    // Create a custom agent that accepts self-signed certificates
    const agent = isHttps ? new https.Agent({
      rejectUnauthorized: false,
      timeout: 30000, // 30 second timeout
      keepAlive: false,
    }) : undefined
    
    const makeRequest = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const requestOptions: any = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `B1SESSION=${sessionId}`,
          },
        }
        
        if (isHttps && agent) {
          requestOptions.agent = agent
        }
        
        const protocol = isHttps ? https : require('http')
        const req = protocol.request(requestOptions, (res: any) => {
          let data = ''
          res.on('data', (chunk: any) => {
            data += chunk
          })
          res.on('end', () => {
            const response = {
              ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              json: async () => {
                try {
                  return JSON.parse(data)
                } catch (e) {
                  throw new Error(`Failed to parse JSON: ${data}`)
                }
              },
              text: async () => data,
            }
            resolve(response)
          })
        })
        
        // Set request timeout (30 seconds)
        req.setTimeout(30000, () => {
          req.destroy()
          reject(new Error('Request timeout: Analysis query took too long'))
        })
        
        req.on('error', (error: any) => {
          reject(error)
        })
        
        req.end()
      })
    }
    
    const response = await makeRequest()

    if (!response.ok) {
      const errorText = await response.text()
      const error = new Error(`Analysis query failed: ${response.status} ${response.statusText} - ${errorText}`)
      // Add status code to error for easier detection
      ;(error as any).status = response.status
      ;(error as any).statusText = response.statusText
      throw error
    }

    const data = await response.json()
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data
    } else if (data.value && Array.isArray(data.value)) {
      return data.value
    } else if (data.d && Array.isArray(data.d)) {
      return data.d
    } else if (data.results && Array.isArray(data.results)) {
      return data.results
    }
    
    return data
  } catch (error) {
    console.error('Analysis data fetch error:', error)
    throw error
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  }
  
  try {
    const body = await request.json()
    const { settings, analysisType } = body

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { 
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!analysisType || (analysisType !== 'SalesAnalysis' && analysisType !== 'PurchaseAnalysis')) {
      return NextResponse.json({ error: 'Valid analysisType (SalesAnalysis or PurchaseAnalysis) is required' }, { 
        status: 400,
        headers: corsHeaders,
      })
    }

    // Step 1: Login to SAP B1
    const sessionId = await loginToSAPB1({
      sapServer: settings.sapServer,
      companyDB: settings.companyDB,
      userName: settings.userName,
      password: settings.password,
    })

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Failed to authenticate with SAP B1. Please check your credentials.' },
        { 
          status: 401,
          headers: corsHeaders,
        }
      )
    }

    // Step 2: Fetch analysis data
    let data: any
    try {
      data = await fetchAnalysisData(sessionId, settings.sapServer, analysisType)
    } catch (fetchError: any) {
      const errorMessage = fetchError.message || ''
      const statusCode = fetchError.status || ''
      
      // Check if error is due to invalid/expired session (401 Unauthorized)
      if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized') || 
          errorMessage.includes('Session') || errorMessage.includes('authentication')) {
        console.log('Session appears to be invalid, removing from cache and retrying with new login')
        // Remove invalid session from cache
        removeSession({
          sapServer: settings.sapServer,
          companyDB: settings.companyDB,
          userName: settings.userName,
          password: settings.password,
        })
        
        // Try to get a new session and retry the fetch
        try {
          const newSessionId = await loginToSAPB1({
            sapServer: settings.sapServer,
            companyDB: settings.companyDB,
            userName: settings.userName,
            password: settings.password,
          }, true) // Force new login
          
          if (newSessionId) {
            console.log('Retrying fetch-analysis with new session')
            data = await fetchAnalysisData(newSessionId, settings.sapServer, analysisType)
            console.log('Retry with new session successful')
          } else {
            throw new Error('Session expired and failed to create new session. Please check your credentials.')
          }
        } catch (retryError: any) {
          console.error('Retry with new session failed:', retryError)
          throw new Error(`Session expired and retry failed: ${retryError.message || 'Analysis fetch error'}`)
        }
      } else {
        // Re-throw other errors
        throw fetchError
      }
    }

    return NextResponse.json({
      success: true,
      analysisType,
      data: Array.isArray(data) ? data : [data],
      count: Array.isArray(data) ? data.length : 1
    }, {
      headers: corsHeaders,
    })
  } catch (error: any) {
    console.error('Error in fetch-analysis:', error)
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while fetching analysis data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

