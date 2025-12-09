import { NextRequest, NextResponse } from 'next/server'
import { getCachedSession, cacheSession, removeSession } from '@/lib/session-manager'

// OpenAI API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

interface SAPB1Settings {
  sapServer: string
  companyDB: string
  userName: string
  password: string
}

interface OpenAISettings {
  openaiApiKey: string
  openaiModel: string
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

// Static list of SAP B1 Service Layer objects
const SAP_B1_OBJECTS = [
  'AccountCategory',
  'AccountSegmentationCategories',
  'AccountSegmentations',
  'AccrualTypes',
  'Activities',
  'ActivityLocations',
  'ActivityRecipientLists',
  'ActivityStatuses',
  'ActivityTypes',
  'AdditionalExpenses',
  'AlertManagements',
  'AlternateCatNum',
  'ApprovalRequests',
  'ApprovalStages',
  'ApprovalTemplates',
  'AssetCapitalization',
  'AssetCapitalizationCreditMemo',
  'AssetClasses',
  'AssetDepreciationGroups',
  'AssetGroups',
  'AssetManualDepreciation',
  'AssetRetirement',
  'AssetTransfer',
  'Attachments2',
  'AttributeGroups',
  'B1Sessions',
  'BankChargesAllocationCodes',
  'BankPages',
  'Banks',
  'BankStatements',
  'BarCodes',
  'BatchNumberDetails',
  'BEMReplicationPeriods',
  'BillOfExchangeTransactions',
  'BinLocationAttributes',
  'BinLocationFields',
  'BinLocations',
  'BlanketAgreements',
  'BOEDocumentTypes',
  'BOEInstructions',
  'BOEPortfolios',
  'BPFiscalRegistryID',
  'BPPriorities',
  'Branches',
  'BrazilBeverageIndexers',
  'BrazilFuelIndexers',
  'BrazilMultiIndexers',
  'BrazilNumericIndexers',
  'BrazilStringIndexers',
  'BudgetDistributions',
  'Budgets',
  'BudgetScenarios',
  'BusinessPartnerGroups',
  'BusinessPartnerProperties',
  'BusinessPartners',
  'BusinessPlaces',
  'CampaignResponseType',
  'Campaigns',
  'CashDiscounts',
  'CashFlowLineItems',
  'CertificateSeries',
  'ChartOfAccounts',
  'ChecksforPayment',
  'ChooseFromList',
  'ClosingDateProcedure',
  'Cockpits',
  'CommissionGroups',
  'Contacts',
  'ContractTemplates',
  'CorrectionInvoice',
  'CorrectionInvoiceReversal',
  'CorrectionPurchaseInvoice',
  'CorrectionPurchaseInvoiceReversal',
  'CostCenterTypes',
  'CostElements',
  'Countries',
  'CreditCardPayments',
  'CreditCards',
  'CreditNotes',
  'CreditPaymentMethods',
  'Currencies',
  'CustomerEquipmentCards',
  'CustomsDeclaration',
  'CustomsGroups',
  'CycleCountDeterminations',
  'DeductionTaxGroups',
  'DeductionTaxHierarchies',
  'DeductionTaxSubGroups',
  'DeliveryNotes',
  'Departments',
  'Deposits',
  'DepreciationAreas',
  'DepreciationTypePools',
  'DepreciationTypes',
  'DeterminationCriterias',
  'Dimensions',
  'DistributionRules',
  'DNFCodeSetup',
  'DownPayments',
  'Drafts',
  'DunningLetters',
  'DunningTerms',
  'DynamicSystemStrings',
  'ElectronicFileFormats',
  'EmailGroups',
  'EmployeeIDType',
  'EmployeePosition',
  'EmployeeRolesSetup',
  'EmployeesInfo',
  'EmployeeStatus',
  'EmployeeTransfers',
  'EmploymentCategorys',
  'EnhancedDiscountGroups',
  'ExceptionalEvents',
  'ExtendedTranslations',
  'FAAccountDeterminations',
  'FactoringIndicators',
  'FinancialYears',
  'FiscalPrinter',
  'FormattedSearches',
  'FormPreferences',
  'Forms1099',
  'GLAccountAdvancedRules',
  'GoodsReturnRequest',
  'GovPayCodes',
  'Holidays',
  'HouseBankAccounts',
  'IncomingPayments',
  'Industries',
  'IntegrationPackagesConfigure',
  'InternalReconciliations',
  'IntrastatConfiguration',
  'InventoryCountings',
  'InventoryCycles',
  'InventoryGenEntries',
  'InventoryGenExits',
  'InventoryOpeningBalances',
  'InventoryPostings',
  'InventoryTransferRequests',
  'Invoices',
  'ItemGroups',
  'ItemImages',
  'ItemProperties',
  'Items',
  'JournalEntries',
  'JournalEntryDocumentTypes',
  'KnowledgeBaseSolutions',
  'KPIs',
  'LandedCosts',
  'LandedCostsCodes',
  'LegalData',
  'LengthMeasures',
  'LocalEra',
  'Manufacturers',
  'MaterialGroups',
  'MaterialRevaluation',
  'Messages',
  'MobileAddOnSetting',
  'MultiLanguageTranslations',
  'NatureOfAssessees',
  'NCMCodesSetup',
  'NFModels',
  'NFTaxCategories',
  'NotaFiscalCFOP',
  'NotaFiscalCST',
  'NotaFiscalUsage',
  'OccurrenceCodes',
  'Orders',
  'PackagesTypes',
  'PartnersSetups',
  'PaymentBlocks',
  'PaymentDrafts',
  'PaymentReasonCodes',
  'PaymentRunExport',
  'PaymentTermsTypes',
  'PickLists',
  'POSDailySummary',
  'PredefinedTexts',
  'PriceLists',
  'ProductionOrders',
  'ProductTrees',
  'ProfitCenters',
  'ProjectManagements',
  'ProjectManagementTimeSheet',
  'Projects',
  'PurchaseCreditNotes',
  'PurchaseDeliveryNotes',
  'PurchaseDownPayments',
  'PurchaseInvoices',
  'PurchaseOrders',
  'PurchaseQuotations',
  'PurchaseRequests',
  'PurchaseReturns',
  'PurchaseTaxInvoices',
  'QueryAuthGroups',
  'QueryCategories',
  'Queue',
  'Quotations',
  'Relationships',
  'ReportFilter',
  'ReportTypes',
  'ResourceCapacities',
  'ResourceGroups',
  'ResourceProperties',
  'Resources',
  'RetornoCodes',
  'ReturnRequest',
  'Returns',
  'RouteStages',
  'SalesForecast',
  'SalesOpportunities',
  'SalesOpportunityCompetitorsSetup',
  'SalesOpportunityInterestsSetup',
  'SalesOpportunityReasonsSetup',
  'SalesOpportunitySourcesSetup',
  'SalesPersons',
  'SalesStages',
  'SalesTaxAuthorities',
  'SalesTaxAuthoritiesTypes',
  'SalesTaxCodes',
  'SalesTaxInvoices',
  'Sections',
  'SerialNumberDetails',
  'ServiceCallOrigins',
  'ServiceCallProblemSubTypes',
  'ServiceCallProblemTypes',
  'ServiceCalls',
  'ServiceCallSolutionStatus',
  'ServiceCallStatus',
  'ServiceCallTypes',
  'ServiceContracts',
  'ServiceGroups',
  'ShippingTypes',
  'SpecialPrices',
  'States',
  'StockTakings',
  'StockTransferDrafts',
  'StockTransfers',
  'TargetGroups',
  'TaxCodeDeterminations',
  'TaxCodeDeterminationsTCD',
  'TaxInvoiceReport',
  'TaxWebSites',
  'Teams',
  'TerminationReason',
  'Territories',
  'TrackingNotes',
  'TransactionCodes',
  'TransportationDocuments',
  'TSRExceptionalEvents',
  'UnitOfMeasurementGroups',
  'UnitOfMeasurements',
  'UserDefaultGroups',
  'UserFieldsMD',
  'UserKeysMD',
  'UserLanguages',
  'UserObjectsMD',
  'UserPermissionTree',
  'UserQueries',
  'Users',
  'UserTablesMD',
  'ValueMapping',
  'ValueMappingCommunication',
  'VatGroups',
  'VendorPayments',
  'WarehouseLocations',
  'Warehouses',
  'WarehouseSublevelCodes',
  'WebClientBookmarkTiles',
  'WebClientDashboards',
  'WebClientFormSettings',
  'WebClientLaunchpads',
  'WebClientListviewFilters',
  'WebClientNotifications',
  'WebClientPreferences',
  'WebClientRecentActivities',
  'WebClientVariantGroups',
  'WebClientVariants',
  'WeightMeasures',
  'WithholdingTaxCodes',
  'WitholdingTaxDefinition',
  'WizardPaymentMethods',
  'WTaxTypeCodes'
]

async function getSAPB1Metadata(sessionId: string, server: string): Promise<string[]> {
  try {
    // Clean up server URL
    let serverUrl = server.trim().replace(/\/$/, '')
    if (serverUrl.includes('/b1s/v1/Login')) {
      serverUrl = serverUrl.replace('/b1s/v1/Login', '').replace(/\/$/, '')
    }
    if (serverUrl.includes('/b1s/v1')) {
      serverUrl = serverUrl.replace('/b1s/v1', '').replace(/\/$/, '')
    }
    
    const metadataUrl = `${serverUrl}/b1s/v1/$metadata`
    
    // Use https module directly to handle SSL certificates properly
    const https = require('https')
    const { URL } = require('url')
    
    const urlObj = new URL(metadataUrl)
    const isHttps = urlObj.protocol === 'https:'
    
    // Create a custom agent that accepts self-signed certificates
    const agent = isHttps ? new https.Agent({
      rejectUnauthorized: false,
    }) : undefined
    
    const makeRequest = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const requestOptions: any = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'Content-Type': 'application/xml',
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
              text: async () => data,
            }
            resolve(response)
          })
        })
        
        req.on('error', (error: any) => {
          reject(error)
        })
        
        req.end()
      })
    }
    
    const response = await makeRequest()
    
    if (!response.ok) {
      console.warn('Failed to fetch metadata, will use default objects')
      return []
    }
    
    const metadataXml = await response.text()
    
    if (!metadataXml || metadataXml.length === 0) {
      console.warn('Metadata XML is empty')
      return []
    }
    
    // Extract entity names from XML metadata
    // Try multiple patterns to match different XML formats
    let entities: string[] = []
    
    // Pattern 1: <EntityType Name="EntityName"
    const entityTypeMatches = metadataXml.match(/<EntityType\s+Name="([^"]+)"/g) || []
    entities = entityTypeMatches.map((match: string) => {
      const nameMatch = match.match(/Name="([^"]+)"/)
      return nameMatch ? nameMatch[1] : null
    }).filter((name: string | null): name is string => name !== null)
    
    // Pattern 2: <Entity Name="EntityName" (if Pattern 1 didn't work)
    if (entities.length === 0) {
      const entityMatches = metadataXml.match(/<Entity\s+Name="([^"]+)"/g) || []
      entities = entityMatches.map((match: string) => {
        const nameMatch = match.match(/Name="([^"]+)"/)
        return nameMatch ? nameMatch[1] : null
      }).filter((name: string | null): name is string => name !== null)
    }
    
    // Pattern 3: Try to extract from EntitySet
    if (entities.length === 0) {
      const entitySetMatches = metadataXml.match(/<EntitySet\s+Name="([^"]+)"/g) || []
      entities = entitySetMatches.map((match: string) => {
        const nameMatch = match.match(/Name="([^"]+)"/)
        return nameMatch ? nameMatch[1] : null
      }).filter((name: string | null): name is string => name !== null)
    }
    
    console.log(`Extracted ${entities.length} entities from metadata`)
    return entities
  } catch (error) {
    console.warn('Error fetching SAP B1 metadata:', error)
    return []
  }
}

