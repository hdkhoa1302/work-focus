export interface APIServerConfig {
  port: number;
  baseUrl: string;
  isRemote: boolean;
}

// Remote API configuration - sử dụng remote API làm mặc định
const REMOTE_API_URL = 'https://work-focus-api.vercel.app';

let currentApiConfig: APIServerConfig = {
  port: 0, // Không sử dụng local port
  baseUrl: REMOTE_API_URL,
  isRemote: true
};

export const setAPIConfig = (port: number) => {
  // Để backward compatibility, nhưng ưu tiên remote API
  if (process.env.USE_LOCAL_API === 'true') {
    currentApiConfig = {
      port,
      baseUrl: `http://localhost:${port}`,
      isRemote: false
    };
    console.log(`🔧 API Config: Sử dụng local API tại port ${port}`);
  } else {
    currentApiConfig = {
      port: 0,
      baseUrl: REMOTE_API_URL,
      isRemote: true
    };
    console.log(`🌐 API Config: Sử dụng remote API tại ${REMOTE_API_URL}`);
  }
};

export const setRemoteAPI = () => {
  currentApiConfig = {
    port: 0,
    baseUrl: REMOTE_API_URL,
    isRemote: true
  };
  console.log(`🌐 API Config: Chuyển sang remote API tại ${REMOTE_API_URL}`);
};

export const getAPIConfig = (): APIServerConfig => {
  return currentApiConfig;
};

export const getAPIBaseUrl = (): string => {
  return currentApiConfig.baseUrl;
}; 