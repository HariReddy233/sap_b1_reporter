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
  server: "https://b1.ativy.mx:50097/b1s/v1/Login",
  companyDB: "MEDILIGHT_CG_TEST",
  userName: "manager",
  password: "Chung@890",
};

export const defaultOpenAIConfig: OpenAIConfig = {
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
  model: "gpt-3.5-turbo",
};

