declare global {
  interface Window {
    ipc: {
      send(channel: string, data?: any): void;
      on(channel: string, listener: (event: any, data: any) => void): void;
      removeListener(channel: string, listener: (...args: any[]) => void): void;
    };
  }
}

export {}; 