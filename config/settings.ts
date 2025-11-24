// Configuration file for SAP B1 and OpenAI settings
// Edit these values as needed

export interface SAPB1Config {
  server: string;
  companyDB: string;
  userName: string;
  password: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export const defaultSAPB1Config: SAPB1Config = {
  server: "https://localhost:50000",
  companyDB: "SBODEMOUS",
  userName: "manager",
  password: "1234",
};

export const defaultOpenAIConfig: OpenAIConfig = {
  apiKey: "", // Users should provide their own API key through the settings panel
  model: "gpt-3.5-turbo",
};