// Fast data analysis to recommend chart types (no API call, instant analysis)
function analyzeDataForChartTypes(data: any[], query: string): ('pie' | 'bar' | 'line')[] {
  try {
    if (!data || data.length === 0) {
      return ['bar'] // Default fallback
    }

    // Sample first record to analyze structure
    const firstRecord = data[0]
    if (!firstRecord || typeof firstRecord !== 'object') {
      return ['bar'] // Default for non-object data
    }

    const fields = Object.keys(firstRecord)
    const lowerQuery = query.toLowerCase()
    
    // Identify field types
    const numericFields: string[] = []
    const dateFields: string[] = []
    const categoricalFields: string[] = []
    
    fields.forEach(field => {
      const value = firstRecord[field]
      const fieldLower = field.toLowerCase()
      
      // Check for date fields
      if (fieldLower.includes('date') || fieldLower.includes('time') || 
          fieldLower === 'docdate' || fieldLower === 'createdate' || 
          fieldLower === 'updatedate' || fieldLower === 'postingdate') {
        dateFields.push(field)
      }
      // Check for numeric fields
      else if (typeof value === 'number' || 
               (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '')) {
        numericFields.push(field)
      }
      // Categorical fields
      else if (typeof value === 'string' || typeof value === 'boolean') {
        categoricalFields.push(field)
      }
    })

    const recommendations: ('pie' | 'bar' | 'line')[] = []
    
    // Line Chart: Best for time series data
    if (dateFields.length > 0 && numericFields.length > 0) {
      // Check if query mentions time-related terms or if we have date fields
      if (lowerQuery.includes('trend') || lowerQuery.includes('over time') || 
          lowerQuery.includes('monthly') || lowerQuery.includes('yearly') ||
          lowerQuery.includes('daily') || lowerQuery.includes('weekly') ||
          lowerQuery.includes('sales') || lowerQuery.includes('revenue') ||
          lowerQuery.includes('period') || lowerQuery.includes('date')) {
        recommendations.push('line')
      } else if (dateFields.length > 0) {
        // If we have date fields, line chart is still a good option
        recommendations.push('line')
      }
    }
    
    // Bar Chart: Good for comparisons, rankings, most data types (always include if we have numeric data)
    if (numericFields.length > 0) {
      recommendations.push('bar')
    } else if (categoricalFields.length > 0) {
      recommendations.push('bar') // Bar chart works for categorical data too
    }
    
    // Pie Chart: Best for proportions with limited categories (2-8 ideal)
    if (numericFields.length > 0 && categoricalFields.length > 0) {
      // Check unique values in first categorical field (sample)
      const firstCategoricalField = categoricalFields[0]
      if (firstCategoricalField) {
        const uniqueValues = new Set()
        const sampleSize = Math.min(20, data.length)
        for (let i = 0; i < sampleSize; i++) {
          if (data[i] && data[i][firstCategoricalField]) {
            uniqueValues.add(String(data[i][firstCategoricalField]))
          }
        }
        // Pie chart is good if we have 2-8 categories (more restrictive for better UX)
        if (uniqueValues.size >= 2 && uniqueValues.size <= 8) {
          recommendations.push('pie')
        }
      }
    }
    
    // Ensure at least one chart type
    if (recommendations.length === 0) {
      return ['bar'] // Default fallback
    }
    
    // Remove duplicates and return
    return Array.from(new Set(recommendations)) as ('pie' | 'bar' | 'line')[]
  } catch (error) {
    console.error('Error analyzing data for chart types:', error)
    return ['bar'] // Default fallback
  }
}

