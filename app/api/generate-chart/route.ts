import { NextRequest, NextResponse } from 'next/server'

// OpenAI API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

interface OpenAISettings {
  openaiApiKey: string
  openaiModel: string
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body = await request.json()
    const { data, chartType, originalQuery, settings } = body

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!chartType || !['bar', 'pie', 'line'].includes(chartType)) {
      return NextResponse.json(
        { error: 'Invalid chart type. Must be bar, pie, or line' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Sample data for AI analysis (limit to avoid token limits)
    const sampleSize = Math.min(10, data.length)
    const sample = data.slice(0, sampleSize)
    
    // Extract field information
    const fields = data.length > 0 && typeof data[0] === 'object' && data[0] !== null
      ? Object.keys(data[0]).filter(key => !key.startsWith('odata.') && key !== '__metadata')
      : []

    // Identify field types
    const numericFields: string[] = []
    const categoricalFields: string[] = []
    const dateFields: string[] = []

    sample.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        Object.entries(item).forEach(([key, value]) => {
          if (key.startsWith('odata.') || key === '__metadata') return
          
          const keyLower = key.toLowerCase()
          if (keyLower.includes('date') || keyLower.includes('time')) {
            if (!dateFields.includes(key)) dateFields.push(key)
          } else if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)) && value !== '')) {
            if (!numericFields.includes(key)) numericFields.push(key)
          } else if (typeof value === 'string' || typeof value === 'boolean') {
            if (!categoricalFields.includes(key)) categoricalFields.push(key)
          }
        })
      }
    })

    // Prepare sample data for AI (limit fields to avoid token limits)
    const sampleData = sample.slice(0, 5).map(item => {
      const summary: any = {}
      Object.keys(item).slice(0, 10).forEach(key => {
        if (!key.startsWith('odata.') && key !== '__metadata') {
          const value = item[key]
          if (value !== null && value !== undefined) {
            if (typeof value === 'number') {
              summary[key] = value
            } else if (typeof value === 'string') {
              summary[key] = value.length > 50 ? value.substring(0, 50) + '...' : value
            } else {
              summary[key] = String(value)
            }
          }
        }
      })
      return summary
    })

    // Always use hardcoded key (hidden from users) - same as execute-query route
    const openaiConfig: OpenAISettings = {
      openaiApiKey: OPENAI_API_KEY,
      openaiModel: settings?.openaiModel || OPENAI_MODEL,
    }
    
    // Validate API key
    if (!openaiConfig.openaiApiKey || openaiConfig.openaiApiKey.length < 20) {
      throw new Error('Invalid OpenAI API key configuration')
    }
    
    console.log('[Generate Chart] Using API key:', OPENAI_API_KEY.substring(0, 15) + '...')
    console.log('[Generate Chart] Model:', openaiConfig.openaiModel)

    const prompt = `You are a data visualization expert. Analyze the following data and generate an optimal chart configuration for a ${chartType} chart.

User Query: "${originalQuery}"
Chart Type Requested: ${chartType}
Available Fields: ${fields.join(', ')}
Numeric Fields (measures): ${numericFields.join(', ')}
Categorical Fields (dimensions): ${categoricalFields.join(', ')}
Date Fields: ${dateFields.join(', ')}

Sample Data (first 5 records):
${JSON.stringify(sampleData, null, 2)}

Based on the data structure and the user's query, determine:
1. xAxisField: The field to use for the X-axis (typically a dimension like name, date, category)
2. yAxisField: The field to use for the Y-axis (typically a measure like amount, quantity, total)
3. groupByField: (Optional) Field to group by for multi-series charts

Rules:
- For ${chartType} charts:
  ${chartType === 'bar' ? '- X-axis should be categorical (names, categories, dates)\n  - Y-axis should be numeric (amounts, totals, counts)\n  - Best for comparing values across categories' : ''}
  ${chartType === 'pie' ? '- Use a categorical field for segments (names, categories)\n  - Use a numeric field for values (amounts, totals)\n  - Best for showing proportions/percentages' : ''}
  ${chartType === 'line' ? '- X-axis should be date or sequential (dates, time periods)\n  - Y-axis should be numeric (amounts, totals, counts)\n  - Best for showing trends over time' : ''}

- Prioritize fields that match the user's query intent
- Choose meaningful field names (prefer fields like "CardName", "DocTotal", "ItemName" over generic IDs)
- For dates, prefer fields like "DocDate", "PostingDate"
- For amounts, prefer fields like "DocTotal", "Total", "Amount", "Revenue"

Return ONLY valid JSON in this exact format:
{
  "xAxisField": "field_name_here",
  "yAxisField": "field_name_here",
  "groupByField": "field_name_here_or_null"
}

No markdown, no code blocks, no explanations.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiConfig.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiConfig.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a data visualization expert. Return only valid JSON, no markdown, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    const content = aiResponse.choices[0]?.message?.content || '{}'
    
    // Parse JSON response (handle markdown code blocks if present)
    let chartConfig: any = {}
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      chartConfig = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      // Fallback to intelligent defaults
      chartConfig = {
        xAxisField: categoricalFields[0] || dateFields[0] || fields[0],
        yAxisField: numericFields[0] || fields.find(f => !categoricalFields.includes(f)),
        groupByField: categoricalFields.length > 1 ? categoricalFields[1] : null
      }
    }

    // Validate and set defaults
    const xAxisField = chartConfig.xAxisField || categoricalFields[0] || dateFields[0] || fields[0]
    const yAxisField = chartConfig.yAxisField || numericFields[0] || fields.find(f => !categoricalFields.includes(f) && !dateFields.includes(f))
    const groupByField = chartConfig.groupByField || null

    return NextResponse.json({
      success: true,
      chartType,
      chartConfig: {
        xAxisField,
        yAxisField,
        groupByField,
      }
    }, {
      headers: corsHeaders,
    })

  } catch (error: any) {
    console.error('Error generating chart configuration:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate chart configuration',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
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

