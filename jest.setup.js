// Jest setup file for additional configuration
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock Electron APIs for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    on: jest.fn(),
    quit: jest.fn(),
    isPackaged: false,
  },
  BrowserWindow: jest.fn(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
    },
  })),
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
  },
  Notification: {
    isSupported: jest.fn(() => true),
  },
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/focustrack-test';
process.env.JWT_SECRET = 'test-secret';