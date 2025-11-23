# Installation and Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Settings

You can configure settings in two ways:

**Option A: Edit config/settings.ts**
- Open `config/settings.ts`
- Update the default values for SAP B1 and OpenAI

**Option B: Use the UI Settings Panel**
- Click the "Settings" button in the header
- Enter your credentials in the settings panel
- Settings are stored in memory (not permanently saved)

### 3. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Configuration Details

### SAP Business One Service Layer

- **Server URL**: Your SAP B1 Service Layer endpoint
  - Format: `https://your-server:50000`
  - Default: `https://localhost:50000`

- **Company Database**: Your SAP B1 company database name
  - Default: `SBODEMOUS`

- **Username**: SAP B1 username
  - Default: `manager`

- **Password**: SAP B1 password
  - Default: `1234`

### OpenAI Configuration

- **API Key**: Your OpenAI API key
  - Get one from: https://platform.openai.com/api-keys
  - Default: Provided in config/settings.ts

- **Model**: Choose the model to use
  - Options: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo
  - Default: `gpt-3.5-turbo`

## Testing

### Test Query Examples

1. **Sales Query**: "Give me one year sales"
2. **Items Query**: "Show me top 10 items"
3. **Business Partners**: "List all customers"

### Troubleshooting

**Issue: Cannot connect to SAP B1**
- Verify your SAP B1 Service Layer is running
- Check the server URL and port
- Verify credentials are correct
- Ensure SSL certificate is valid (for HTTPS)

**Issue: OpenAI API errors**
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure the API key has proper permissions

**Issue: Query generation fails**
- Try rephrasing your query
- Check that the query mentions SAP B1 entities (sales, items, etc.)
- Verify OpenAI API is accessible

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

- **Frontend**: `app/` directory and `components/`
- **Backend**: `app/api/` directory
- **Configuration**: `config/settings.ts`

