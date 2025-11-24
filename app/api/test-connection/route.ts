import { NextRequest, NextResponse } from 'next/server'
import { getCachedSession, cacheSession } from '@/lib/session-manager'

interface SAPB1Settings {
  sapServer: string
  companyDB: string
  userName: string
  password: string
}

async function testSAPB1Connection(settings: SAPB1Settings): Promise<{ success: boolean; message: string; sessionId?: string }> {
  try {
    // Validate inputs
    if (!settings.sapServer || !settings.companyDB || !settings.userName || !settings.password) {
      return {
        success: false,
        message: 'Please fill in all SAP B1 connection fields',
      }
    }

    // Clean up server URL (remove trailing slash if present)
    let serverUrl = settings.sapServer.trim().replace(/\/$/, '')
    
    // Remove /b1s/v1/Login if user included it in the URL
    if (serverUrl.includes('/b1s/v1/Login')) {
      serverUrl = serverUrl.replace('/b1s/v1/Login', '').replace(/\/$/, '')
    }
    if (serverUrl.includes('/b1s/v1')) {
      serverUrl = serverUrl.replace('/b1s/v1', '').replace(/\/$/, '')
    }
    
    const loginUrl = `${serverUrl}/b1s/v1/Login`
    
    console.log('Testing SAP B1 Connection:', {
      url: loginUrl,
      companyDB: settings.companyDB,
      userName: settings.userName,
    })
    
    // Use https module directly to handle SSL certificates properly
    const https = require('https')
    const { URL } = require('url')
    
    const urlObj = new URL(loginUrl)
    const isHttps = urlObj.protocol === 'https:'
    
    // Create a custom agent that accepts self-signed certificates
    // This is needed because Node.js fetch is stricter than Postman
    const agent = isHttps ? new https.Agent({
      rejectUnauthorized: false, // Accept self-signed certificates (like Postman does)
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
    
    console.log('SAP B1 Response Status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Connection failed: ${response.status} ${response.statusText}`
      
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error) {
          if (errorData.error.message && errorData.error.message.value) {
            errorMessage = errorData.error.message.value
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message
          } else if (errorData.error.code) {
            errorMessage = `Error ${errorData.error.code}: ${errorData.error.message || 'Unknown error'}`
          }
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // If parsing fails, use the text as is
        if (errorText && errorText.trim()) {
          errorMessage = `Connection failed: ${errorText}`
        }
      }

      return {
        success: false,
        message: errorMessage,
      }
    }

    const data = await response.json()
    const sessionId = data.SessionId

    if (!sessionId) {
      return {
        success: false,
        message: 'Connection successful but no session ID received',
      }
    }

    // Cache the session for future use (30 minutes)
    cacheSession(settings, sessionId)

    // Login was successful - connection is working!
    // No need to validate session further since login itself proves the connection works
    return {
      success: true,
      message: 'Connection successful! SAP B1 Service Layer is accessible.',
      sessionId,
    }
  } catch (error: any) {
    let errorMessage = 'Failed to connect to SAP B1 Service Layer'
    
    if (error.message) {
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot reach the server. Please check the Server URL and ensure the Service Layer is running.'
      } else if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('cert')) {
        errorMessage = 'SSL certificate error. Please verify the server certificate or use HTTPS. If this is a self-signed certificate, you may need to configure the server to accept it.'
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = 'Cannot resolve the server hostname. Please check the Server URL.'
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check the Server URL and ensure the Service Layer is accessible.'
      } else {
        errorMessage = `Connection error: ${error.message}`
      }
    }

    console.error('SAP B1 Connection Test Error:', error)

    return {
      success: false,
      message: errorMessage,
    }
  }
}

// Handle OPTIONS for CORS preflight
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
  try {
    const body = await request.json()
    const { sapServer, companyDB, userName, password } = body

    if (!sapServer || !companyDB || !userName || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Clean up server URL (remove /b1s/v1/Login if user included it, and trailing slashes)
    let serverUrl = sapServer.trim().replace(/\/$/, '')
    
    // Remove /b1s/v1/Login if user included it in the URL
    if (serverUrl.includes('/b1s/v1/Login')) {
      serverUrl = serverUrl.replace('/b1s/v1/Login', '').replace(/\/$/, '')
    }
    if (serverUrl.includes('/b1s/v1')) {
      serverUrl = serverUrl.replace('/b1s/v1', '').replace(/\/$/, '')
    }

    const result = await testSAPB1Connection({
      sapServer: serverUrl,
      companyDB,
      userName,
      password,
    })

    // Always return 200, but include success: false in the response body for failed connections
    // This way the frontend can always parse the JSON response
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'An error occurred while testing the connection',
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

