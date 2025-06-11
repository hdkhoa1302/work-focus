import { ipcMain } from 'electron';
import { SessionModel } from './models/session';

let interval: NodeJS.Timeout | null = null;
let startTimestamp = 0;
let remainingMs = 0;
let currentType: 'focus' | 'break' = 'focus';
let currentTaskId: string | undefined = undefined;

export function setupTimer() {
  ipcMain.on('timer-start', (event, args) => {
    const { type, duration, taskId } = args as { type: 'focus' | 'break'; duration: number; taskId?: string };
    currentType = type;
    currentTaskId = taskId;
    if (interval) clearInterval(interval);
    startTimestamp = Date.now();
    remainingMs = duration;
    event.sender.send('timer-tick', remainingMs);
    interval = setInterval(async () => {
      const elapsed = Date.now() - startTimestamp;
      const updatedRemaining = duration - elapsed;
      if (updatedRemaining <= 0) {
        clearInterval(interval!);
        interval = null;
        event.sender.send('timer-tick', 0);
        event.sender.send('timer-done', { type: currentType });
        try {
          await SessionModel.create({
            taskId: currentTaskId,
            type: currentType,
            startTime: new Date(startTimestamp),
            endTime: new Date(),
            duration: duration / 1000,
          });
        } catch (err) {
          console.error('Failed to save session:', err);
        }
      } else {
        event.sender.send('timer-tick', updatedRemaining);
      }
    }, 1000);
  });

  ipcMain.on('timer-pause', (event) => {
    if (interval) {
      clearInterval(interval);
      interval = null;
      const elapsed = Date.now() - startTimestamp;
      remainingMs = remainingMs - elapsed;
      event.sender.send('timer-paused', remainingMs);
    }
  });

  ipcMain.on('timer-resume', (event) => {
    if (!interval && remainingMs > 0) {
      startTimestamp = Date.now();
      interval = setInterval(async () => {
        const elapsed = Date.now() - startTimestamp;
        const updatedRemaining = remainingMs - elapsed;
        if (updatedRemaining <= 0) {
          clearInterval(interval!);
          interval = null;
          event.sender.send('timer-tick', 0);
          event.sender.send('timer-done', { type: currentType });
          try {
            await SessionModel.create({
              taskId: currentTaskId,
              type: currentType,
              startTime: new Date(startTimestamp),
              endTime: new Date(),
              duration: (remainingMs / 1000),
            });
          } catch (err) {
            console.error('Failed to save session:', err);
          }
        } else {
          event.sender.send('timer-tick', updatedRemaining);
        }
      }, 1000);
    }
  });
} 