// AI-powered chart configuration - determines best chart type AND field mapping
async function analyzeChartConfigurationWithAI(
  data: any[],
  originalQuery: string,
  openaiSettings: OpenAISettings
): Promise<{
  bestChartType: 'pie' | 'bar' | 'line'
  xAxisField?: string
  yAxisField?: string
  groupByField?: string
  recommendedTypes?: ('pie' | 'bar' | 'line')[]
}> {
  try {
    if (!data || data.length === 0) {
      return {
        bestChartType: 'bar',
        recommendedTypes: ['bar']
      }
    }

    // Sample first few records to analyze structure
    const sampleSize = Math.min(5, data.length)
    const sample = data.slice(0, sampleSize)
    
    // Extract field information
    const fields = data.length > 0 && typeof data[0] === 'object' && data[0] !== null
      ? Object.keys(data[0])
      : []
    
    // Identify numeric (measures) and categorical (dimensions) fields
    const numericFields: string[] = []
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

    // Analyze data structure more deeply
    const dateFields = fields.filter(f => {
      const fieldLower = f.toLowerCase()
      return fieldLower.includes('date') || fieldLower.includes('time') || 
             fieldLower === 'docdate' || fieldLower === 'createdate'
    })
    
    const sampleData = sample.slice(0, 3).map(item => {
      const summary: any = {}
      Object.keys(item).slice(0, 8).forEach(key => {
        const value = item[key]
        if (value !== null && value !== undefined) {
          if (typeof value === 'number') {
            summary[key] = value
          } else if (typeof value === 'string' && value.length < 50) {
            summary[key] = value
          }
        }
      })
      return summary
    })

    const prompt = `You are a data visualization expert. Analyze the data and user query to determine the BEST chart configuration.

User Query: "${originalQuery}"

Data Sample (${data.length} total records):
${JSON.stringify(sampleData, null, 2)}

Available Fields: ${fields.join(', ')}
Numeric Fields (Measures): ${numericFields.join(', ') || 'None'}
Categorical Fields (Dimensions): ${categoricalFields.join(', ') || 'None'}
Date Fields: ${dateFields.join(', ') || 'None'}

Your Task:
1. Determine the BEST single chart type: "pie", "bar", or "line"
2. Select the best X-axis field (dimension - usually categorical or date)
3. Select the best Y-axis field (measure - usually numeric)
4. If applicable, select a grouping field (for multi-series charts)
5. Recommend 1-2 alternative chart types

Chart Selection Rules:
- Line: Time series, trends over time, continuous progression
- Bar: Comparisons, rankings, discrete categories, top N items
- Pie: Proportions, percentages, parts of whole (2-8 categories)

Return ONLY valid JSON in this exact format:
{
  "bestChartType": "bar",
  "xAxisField": "CardName",
  "yAxisField": "DocTotal",
  "groupByField": null,
  "recommendedTypes": ["bar", "line"]
}`

    // Validate and prepare API key
    const apiKey = (openaiSettings.openaiApiKey || '').trim()
    if (!apiKey || apiKey.length < 20) {
      throw new Error('Invalid OpenAI API key: key is missing or too short')
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
            content: 'You are a data visualization expert. Analyze data structure and recommend the best chart types. Always return valid JSON array only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
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
      throw new Error('No valid JSON found in AI chart configuration response')
    }

    const config = JSON.parse(jsonMatch[0])
    
    // Validate chart type
    const validChartTypes = ['pie', 'bar', 'line']
    const bestChartType = validChartTypes.includes(config.bestChartType?.toLowerCase()) 
      ? config.bestChartType.toLowerCase() as 'pie' | 'bar' | 'line'
      : 'bar'
    
    // Validate fields exist in data
    const firstRecord = data[0]
    const availableFields = firstRecord && typeof firstRecord === 'object' 
      ? Object.keys(firstRecord) 
      : []
    
    const xAxisField = config.xAxisField && availableFields.includes(config.xAxisField)
      ? config.xAxisField
      : undefined
    
    const yAxisField = config.yAxisField && availableFields.includes(config.yAxisField)
      ? config.yAxisField
      : undefined
    
    const groupByField = config.groupByField && availableFields.includes(config.groupByField)
      ? config.groupByField
      : undefined
    
    // Validate recommended types
    const recommendedTypes: ('pie' | 'bar' | 'line')[] = []
    if (Array.isArray(config.recommendedTypes)) {
      config.recommendedTypes.forEach((type: string) => {
        if (validChartTypes.includes(type.toLowerCase())) {
          recommendedTypes.push(type.toLowerCase() as 'pie' | 'bar' | 'line')
        }
      })
    }
    
    // Ensure best chart type is in recommended types
    if (!recommendedTypes.includes(bestChartType)) {
      recommendedTypes.unshift(bestChartType)
    }
    
    // Limit to 3 types max
    const finalRecommendedTypes = recommendedTypes.slice(0, 3)

    console.log(`AI Chart Config: Type=${bestChartType}, X=${xAxisField}, Y=${yAxisField}, Group=${groupByField}`)
    
    return {
      bestChartType,
      xAxisField,
      yAxisField,
      groupByField: groupByField || undefined,
      recommendedTypes: finalRecommendedTypes.length > 0 ? finalRecommendedTypes : [bestChartType]
    }
  } catch (error) {
    console.error('Error analyzing chart configuration:', error)
    return {
      bestChartType: 'bar',
      recommendedTypes: ['bar']
    }
  }
}

