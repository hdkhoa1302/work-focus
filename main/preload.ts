// main/preload.ts - Preload script
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipc', {
  send: (channel: string, data: any) => {
    const validChannels = [
      'timer-start', 
      'timer-pause', 
      'timer-resume', 
      'get-running-apps', 
      'user-logged-in',
      'get-notification-config',
      'update-notification-config',
      'show-notification',
      'acknowledge-notification',
      'check-overdue-tasks',
      'check-upcoming-deadlines',
      'check-project-deadlines',
      'check-workload-warnings',
      'check-inactivity',
      'user-activity'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  invoke: (channel: string, data?: any) => {
    const validChannels = [
      'get-api-config',
      'get-notification-config',
      'update-notification-config'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  on: (channel: string, listener: (event: any, data: any) => void) => {
    const validChannels = [
      'timer-tick', 
      'timer-done', 
      'timer-paused', 
      'running-apps-response',
      'new-notification',
      'notification-clicked',
      'notification-config',
      'check-overdue-tasks',
      'check-upcoming-deadlines',
      'check-project-deadlines',
      'check-workload-warnings',
      'check-inactivity'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener);
    }
  },
  removeListener: (channel: string, listener: (event: any, data: any) => void) => {
    const validChannels = [
      'timer-tick', 
      'timer-done', 
      'timer-paused', 
      'running-apps-response',
      'new-notification',
      'notification-clicked',
      'notification-config',
      'check-overdue-tasks',
      'check-upcoming-deadlines',
      'check-project-deadlines',
      'check-workload-warnings',
      'check-inactivity'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, listener);
    }
  },
});