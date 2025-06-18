import { ipcMain, Tray } from 'electron';
import { spawn } from 'child_process';
import { TaskModel } from './models/task';
import { SessionModel } from './models/session';
import { ConfigModel } from './models/config';
import { notificationManager } from './notification';

let interval: NodeJS.Timeout | null = null;
let startTimestamp = 0;
let remainingMs = 0;
let currentType: 'focus' | 'break' = 'focus';
let currentTaskId: string | undefined = undefined;
let blockInterval: NodeJS.Timeout | null = null;
let currentUserId: string | undefined;

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
    if (!currentUserId) return;
    const config = await ConfigModel.findOne({ userId: currentUserId }).lean();
    const apps: string[] = config?.blockList?.apps ?? [];
    apps.forEach(appName => {
      // kill processes matching appName
      spawn('pkill', ['-f', appName]);
    });
  } catch (err) {
    console.error('Error killing blocked apps:', err);
  }
}

// Website blocking disabled
async function blockWebsites() {
  // no-op
}

// Mở khóa website
async function unblockWebsites() {
  // no-op
}

ipcMain.on('user-logged-in', (event, args: { userId: string }) => {
  currentUserId = args.userId;
});

export function setupTimer(tray: Tray) {
  // Hàm cập nhật đồng hồ đếm ngược lên tray
  const updateTray = (ms: number) => {
    const mm = Math.floor(ms / 60000).toString().padStart(2, '0');
    const ss = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
    const text = `${mm}:${ss}`;
    if (process.platform === 'darwin') {
      tray.setTitle(text);
    } else {
      tray.setToolTip(`Remaining: ${text}`);
    }
  };
  ipcMain.on('timer-start', (event, args) => {
    const { type, duration, taskId } = args as { type: 'focus' | 'break'; duration: number; taskId?: string };
    if (type === 'focus') {
      killBlockedApps();
      blockWebsites();
      if (blockInterval) clearInterval(blockInterval);
      blockInterval = setInterval(killBlockedApps, 5000);
      // Chỉ cập nhật taskId trong chế độ focus
      currentTaskId = taskId;
    } else {
      unblockWebsites();
      if (blockInterval) {
        clearInterval(blockInterval);
        blockInterval = null;
      }
      // Trong chế độ break, không cần liên kết với task
      currentTaskId = undefined;
    }
    currentType = type;
    if (interval) clearInterval(interval);
    startTimestamp = Date.now();
    remainingMs = duration;
    event.sender.send('timer-tick', remainingMs);
    updateTray(remainingMs);
    interval = setInterval(async () => {
      const elapsed = Date.now() - startTimestamp;
      const updatedRemaining = duration - elapsed;
      if (updatedRemaining <= 0) {
        clearInterval(interval!);
        unblockWebsites();
        if (blockInterval) {
          clearInterval(blockInterval);
          blockInterval = null;
        }
        interval = null;
        event.sender.send('timer-tick', 0);
        event.sender.send('timer-done', { type: currentType });
        // Xóa hiển thị countdown trên tray
        if (process.platform === 'darwin') tray.setTitle('');
        else tray.setToolTip('FocusTrack');
        try {
          const uid = currentUserId;
          if (!uid) console.error('Không có userId để lưu session');
          const session = await SessionModel.create({
            userId: uid!,
            taskId: currentTaskId,
            type: currentType,
            startTime: new Date(startTimestamp),
            endTime: new Date(),
            duration: duration / 1000,
          });
          await checkTaskCompletion(currentTaskId);
          
          // Send notification based on timer type
          if (currentType === 'focus') {
            // Get task title if available
            let taskTitle = undefined;
            if (currentTaskId) {
              const task = await TaskModel.findById(currentTaskId);
              if (task) taskTitle = task.title;
            }
            
            // Show notification
            notificationManager.showNotification({
              id: `pomodoro-complete-${Date.now()}`,
              type: 'pomodoroComplete',
              title: 'Phiên Pomodoro hoàn thành',
              body: taskTitle 
                ? `Bạn đã hoàn thành phiên tập trung cho task "${taskTitle}". Hãy nghỉ ngơi!`
                : 'Bạn đã hoàn thành phiên tập trung. Hãy nghỉ ngơi!',
              priority: 'medium',
              timestamp: new Date()
            });
          } else {
            // Break complete notification
            notificationManager.showNotification({
              id: `break-complete-${Date.now()}`,
              type: 'breakComplete',
              title: 'Hết giờ nghỉ',
              body: 'Thời gian nghỉ đã kết thúc. Sẵn sàng cho phiên tập trung tiếp theo?',
              priority: 'medium',
              timestamp: new Date()
            });
          }
        } catch (err) {
          console.error('Failed to save session:', err);
        }
      } else {
        event.sender.send('timer-tick', updatedRemaining);
        updateTray(updatedRemaining);
      }
    }, 1000);
  });

  ipcMain.on('timer-pause', (event) => {
    unblockWebsites();
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
      // Cập nhật tray khi pause
      updateTray(remainingMs);
    }
  });

  ipcMain.on('timer-resume', (event) => {
    if (!interval && remainingMs > 0) {
      if (currentType === 'focus') {
        killBlockedApps();
        blockWebsites();
        if (blockInterval) clearInterval(blockInterval);
        blockInterval = setInterval(killBlockedApps, 5000);
      }
      startTimestamp = Date.now();
      interval = setInterval(async () => {
        const elapsed = Date.now() - startTimestamp;
        const updatedRemaining = remainingMs - elapsed;
        if (updatedRemaining <= 0) {
          clearInterval(interval!);
          unblockWebsites();
          if (blockInterval) {
            clearInterval(blockInterval);
            blockInterval = null;
          }
          interval = null;
          event.sender.send('timer-tick', 0);
          event.sender.send('timer-done', { type: currentType });
          // Xóa hiển thị countdown trên tray
          if (process.platform === 'darwin') tray.setTitle('');
          else tray.setToolTip('FocusTrack');
          try {
            const uid = currentUserId;
            if (!uid) console.error('Không có userId để lưu session');
            const session = await SessionModel.create({
              userId: uid!,
              taskId: currentTaskId,
              type: currentType,
              startTime: new Date(startTimestamp),
              endTime: new Date(),
              duration: (remainingMs / 1000),
            });
            await checkTaskCompletion(currentTaskId);
            
            // Send notification based on timer type
            if (currentType === 'focus') {
              // Get task title if available
              let taskTitle = undefined;
              if (currentTaskId) {
                const task = await TaskModel.findById(currentTaskId);
                if (task) taskTitle = task.title;
              }
              
              // Show notification
              notificationManager.showNotification({
                id: `pomodoro-complete-${Date.now()}`,
                type: 'pomodoroComplete',
                title: 'Phiên Pomodoro hoàn thành',
                body: taskTitle 
                  ? `Bạn đã hoàn thành phiên tập trung cho task "${taskTitle}". Hãy nghỉ ngơi!`
                  : 'Bạn đã hoàn thành phiên tập trung. Hãy nghỉ ngơi!',
                priority: 'medium',
                timestamp: new Date()
              });
            } else {
              // Break complete notification
              notificationManager.showNotification({
                id: `break-complete-${Date.now()}`,
                type: 'breakComplete',
                title: 'Hết giờ nghỉ',
                body: 'Thời gian nghỉ đã kết thúc. Sẵn sàng cho phiên tập trung tiếp theo?',
                priority: 'medium',
                timestamp: new Date()
              });
            }
          } catch (err) {
            console.error('Failed to save session:', err);
          }
        } else {
          event.sender.send('timer-tick', updatedRemaining);
          updateTray(updatedRemaining);
        }
      }, 1000);
    }
  });
}