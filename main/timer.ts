import { ipcMain, Tray } from 'electron';
import { spawn } from 'child_process';
import { TaskModel } from './models/task';
import { SessionModel } from './models/session';
import { ConfigModel } from './models/config';

let interval: NodeJS.Timeout | null = null;
let startTimestamp = 0;
let remainingMs = 0;
let currentType: 'focus' | 'break' = 'focus';
let currentTaskId: string | undefined = undefined;
let blockInterval: NodeJS.Timeout | null = null;

async function checkTaskCompletion(taskId?: string) {
  if (!taskId) return;
  const completedCount = await SessionModel.countDocuments({ taskId, type: 'focus' });
  const task = await TaskModel.findById(taskId);
  if (task) {
    const estimate = task.estimatedPomodoros || 1;
    task.status = completedCount >= estimate ? 'done' : 'in-progress';
    await task.save();
  }
}

async function killBlockedApps() {
  try {
    const config = await ConfigModel.findOne().lean();
    const apps: string[] = config?.blockList?.apps ?? [];
    apps.forEach(appName => {
      // kill processes matching appName
      spawn('pkill', ['-f', appName]);
    });
  } catch (err) {
    console.error('Error killing blocked apps:', err);
  }
}

export function setupTimer(tray: Tray) {
  ipcMain.on('timer-start', (event, args) => {
    const { type, duration, taskId } = args as { type: 'focus' | 'break'; duration: number; taskId?: string };
    if (type === 'focus') {
      killBlockedApps();
      if (blockInterval) clearInterval(blockInterval);
      blockInterval = setInterval(killBlockedApps, 5000);
    } else {
      if (blockInterval) {
        clearInterval(blockInterval);
        blockInterval = null;
      }
    }
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
        if (blockInterval) {
          clearInterval(blockInterval);
          blockInterval = null;
        }
        interval = null;
        event.sender.send('timer-tick', 0);
        event.sender.send('timer-done', { type: currentType });
        try {
          const session = await SessionModel.create({
            taskId: currentTaskId,
            type: currentType,
            startTime: new Date(startTimestamp),
            endTime: new Date(),
            duration: duration / 1000,
          });
          await checkTaskCompletion(currentTaskId);
        } catch (err) {
          console.error('Failed to save session:', err);
        }
      } else {
        event.sender.send('timer-tick', updatedRemaining);
      }
    }, 1000);
  });

  ipcMain.on('timer-pause', (event) => {
    if (blockInterval) {
      clearInterval(blockInterval);
      blockInterval = null;
    }
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
      if (currentType === 'focus') {
        killBlockedApps();
        if (blockInterval) clearInterval(blockInterval);
        blockInterval = setInterval(killBlockedApps, 5000);
      }
      startTimestamp = Date.now();
      interval = setInterval(async () => {
        const elapsed = Date.now() - startTimestamp;
        const updatedRemaining = remainingMs - elapsed;
        if (updatedRemaining <= 0) {
          clearInterval(interval!);
          if (blockInterval) {
            clearInterval(blockInterval);
            blockInterval = null;
          }
          interval = null;
          event.sender.send('timer-tick', 0);
          event.sender.send('timer-done', { type: currentType });
          try {
            const session = await SessionModel.create({
              taskId: currentTaskId,
              type: currentType,
              startTime: new Date(startTimestamp),
              endTime: new Date(),
              duration: (remainingMs / 1000),
            });
            await checkTaskCompletion(currentTaskId);
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