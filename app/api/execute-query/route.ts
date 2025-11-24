import { NextRequest, NextResponse } from 'next/server'
import { getCachedSession, cacheSession, removeSession } from '@/lib/session-manager'

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

// Analyze data structure and recommend chart types using OpenAI
async function recommendChartTypes(
  data: any[],
  originalQuery: string,
  openaiSettings: OpenAISettings
): Promise<('pie' | 'bar' | 'line')[]> {
  try {
    if (!data || data.length === 0) {
      return ['bar'] // Default fallback
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

    const prompt = `You are a data visualization expert. Analyze the following data structure and recommend the BEST chart types (up to 3) from: pie, bar, line.

Data Sample (first ${sampleSize} of ${data.length} records):
${JSON.stringify(sample, null, 2)}

Data Structure:
- Total Records: ${data.length}
- Numeric Fields (Measures): ${numericFields.join(', ') || 'None'}
- Categorical Fields (Dimensions): ${categoricalFields.join(', ') || 'None'}
- All Fields: ${fields.join(', ')}

Original Query: "${originalQuery}"

Chart Type Guidelines:
1. **Pie Chart**: Best for showing proportions/percentages of a whole. Use when:
   - Data has 1 categorical dimension and 1 numeric measure
   - Showing distribution or composition (e.g., sales by region, items by category)
   - Limited number of categories (ideally 2-10)
   - NOT suitable for time series or comparing many categories

2. **Bar Chart**: Best for comparing categories. Use when:
   - Comparing values across categories
   - Data has 1 categorical dimension and 1 numeric measure
   - Good for ranking, comparisons, or showing discrete values
   - Works well with many categories

3. **Line Chart**: Best for trends over time. Use when:
   - Data has a time/date dimension
   - Showing trends, changes over time, or continuous data
   - Multiple series comparison over time
   - NOT suitable for categorical comparisons without time

Return ONLY a JSON array with 1-3 recommended chart types in order of preference (most suitable first).
Example responses:
- ["bar", "pie"] - if bar is best, pie is second choice
- ["line", "bar"] - if line is best for time series
- ["pie"] - if only pie chart makes sense
- ["bar"] - if only bar chart is suitable

Response (JSON array only, no other text):`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiSettings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiSettings.openaiModel,
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
        temperature: 0.3,
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      console.warn('OpenAI chart recommendation failed, using default')
      return ['bar'] // Default fallback
    }

    const result = await response.json()
    let generatedText = result.choices[0]?.message?.content?.trim() || ''

    // Extract JSON array from response
    const arrayMatch = generatedText.match(/\[[\s\S]*\]/)
    if (!arrayMatch) {
      console.warn('No valid JSON array found in chart recommendation, using default')
      return ['bar']
    }

    const recommendedTypes = JSON.parse(arrayMatch[0])
    
    // Validate and filter chart types
    const validTypes: ('pie' | 'bar' | 'line')[] = []
    const validChartTypes = ['pie', 'bar', 'line']
    
    recommendedTypes.forEach((type: string) => {
      if (validChartTypes.includes(type.toLowerCase())) {
        validTypes.push(type.toLowerCase() as 'pie' | 'bar' | 'line')
      }
    })

    // Limit to 3 chart types max
    const finalTypes = validTypes.slice(0, 3)
    
    // Ensure at least one chart type
    if (finalTypes.length === 0) {
      return ['bar']
    }

    console.log(`Recommended chart types: ${finalTypes.join(', ')}`)
    return finalTypes
  } catch (error) {
    console.error('Error recommending chart types:', error)
    return ['bar'] // Default fallback
  }
}

