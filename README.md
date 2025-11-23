# SAP B1 AI Powered Analytics Platform

An AI-powered analytics platform for SAP Business One that converts natural language queries into SAP B1 Service Layer queries and visualizes the results.

## Features

- 🤖 **AI-Powered Query Generation**: Convert natural language to SAP B1 queries using OpenAI
- 📊 **Multiple Chart Types**: Pie, Bar, and Line charts for data visualization
- ⚙️ **Configurable Settings**: Easy-to-edit settings for SAP B1 and OpenAI credentials
- 🎨 **Modern UI**: Beautiful, colorful interface with SAP Business One and Consultare branding
- 🔒 **Secure**: Settings are not permanently stored, always read from input fields

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- SAP Business One Service Layer access
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your settings:
   - Edit `config/settings.ts` for default values
   - Or use the Settings panel in the UI

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### SAP Business One Settings

- **Server URL**: Your SAP B1 Service Layer URL (e.g., `https://localhost:50000`)
- **Company Database**: Your company database name
- **Username**: SAP B1 username
- **Password**: SAP B1 password

### OpenAI Settings

- **API Key**: Your OpenAI API key
- **Model**: Choose between GPT-3.5 Turbo, GPT-4, or GPT-4 Turbo

## Usage

1. Enter your natural language query (e.g., "Give me one year sales")
2. Fill in any detected variables
3. Select your preferred chart type
4. View the results and data table

## Project Structure

The project follows Next.js 14 App Router structure with clear separation:

**Frontend** (app/ directory):
- `app/page.tsx` - Main page component
- `app/layout.tsx` - Root layout
- `app/globals.css` - Global styles
- `components/` - React components (UI layer)

**Backend** (app/api/ directory):
- `app/api/execute-query/route.ts` - API route for query execution
  - Handles SAP B1 authentication
  - Generates queries using OpenAI
  - Executes queries and returns results

```
├── app/
│   ├── api/                    # Backend API routes
│   │   └── execute-query/
│   │       └── route.ts        # Query execution endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page (Frontend entry)
├── components/                  # Frontend React components
│   ├── ChartDisplay.tsx        # Chart visualization
│   ├── Header.tsx              # Header with logos
│   ├── MainInterface.tsx       # Main interface
│   ├── QueryInput.tsx          # Query input form
│   └── SettingsPanel.tsx       # Settings panel
├── config/
│   └── settings.ts             # Default configuration
└── package.json
```

## Technologies

- **Next.js 14**: React framework
- **React 18**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Recharts**: Chart library
- **OpenAI API**: Natural language processing
- **Axios**: HTTP client

## License

Private - Consultare Projects