async function generateQueryFromNaturalLanguage(
  naturalLanguageQuery: string,
  variables: Record<string, any>,
  openaiSettings: OpenAISettings
): Promise<{ objectName: string; filterParams: string; formattedQuery: string; description: string }> {
  try {
    // Replace variables in the query first
    let processedQuery = naturalLanguageQuery
    Object.entries(variables).forEach(([key, value]) => {
      processedQuery = processedQuery.replace(new RegExp(`\\{${key}\\}`, 'gi'), String(value))
    })

    // Calculate dates for context
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0]

    // Enhanced prompt to generate clear, detailed queries like ChatGPT
    const commonObjects = ['Orders', 'Invoices', 'Items', 'BusinessPartners', 'DeliveryNotes', 'PurchaseOrders', 'CreditNotes']
    const prompt = `You are a SAP Business One expert. Generate a clear, detailed query for the user's request.

User Request: "${processedQuery}"

Available SAP B1 Service Layer Objects: ${commonObjects.join(', ')}

Generate a response in JSON format with:
1. objectName: The SAP B1 object to query (e.g., "Orders", "Invoices", "Items")
2. filterParams: OData filter string (e.g., "$filter=DocDate ge '2024-01-01'")
3. formattedQuery: A clear, human-readable description of the query in SQL-like format
4. description: A brief explanation of what the query does

Rules:
- For date ranges: Use $filter=DocDate ge 'YYYY-MM-DD' for "past X days" or date ranges
- For status: Use $filter=DocumentStatus eq 'bost_Open' for open/pending orders
- For "top X": Use $top=X
- Format the formattedQuery like a SQL query with SELECT, FROM, WHERE, ORDER BY
- Make it clear and readable, similar to how ChatGPT displays SQL queries

Example for "list of orders for past 10 days":
{
  "objectName": "Orders",
  "filterParams": "$filter=DocDate ge '${tenDaysAgoStr}'&$orderby=DocDate desc",
  "formattedQuery": "SELECT DocNum AS 'Order No', DocDate AS 'Posting Date', CardCode AS 'Customer Code', CardName AS 'Customer Name', DocTotal AS 'Order Total' FROM ORDR WHERE DocDate >= '${tenDaysAgoStr}' ORDER BY DocDate DESC",
  "description": "Retrieves all sales orders created in the past 10 days, ordered by date (newest first)"
}

Now generate the response for: "${processedQuery}"

Return ONLY valid JSON, no markdown, no code blocks.`

    // Validate and prepare API key
    const apiKey = (openaiSettings.openaiApiKey || '').trim()
    if (!apiKey || apiKey.length < 20) {
      throw new Error('Invalid OpenAI API key: key is missing or too short')
    }
    
    console.log('[OpenAI] Using API key prefix:', apiKey.substring(0, 20) + '...')
    
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
            content: 'You are a SAP Business One expert assistant. Generate clear, detailed queries in JSON format. Always return valid JSON only, no markdown, no code blocks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    let generatedText = data.choices[0]?.message?.content?.trim() || ''

    // Clean up the response - remove markdown code blocks if present
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Extract JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in OpenAI response')
    }

    const result = JSON.parse(jsonMatch[0])
    
    // Validate object name exists in our list
    if (!SAP_B1_OBJECTS.includes(result.objectName)) {
      console.warn(`Object ${result.objectName} not in list, using closest match`)
      // Try to find closest match
      const lowerQuery = processedQuery.toLowerCase()
      const matched = SAP_B1_OBJECTS.find(obj => 
        lowerQuery.includes(obj.toLowerCase()) || obj.toLowerCase().includes(lowerQuery.split(' ')[0])
      )
      if (matched) {
        result.objectName = matched
      } else {
        // Default fallbacks
        if (lowerQuery.includes('order') && lowerQuery.includes('pending')) {
          result.objectName = 'Orders'
          result.filterParams = "$filter=DocumentStatus eq 'bost_Open'"
        } else if (lowerQuery.includes('item')) {
          result.objectName = 'Items'
        } else if (lowerQuery.includes('customer') || lowerQuery.includes('business partner')) {
          result.objectName = 'BusinessPartners'
        } else if (lowerQuery.includes('invoice') || lowerQuery.includes('sales')) {
          result.objectName = 'Invoices'
        } else {
          result.objectName = 'Orders' // Default fallback
        }
      }
    }

    // Ensure all fields are present with defaults
    return {
      objectName: result.objectName,
      filterParams: result.filterParams || '',
      formattedQuery: result.formattedQuery || `SELECT * FROM ${result.objectName}${result.filterParams ? ' WHERE ' + result.filterParams.replace('$filter=', '').replace(/&/g, ' AND ') : ''}`,
      description: result.description || `Query to retrieve ${result.objectName} data`
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

async function executeSAPB1Query(
  sessionId: string,
  server: string,
  objectName: string,
  filterParams: string = '',
  fetchAll: boolean = true,
  abortSignal?: AbortSignal,
  requestedLimit?: number | null
): Promise<any> {
  try {
    // Clean up server URL - extract base URL from login URL
    let serverUrl = server.trim().replace(/\/$/, '')
    if (serverUrl.includes('/b1s/v1/Login')) {
      serverUrl = serverUrl.replace('/b1s/v1/Login', '').replace(/\/$/, '')
    }
    if (serverUrl.includes('/b1s/v1')) {
      serverUrl = serverUrl.replace('/b1s/v1', '').replace(/\/$/, '')
    }
    
    // If fetchAll is true OR user specified a limit, use pagination
    // (SAP B1 may have default limits, so we need pagination even for limited requests)
    if (fetchAll || requestedLimit) {
      const allResults: any[] = []
      let skip = 0
      const pageSize = 1000 // Fetch 1000 records at a time
      let hasMore = true
      let totalCountFromServer: number | null = null
      let consecutiveEmptyPages = 0 // Track consecutive pages with 0 records
      let lastRecordsCount = -1 // Track last page's record count
      let sameCountStreak = 0 // Track if we're getting same count repeatedly
      
      while (hasMore) {
        // Check if request was cancelled
        if (abortSignal?.aborted) {
          console.log('Query execution cancelled by user')
          throw new Error('Request cancelled by user')
        }
        
        // Build query parameters for this page
        let queryParams = filterParams || ''
        
        // Check if $top is already in filterParams (user explicitly requested a limit)
        const hasTopInFilter = filterParams && filterParams.includes('$top=')
        
        // Calculate how many records we still need
        const recordsNeeded = requestedLimit ? requestedLimit - allResults.length : pageSize
        const recordsToFetch = Math.min(recordsNeeded, pageSize)
        
        // Remove $top from filterParams if it exists (we'll handle pagination manually)
        if (hasTopInFilter) {
          queryParams = queryParams.replace(/&\$top=\d+|^\$top=\d+&?|\$top=\d+/, '').replace(/^&+|&+$/, '')
        }
        
        // Add pagination parameters and request count
        // Use $count=true to get total record count
        if (queryParams) {
          queryParams += `&$skip=${skip}&$top=${recordsToFetch}&$count=true&$inlinecount=allpages`
        } else {
          queryParams = `$skip=${skip}&$top=${recordsToFetch}&$count=true&$inlinecount=allpages`
        }
        
        // If we have a requested limit and already have enough records, stop
        if (requestedLimit && allResults.length >= requestedLimit) {
          hasMore = false
          break
        }
        
        // Build the query URL
        const endpoint = `b1s/v1/${objectName}?${queryParams}`
        const url = `${serverUrl}/${endpoint}`
        
        console.log(`Fetching page: skip=${skip}, top=${pageSize}, URL: ${url}`)
        
        // Check again before making request
        if (abortSignal?.aborted) {
          console.log('Query execution cancelled before page request')
          throw new Error('Request cancelled by user')
        }
        
        // Make request for this page
        const pageResult = await makeSAPB1Request(sessionId, url, serverUrl)
        
        // Check if cancelled after request
        if (abortSignal?.aborted) {
          console.log('Query execution cancelled after page request')
          throw new Error('Request cancelled by user')
        }
        
        if (pageResult.value && Array.isArray(pageResult.value)) {
          const recordsReceived = pageResult.value.length
          
          // If we have a requested limit, only add the records we need
          if (requestedLimit) {
            const recordsToAdd = Math.min(recordsReceived, requestedLimit - allResults.length)
            allResults.push(...pageResult.value.slice(0, recordsToAdd))
            if (allResults.length >= requestedLimit) {
              console.log(`✓ Reached requested limit: ${requestedLimit} records`)
              hasMore = false
              break
            }
          } else {
            allResults.push(...pageResult.value)
          }
          
          // Get total count from server if available (usually in first response)
          // Try multiple possible count fields
          if (totalCountFromServer === null) {
            // Log all keys to help debug
            if (skip === 0) {
              console.log('First page response keys:', Object.keys(pageResult))
              console.log('First page response sample:', JSON.stringify(pageResult).substring(0, 500))
            }
            
            if (pageResult['@odata.count'] !== undefined && pageResult['@odata.count'] !== null) {
              totalCountFromServer = parseInt(String(pageResult['@odata.count']))
              console.log(`✓ Server reports total records (@odata.count): ${totalCountFromServer}`)
            } else if (pageResult['odata.count'] !== undefined && pageResult['odata.count'] !== null) {
              totalCountFromServer = parseInt(String(pageResult['odata.count']))
              console.log(`✓ Server reports total records (odata.count): ${totalCountFromServer}`)
            } else if (pageResult['count'] !== undefined && pageResult['count'] !== null) {
              totalCountFromServer = parseInt(String(pageResult['count']))
              console.log(`✓ Server reports total records (count): ${totalCountFromServer}`)
            } else if (skip === 0) {
              console.log('⚠ No total count found in first response. Will use aggressive pagination.')
            }
          }
          
          console.log(`Page ${Math.floor(skip / pageSize) + 1}: Received ${recordsReceived} records, Total so far: ${allResults.length}`)
          
          // If we have a requested limit, check if we've reached it
          if (requestedLimit && allResults.length >= requestedLimit) {
            hasMore = false
            console.log(`✓ Reached requested limit: ${requestedLimit} records`)
            break
          }
          
          // If we have total count from server, use it to determine if we need to continue
          if (totalCountFromServer !== null && totalCountFromServer > 0) {
            if (allResults.length >= totalCountFromServer) {
              hasMore = false
              console.log(`✓ All records fetched: ${allResults.length} of ${totalCountFromServer}`)
            } else {
              // Continue fetching - use actual records received as increment
              const actualIncrement = recordsReceived > 0 ? recordsReceived : 20 // Default to 20 if 0
              skip += actualIncrement
              const remaining = totalCountFromServer - allResults.length
              console.log(`→ Continuing pagination: skip=${skip}, fetched ${allResults.length}/${totalCountFromServer}, remaining=${remaining}`)
            }
          } else {
            // No total count available - use aggressive heuristics
            // SAP B1 might be limiting results, so we need to keep trying
            if (recordsReceived > 0) {
              // Reset empty pages counter
              consecutiveEmptyPages = 0
              
              // Check if we're getting the same number of records repeatedly
              if (recordsReceived === lastRecordsCount) {
                sameCountStreak++
                console.log(`Same record count (${recordsReceived}) for ${sameCountStreak} consecutive pages`)
              } else {
                sameCountStreak = 0
                lastRecordsCount = recordsReceived
              }
              
              // Got records - continue fetching aggressively
              // IMPORTANT: Always increment skip by the number of records we actually received
              // This ensures we don't fetch the same records twice
              // If SAP B1 returns 30 records, we skip by 30 to get the next 30
              const actualIncrement = recordsReceived > 0 ? recordsReceived : pageSize
              skip += actualIncrement
              
              console.log(`→ No total count, continuing: received ${recordsReceived}, incrementing skip by ${actualIncrement}, new skip=${skip}, total so far: ${allResults.length}`)
              
              // IMPORTANT: Continue fetching until we get 0 records
              // Don't stop based on same count, small batches, or any other heuristic
              // Only stop when we get 0 records 3 times in a row
              
              // If we're getting the same count repeatedly, it's likely SAP B1's limit
              // Keep fetching until we get 0 records
              if (sameCountStreak > 5) {
                console.log(`⚠ Getting consistent count (${recordsReceived}) for ${sameCountStreak} pages - likely SAP B1 limit, continuing...`)
              }
            } else {
              // No records in this page - this is the only condition to stop
              consecutiveEmptyPages++
              if (consecutiveEmptyPages >= 3) {
                // Got 0 records 3 times in a row - definitely the end
                hasMore = false
                console.log(`✗ No records in ${consecutiveEmptyPages} consecutive pages, stopping pagination`)
              } else {
                // Got 0 records - might be a glitch, try a few more times
                const actualIncrement = recordsReceived > 0 ? recordsReceived : 20 // Use last known increment or 20
                skip += actualIncrement
                console.log(`⚠ Got 0 records (attempt ${consecutiveEmptyPages}), retrying with skip=${skip}`)
              }
            }
          }
        } else {
          hasMore = false
          console.log('No value array in response, stopping pagination')
        }
        
        // Safety limit: don't fetch more than 100000 records (increased for large datasets)
        if (skip >= 100000) {
          console.log('Reached safety limit of 100000 records')
          hasMore = false
        }
        
        // Additional check: if we've fetched a very large number and still getting records,
        // log a warning but continue
        if (allResults.length > 50000) {
          console.log(`Large dataset detected: ${allResults.length} records fetched so far, continuing...`)
        }
        
        // Don't add artificial limits - only stop when we get 0 records or reach total count
        // Continue fetching aggressively until we truly reach the end
      }
      
      console.log(`Total records fetched: ${allResults.length}`)
      
      // Return in the same format as single request
      const finalResult = {
        value: allResults,
        '@odata.count': allResults.length
      }
      
      console.log(`Returning ${allResults.length} total records to client`)
      return finalResult
    } else {
      // Single request logic - respect $top limit if specified, otherwise fetch all
      // Build query parameters - use the filterParams as-is
      let queryParams = filterParams || ''
      
      // If user specified $top, respect it exactly (don't modify)
      // If no $top specified, we'll fetch all records (no limit)
      // Don't add any default limit
      
      const endpoint = `b1s/v1/${objectName}${queryParams ? '?' + queryParams : ''}`
      const url = `${serverUrl}/${endpoint}`
      
      console.log('Executing SAP B1 Query:', url)
      const singleResult = await makeSAPB1Request(sessionId, url, serverUrl)
      
      console.log('SAP B1 Response type:', Array.isArray(singleResult) ? 'array' : typeof singleResult)
      console.log('SAP B1 Response length:', Array.isArray(singleResult) ? singleResult.length : (singleResult?.value?.length || 'N/A'))
      
      // If result is an array, return it; if it's an object with value property, return that
      if (Array.isArray(singleResult)) {
        console.log(`Returning array with ${singleResult.length} records`)
        return singleResult
      } else if (singleResult && singleResult.value && Array.isArray(singleResult.value)) {
        console.log(`Returning value array with ${singleResult.value.length} records`)
        return singleResult.value
      }
      console.log('Returning single result object')
      return singleResult
    }
  } catch (error) {
    console.error('SAP B1 Query execution error:', error)
    throw error
  }
}

// Helper function to make SAP B1 requests
async function makeSAPB1Request(sessionId: string, url: string, serverUrl: string): Promise<any> {
  // Use https module directly to handle SSL certificates properly
  const https = require('https')
  const { URL } = require('url')
  
  const urlObj = new URL(url)
  const isHttps = urlObj.protocol === 'https:'
  
  // Create a custom agent that accepts self-signed certificates with timeout
  const agent = isHttps ? new https.Agent({
    rejectUnauthorized: false, // Accept self-signed certificates
    timeout: 10000, // 10 second timeout
    keepAlive: false,
  }) : undefined
  
  // Use GET method to retrieve data from SAP B1
  const makeRequest = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const requestOptions: any = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET', // Using GET to retrieve data
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
      
      // Set request timeout (10 seconds)
      req.setTimeout(10000, () => {
        req.destroy()
        reject(new Error('Request timeout: SAP B1 query took too long'))
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
    throw new Error(`SAP B1 Query failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  
  // Log the response to debug why we're getting fewer records than requested
  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      console.log(`[makeSAPB1Request] Response is array with ${data.length} records`)
    } else if (data.value && Array.isArray(data.value)) {
      console.log(`[makeSAPB1Request] Response has value array with ${data.value.length} records`)
      if (data['@odata.count'] !== undefined) {
        console.log(`[makeSAPB1Request] OData count: ${data['@odata.count']} (actual returned: ${data.value.length})`)
      }
    }
  }
  
  return data
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
  // Check if request was aborted
  const signal = request.signal
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  }
  
  try {
    const body = await request.json()
    const { query, variables = {}, settings } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { 
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

    // Step 2: Generate query from natural language - get object name and filters
    let queryResult: { objectName: string; filterParams: string }
    try {
      // Always use hardcoded key (hidden from users)
      const openaiConfig = {
        openaiApiKey: OPENAI_API_KEY,
        openaiModel: settings.openaiModel || OPENAI_MODEL,
      }
      
      // Debug: Log API key prefix (first 10 chars) to verify it's being used
      console.log('[OpenAI Config] Using API key:', OPENAI_API_KEY.substring(0, 15) + '...')
      console.log('[OpenAI Config] Model:', openaiConfig.openaiModel)
      
      queryResult = await generateQueryFromNaturalLanguage(
        query,
        variables,
        openaiConfig
      )
      console.log('Selected SAP B1 Object:', queryResult.objectName)
      console.log('Filter Parameters:', queryResult.filterParams || 'None')
    } catch (openaiError: any) {
      console.error('OpenAI query generation error:', openaiError)
      return NextResponse.json(
        { error: `Failed to generate query: ${openaiError.message || 'OpenAI API error'}` },
        { 
          status: 500,
          headers: corsHeaders,
        }
      )
    }

    // Check if request was cancelled
    if (signal.aborted) {
      return NextResponse.json({ error: 'Request cancelled by user' }, { 
        status: 499,
        headers: corsHeaders,
      })
    }

    // Step 3: Execute the query using the selected object
    let result: any
    // Check if user specified a limit in the query (e.g., "top 10")
    const filterParams = queryResult.filterParams || ''
    const hasUserLimit = filterParams.includes('$top=')
    
    // Extract the requested limit if user specified one
    let requestedLimit: number | null = null
    if (hasUserLimit) {
      const topMatch = filterParams.match(/\$top=(\d+)/)
      if (topMatch) {
        requestedLimit = parseInt(topMatch[1], 10)
      }
    }
    
    // If user specified a limit, we need to use pagination to ensure we get exactly that many
    // (SAP B1 may have default limits that prevent getting all records in one request)
    // If no limit specified, fetch all records
    try {
      result = await executeSAPB1Query(
        sessionId,
        settings.sapServer,
        queryResult.objectName,
        filterParams,
        !hasUserLimit, // Fetch all if no user limit, otherwise use pagination to get exact limit
        signal, // Pass abort signal
        requestedLimit // Pass the requested limit so pagination can stop at that number
      )
      console.log('Query executed successfully, result type:', Array.isArray(result) ? 'array' : typeof result)
      
      // Check again if request was cancelled
      if (signal.aborted) {
        return NextResponse.json({ error: 'Request cancelled by user' }, { status: 499 })
      }
    } catch (queryError: any) {
      console.error('SAP B1 query execution error:', queryError)
      
      const errorMessage = queryError.message || ''
      
      // Check if error is due to invalid/expired session (401 Unauthorized)
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || 
          errorMessage.includes('Session') || errorMessage.includes('authentication')) {
        console.log('Session appears to be invalid, removing from cache and retrying with new login')
        // Remove invalid session from cache
        removeSession(settings)
        
        // Try to get a new session and retry the query
        try {
          const newSessionId = await loginToSAPB1(settings, true) // Force new login
          if (newSessionId) {
            console.log('Retrying query with new session')
            result = await executeSAPB1Query(
              newSessionId,
              settings.sapServer,
              queryResult.objectName,
              filterParams, // Use original filter params (respect user limit if specified)
              !hasUserLimit, // Fetch all if no user limit, otherwise use pagination to get exact limit
              signal,
              requestedLimit // Pass the requested limit
            )
            console.log('Retry with new session successful')
          } else {
            return NextResponse.json(
              { error: 'Session expired and failed to create new session. Please check your credentials.' },
              { status: 401 }
            )
          }
        } catch (retryError: any) {
          console.error('Retry with new session failed:', retryError)
          return NextResponse.json(
            { error: `Session expired and retry failed: ${retryError.message || 'SAP B1 query error'}` },
            { status: 500 }
          )
        }
      } else if (queryResult.objectName === 'Items' && 
          queryResult.filterParams && 
          (errorMessage.includes('invalid') || errorMessage.includes('Property'))) {
        // If error is due to invalid property and we're querying Items, retry without filter
        // But preserve $top limit if user specified one
        console.log('Retrying Items query without filter due to invalid property error')
        try {
          // Extract $top from original filterParams if it exists
          const topMatch = filterParams.match(/\$top=(\d+)/)
          const retryParams = topMatch ? `$top=${topMatch[1]}` : ''
          const retryLimit = topMatch ? parseInt(topMatch[1], 10) : null
          
          result = await executeSAPB1Query(
            sessionId,
            settings.sapServer,
            queryResult.objectName,
            retryParams, // Retry with only $top limit if user specified one
            !topMatch, // Fetch all if no user limit, otherwise use pagination to get exact limit
            signal,
            retryLimit // Pass the requested limit
          )
          console.log('Retry successful, filtering results client-side')
        } catch (retryError: any) {
          console.error('Retry also failed:', retryError)
          return NextResponse.json(
            { error: `Failed to execute query: ${retryError.message || 'SAP B1 query error'}` },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: `Failed to execute query: ${queryError.message || 'SAP B1 query error'}` },
          { status: 500 }
        )
      }
    }
    
    // Special handling for inventory items below minimum stock
    // If query is about inventory/stock and Items object, filter client-side
    const lowerQuery = query.toLowerCase()
    if (queryResult.objectName === 'Items' && 
        (lowerQuery.includes('below minimum') || lowerQuery.includes('below min') || 
         lowerQuery.includes('low stock') || lowerQuery.includes('minimum stock'))) {
      // Filter items where current stock is less than minimum inventory
      if (result.value && Array.isArray(result.value)) {
        result.value = result.value.filter((item: any) => {
          const currentStock = item.QuantityOnStock || item.OnHand || 0
          const minInventory = item.MinInventory || 0
          return currentStock < minInventory
        })
        // Update the count
        if (result['@odata.count'] !== undefined) {
          result['@odata.count'] = result.value.length
        }
      }
    }

    // Step 5: Transform result for charts
    let chartData = []
    if (result.value && Array.isArray(result.value)) {
      chartData = result.value
      console.log(`Transforming ${chartData.length} records for display`)
    } else if (Array.isArray(result)) {
      chartData = result
      console.log(`Transforming ${chartData.length} records for display (direct array)`)
    } else {
      chartData = [result]
      console.log(`Single result object, converting to array`)
    }

    console.log(`Final response: ${chartData.length} records will be sent to client`)

    // Step 6: AI-powered chart configuration (best chart type + field mapping)
    let chartConfig: {
      bestChartType: 'pie' | 'bar' | 'line'
      xAxisField?: string
      yAxisField?: string
      groupByField?: string
      recommendedTypes?: ('pie' | 'bar' | 'line')[]
    }
    
    try {
      chartConfig = await analyzeChartConfigurationWithAI(
        chartData,
        query,
        {
          openaiApiKey: OPENAI_API_KEY,
          openaiModel: settings.openaiModel || OPENAI_MODEL,
        }
      )
    } catch (aiError) {
      console.warn('AI chart configuration failed, using local analysis:', aiError)
      // Fallback to local analysis if AI fails
      const recommendedTypes = analyzeDataForChartTypes(chartData, query)
      chartConfig = {
        bestChartType: recommendedTypes[0] || 'bar',
        recommendedTypes
      }
    }

    return NextResponse.json({
      success: true,
      query: `${queryResult.objectName}${queryResult.filterParams ? '?' + queryResult.filterParams : ''}`,
      objectName: queryResult.objectName,
      formattedQuery: (queryResult as any).formattedQuery || '',
      description: (queryResult as any).description || '',
      data: chartData,
      rawResult: result,
      recommendedChartTypes: chartConfig.recommendedTypes || [chartConfig.bestChartType],
      bestChartType: chartConfig.bestChartType,
      chartConfig: {
        xAxisField: chartConfig.xAxisField,
        yAxisField: chartConfig.yAxisField,
        groupByField: chartConfig.groupByField,
      }
    }, {
      headers: corsHeaders,
    })
  } catch (error: any) {
    console.error('Error in execute-query:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    })
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while executing the query',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

