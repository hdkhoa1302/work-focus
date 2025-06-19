export interface APIServerConfig {
  port: number;
  baseUrl: string;
}

let currentApiConfig: APIServerConfig = {
  port: 3000,
  baseUrl: 'http://localhost:3000'
};

export const setAPIConfig = (port: number) => {
  currentApiConfig = {
    port,
    baseUrl: `http://localhost:${port}`
  };
};

export const getAPIConfig = (): APIServerConfig => {
  return currentApiConfig;
};

export const getAPIBaseUrl = (): string => {
  return currentApiConfig.baseUrl;
}; 