async function generateQueryFromNaturalLanguage(
  naturalLanguageQuery: string,
  variables: Record<string, any>,
  openaiSettings: OpenAISettings
): Promise<{ objectName: string; filterParams: string }> {
  try {
    // Replace variables in the query first
    let processedQuery = naturalLanguageQuery
    Object.entries(variables).forEach(([key, value]) => {
      processedQuery = processedQuery.replace(new RegExp(`\\{${key}\\}`, 'gi'), String(value))
    })

    // Calculate one year ago date
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]

    const prompt = `You are an expert in SAP Business One Service Layer. 
Based on the user's natural language query, select the MOST APPROPRIATE object from the list below and determine any filter parameters needed.

Natural Language Query: "${processedQuery}"
Today's date: ${todayStr}
One year ago: ${oneYearAgoStr}

Available SAP B1 Objects:
${SAP_B1_OBJECTS.join(', ')}

IMPORTANT - Valid Property Names for Common Objects:
- Items object: Use ONLY these properties: ItemCode, ItemName, QuantityOnStock, OnHand, MinInventory, MaxInventory, InventoryUOM, ValidFor, FrozenFor, CardCode, etc.
  DO NOT use: MinLevel, MinimumLevel, StockLevel, or any other variations
- Orders object: DocumentStatus, DocDate, CardCode, DocTotal, etc.
- Invoices object: DocDate, DocTotal, CardCode, DocumentStatus, etc.
- BusinessPartners object: CardCode, CardName, CardType, etc.

Rules:
1. Select ONE object name from the list above that best matches the query
2. ONLY add filter parameters if the user EXPLICITLY asks for filtered/specific data:
   - "pending orders", "open orders", "closed orders" → Use filter
   - "list all", "show all", "get all" → NO filter (empty string)
   - "one year sales", "this month" → Use date filter
   - Generic queries without specific criteria → NO filter
3. ONLY add $top parameter if the user EXPLICITLY requests a limit:
   - "top 10", "first 100", "limit 50" → Add $top parameter
   - "list all", "show all", "get all" → NO $top (fetch all records)
   - Generic queries → NO $top (fetch all records)
4. For "list all" or "show all" queries: Return empty filterParams (no filter, no $top)
5. For "pending orders" or "open orders": Use "Orders" object with $filter=DocumentStatus eq 'bost_Open'
6. For date filters: Use format 'YYYY-MM-DD' with single quotes
7. Status values: 'bost_Open' (open/pending), 'bost_Close' (closed), 'bost_Cancelled' (cancelled)
8. For "one year" queries: $filter=DocDate ge '${oneYearAgoStr}' and DocDate le '${todayStr}'
9. For inventory/stock queries on Items: 
   - If query asks for "items below minimum stock" or similar: Use Items object with NO filter (fetch all items, filtering will be done client-side)
   - DO NOT use MinLevel, MinimumLevel, or any invalid property names
   - Valid properties: MinInventory (minimum inventory), QuantityOnStock or OnHand (current stock)

Return ONLY a JSON object in this exact format:
{
  "objectName": "Orders",
  "filterParams": "$filter=DocumentStatus eq 'bost_Open'"
}

If no filters needed, return empty string for filterParams:
{
  "objectName": "Items",
  "filterParams": ""
}

Examples:
- Query: "List all pending orders" → {"objectName": "Orders", "filterParams": "$filter=DocumentStatus eq 'bost_Open'"} (has "pending" - specific filter, NO $top)
- Query: "List all orders" → {"objectName": "Orders", "filterParams": ""} (NO filter, NO $top - "list all" means fetch everything)
- Query: "Show me items" → {"objectName": "Items", "filterParams": ""} (NO filter, NO $top - generic query)
- Query: "Give me one year sales" → {"objectName": "Invoices", "filterParams": "$filter=DocDate ge '${oneYearAgoStr}'"} (has date criteria - filter needed, NO $top)
- Query: "List all customers" → {"objectName": "BusinessPartners", "filterParams": ""} (NO filter, NO $top - "list all" means all)
- Query: "Show top 10 customers" → {"objectName": "BusinessPartners", "filterParams": "$top=10"} (user requested limit)
- Query: "First 100 orders" → {"objectName": "Orders", "filterParams": "$top=100"} (user requested limit)
- Query: "Show inventory items below minimum stock" → {"objectName": "Items", "filterParams": ""} (NO filter, NO $top - client-side filtering)
- Query: "Items with low stock" → {"objectName": "Items", "filterParams": ""} (NO filter, NO $top)
- Query: "Pending orders" → {"objectName": "Orders", "filterParams": "$filter=DocumentStatus eq 'bost_Open'"} (has "pending" - specific filter, NO $top)
- Query: "Orders" → {"objectName": "Orders", "filterParams": ""} (NO filter, NO $top - just object name)

Response (JSON only):`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiSettings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiSettings.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that selects SAP B1 Service Layer objects and generates filter parameters. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
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

    return {
      objectName: result.objectName,
      filterParams: result.filterParams || ''
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
  abortSignal?: AbortSignal
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
    
    // If fetchAll is true, use pagination to get all records
    if (fetchAll) {
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
        
        // Add pagination parameters and request count
        // Use $count=true to get total record count
        // Only add $top if user didn't explicitly request a limit (for internal pagination)
        if (queryParams) {
          if (hasTopInFilter) {
            // User requested a specific limit, just add skip and count for pagination
            queryParams += `&$skip=${skip}&$count=true&$inlinecount=allpages`
          } else {
            // No user limit, add our pagination $top for efficient fetching
            queryParams += `&$skip=${skip}&$top=${pageSize}&$count=true&$inlinecount=allpages`
          }
        } else {
          queryParams = `$skip=${skip}&$top=${pageSize}&$count=true&$inlinecount=allpages`
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
          allResults.push(...pageResult.value)
          
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
      // Original single request logic (for backward compatibility)
      // Build query parameters
      let hasTop = false
      if (filterParams) {
        hasTop = filterParams.includes('$top=')
      }
      
      let queryParams = filterParams || ''
      if (!hasTop) {
        if (queryParams) {
          queryParams += '&$top=10000'
        } else {
          queryParams = '$top=10000'
        }
      }
      
      const endpoint = `b1s/v1/${objectName}${queryParams ? '?' + queryParams : ''}`
      const url = `${serverUrl}/${endpoint}`
      
      console.log('Executing SAP B1 Query:', url)
      return await makeSAPB1Request(sessionId, url, serverUrl)
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
  
  // Create a custom agent that accepts self-signed certificates
  const agent = isHttps ? new https.Agent({
    rejectUnauthorized: false, // Accept self-signed certificates
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
      queryResult = await generateQueryFromNaturalLanguage(
        query,
        variables,
        {
          openaiApiKey: settings.openaiApiKey,
          openaiModel: settings.openaiModel,
        }
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

    // Step 3: Execute the query using the selected object (limit to top 50 records)
    let result: any
    try {
      // Add $top=50 to limit results to top 50 records
      let limitedFilterParams = queryResult.filterParams || ''
      if (limitedFilterParams) {
        // Check if $top is already in filterParams
        if (!limitedFilterParams.includes('$top=')) {
          limitedFilterParams += `&$top=50`
        } else {
          // Replace existing $top with 50 if it's higher
          limitedFilterParams = limitedFilterParams.replace(/\$top=\d+/, '$top=50')
        }
      } else {
        limitedFilterParams = '$top=50'
      }
      
      result = await executeSAPB1Query(
        sessionId,
        settings.sapServer,
        queryResult.objectName,
        limitedFilterParams,
        false, // Don't fetch all, we only want top 50
        signal // Pass abort signal
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
              queryResult.filterParams,
              true,
              signal
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
        console.log('Retrying Items query without filter due to invalid property error')
        try {
          result = await executeSAPB1Query(
            sessionId,
            settings.sapServer,
            queryResult.objectName,
            '$top=50' // Retry with top 50 limit
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

    // Step 6: Analyze data and recommend chart types using OpenAI
    let recommendedChartTypes: ('pie' | 'bar' | 'line')[] = ['bar'] // Default fallback
    try {
      recommendedChartTypes = await recommendChartTypes(
        chartData,
        query,
        {
          openaiApiKey: settings.openaiApiKey,
          openaiModel: settings.openaiModel,
        }
      )
      console.log(`Recommended chart types: ${recommendedChartTypes.join(', ')}`)
    } catch (error) {
      console.error('Error recommending chart types:', error)
      // Continue with default
    }

    return NextResponse.json({
      success: true,
      query: `${queryResult.objectName}${queryResult.filterParams ? '?' + queryResult.filterParams : ''}`,
      objectName: queryResult.objectName,
      data: chartData,
      rawResult: result,
      recommendedChartTypes, // Add recommended chart types
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

