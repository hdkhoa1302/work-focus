// main/preload.ts - Preload script
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipc', {
  send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  on: (channel: string, listener: (event: any, data: any) => void) => ipcRenderer.on(channel, listener),
  removeListener: (channel: string, listener: (event: any, data: any) => void) => ipcRenderer.removeListener(channel, listener),
}); 