import { NextRequest, NextResponse } from 'next/server'

interface OpenAISettings {
  openaiApiKey: string
  openaiModel: string
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

async function generateQueryFromQuestion(
  question: string,
  data: any[],
  analysisType: string,
  openaiSettings: OpenAISettings
): Promise<{ filterFunction: string; response: string }> {
  try {
    // Sample first few records to understand data structure
    const sampleSize = Math.min(5, data.length)
    const sample = data.slice(0, sampleSize)
    
    // Extract field information
    const fields = data.length > 0 && typeof data[0] === 'object' && data[0] !== null
      ? Object.keys(data[0])
      : []
    
    // Identify field types
    const numericFields: string[] = []
    const dateFields: string[] = []
    const categoricalFields: string[] = []
    
    sample.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        Object.entries(item).forEach(([key, value]) => {
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
            if (!numericFields.includes(key)) numericFields.push(key)
          } else if (typeof value === 'string' || typeof value === 'boolean') {
            if (!categoricalFields.includes(key)) categoricalFields.push(key)
          }
        })
      }
    })
    
    fields.forEach(f => {
      const fieldLower = f.toLowerCase()
      if (fieldLower.includes('date') || fieldLower.includes('time')) {
        if (!dateFields.includes(f)) dateFields.push(f)
      }
    })

    const prompt = `You are a data analysis assistant. The user has a dataset with ${data.length} records from ${analysisType}.

User Question: "${question}"

Data Sample (first ${sampleSize} records):
${JSON.stringify(sample, null, 2)}

Available Fields: ${fields.join(', ')}
Numeric Fields: ${numericFields.join(', ') || 'None'}
Categorical Fields: ${categoricalFields.join(', ') || 'None'}
Date Fields: ${dateFields.join(', ') || 'None'}

Your Task:
1. Understand what the user wants to filter or analyze
2. Generate a JavaScript filter function that can be applied to the data array
3. The function should be a string that can be evaluated as: data.filter(item => YOUR_FILTER_LOGIC)
4. Provide a friendly response explaining what was done

Examples:
- "Show only Electronics and Furniture categories" -> filter: item.ItemGroup === 'Electronics' || item.ItemGroup === 'Furniture'
- "Show sales above 50000" -> filter: (item.TotalSales || item.Amount || 0) > 50000
- "Show last 3 months" -> filter: new Date(item.Date || item.DocDate) >= threeMonthsAgo

Return ONLY valid JSON in this exact format:
{
  "filterFunction": "item.ItemGroup === 'Electronics' || item.ItemGroup === 'Furniture'",
  "response": "I've filtered the data to show only Electronics and Furniture. Here's the updated view."
}

The filterFunction should be a valid JavaScript expression that works with: data.filter(item => YOUR_FILTER_FUNCTION)`

    // Use the provided API key or fallback to hardcoded
    const apiKey = (openaiSettings.openaiApiKey || OPENAI_API_KEY).trim()
    if (!apiKey || apiKey.length < 20) {
      throw new Error('Invalid OpenAI API key')
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: openaiSettings.openaiModel || OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a data analysis assistant. Generate JavaScript filter functions for data arrays. Always return valid JSON only, no markdown, no code blocks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    let generatedText = result.choices[0]?.message?.content?.trim() || ''

    // Clean up the response - remove markdown code blocks if present
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Extract JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    return {
      filterFunction: parsed.filterFunction || 'true',
      response: parsed.response || 'I\'ve processed your request.'
    }
  } catch (error) {
    console.error('Error generating query from question:', error)
    throw error
  }
}

function applyFilter(data: any[], filterFunction: string): any[] {
  try {
    // Create a safe filter function
    // We'll use Function constructor to create the filter, but validate it first
    if (!filterFunction || filterFunction.trim() === '') {
      return data
    }

    // Basic validation - check for dangerous patterns
    const dangerousPatterns = [
      'eval',
      'Function',
      'constructor',
      'prototype',
      'require',
      'import',
      'process',
      'global',
      'window',
      'document'
    ]
    
    const lowerFilter = filterFunction.toLowerCase()
    if (dangerousPatterns.some(pattern => lowerFilter.includes(pattern))) {
      console.warn('Potentially dangerous filter function detected, using safe fallback')
      return data
    }

    // Apply the filter
    const filtered = data.filter((item) => {
      try {
        // Create a function that evaluates the filter expression
        // We'll use a safer approach by creating a function with item in scope
        const func = new Function('item', `return ${filterFunction}`)
        return func(item)
      } catch (e) {
        console.error('Error applying filter to item:', e)
        return false
      }
    })

    return filtered
  } catch (error) {
    console.error('Error applying filter:', error)
    return data // Return original data if filter fails
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
    const { question, data, analysisType, settings } = body

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { 
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Valid data array is required' }, { 
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { 
        status: 400,
        headers: corsHeaders,
      })
    }

    // Generate filter function from question
    const { filterFunction, response } = await generateQueryFromQuestion(
      question,
      data,
      analysisType || 'SalesAnalysis',
      {
        openaiApiKey: settings.openaiApiKey || OPENAI_API_KEY,
        openaiModel: settings.openaiModel || OPENAI_MODEL,
      }
    )

    // Apply filter to data
    const filteredData = applyFilter(data, filterFunction)

    return NextResponse.json({
      success: true,
      filteredData,
      filterFunction,
      response,
      originalCount: data.length,
      filteredCount: filteredData.length
    }, {
      headers: corsHeaders,
    })
  } catch (error: any) {
    console.error('Error in query-analysis-data:', error)
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while processing the question',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

