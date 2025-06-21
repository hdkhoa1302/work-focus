import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PortConflictInfo {
  port: number;
  isAvailable: boolean;
  processInfo?: {
    pid: number;
    name: string;
    cmd: string;
  };
}

/**
 * Kiểm tra port có đang được sử dụng không
 */
export async function checkPortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Lấy thông tin process đang sử dụng port
 */
export async function getProcessUsingPort(port: number): Promise<PortConflictInfo> {
  const isAvailable = await checkPortAvailability(port);
  
  if (isAvailable) {
    return { port, isAvailable: true };
  }

  try {
    // Sử dụng lsof trên Linux/macOS hoặc netstat trên Windows
    const isWin = process.platform === 'win32';
    const command = isWin 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} -t`;

    const { stdout } = await execAsync(command);
    
    if (isWin) {
      // Parse Windows netstat output
      const lines = stdout.trim().split('\n');
      const tcpLine = lines.find(line => line.includes('LISTENING'));
      if (tcpLine) {
        const pid = parseInt(tcpLine.trim().split(/\s+/).pop() || '0');
        if (pid > 0) {
          try {
            const { stdout: processInfo } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
            const processLines = processInfo.split('\n');
            if (processLines.length > 1) {
              const processData = processLines[1].split(',');
              const name = processData[0]?.replace(/"/g, '') || 'Unknown';
              return {
                port,
                isAvailable: false,
                processInfo: { pid, name, cmd: name }
              };
            }
          } catch (error) {
            console.error('Error getting process info on Windows:', error);
          }
        }
      }
    } else {
      // Parse Unix/Linux lsof output  
      const pid = parseInt(stdout.trim());
      if (pid > 0) {
        try {
          const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o comm=`);
          const name = processInfo.trim();
          const { stdout: cmdInfo } = await execAsync(`ps -p ${pid} -o args=`);
          const cmd = cmdInfo.trim();
          
          return {
            port,
            isAvailable: false,
            processInfo: { pid, name, cmd }
          };
        } catch (error) {
          console.error('Error getting process info:', error);
        }
      }
    }

    return {
      port,
      isAvailable: false,
      processInfo: { pid: 0, name: 'Unknown', cmd: 'Unknown process' }
    };
  } catch (error) {
    return {
      port,
      isAvailable: false,
      processInfo: { pid: 0, name: 'Unknown', cmd: 'Could not identify process' }
    };
  }
}

/**
 * Tìm range port khả dụng với thông tin chi tiết
 */
export async function findAvailablePortWithInfo(
  startPort: number, 
  maxTries: number = 10
): Promise<{ port: number; conflicts: PortConflictInfo[] }> {
  const conflicts: PortConflictInfo[] = [];
  
  for (let port = startPort; port < startPort + maxTries; port++) {
    const portInfo = await getProcessUsingPort(port);
    
    if (portInfo.isAvailable) {
      return { port, conflicts };
    } else {
      conflicts.push(portInfo);
    }
  }
  
  throw new Error(`Không thể tìm thấy port khả dụng trong khoảng ${startPort}-${startPort + maxTries - 1}. Conflicts: ${conflicts.length}`);
}

/**
 * Gợi ý giải pháp dựa trên process đang chiếm port
 */
export function suggestSolution(conflictInfo: PortConflictInfo): string[] {
  const suggestions: string[] = [];
  
  if (!conflictInfo.processInfo) {
    suggestions.push('Thử khởi động lại ứng dụng');
    return suggestions;
  }

  const { name, pid, cmd } = conflictInfo.processInfo;
  
  // Phát hiện các ứng dụng phổ biến
  if (name.toLowerCase().includes('node') || cmd.includes('node')) {
    suggestions.push('Có vẻ là một ứng dụng Node.js khác đang chạy');
    suggestions.push(`Dừng process: kill ${pid} (macOS/Linux) hoặc taskkill /PID ${pid} /F (Windows)`);
    suggestions.push('Hoặc kiểm tra xem có ứng dụng development server nào đang chạy không');
  } else if (name.toLowerCase().includes('python') || cmd.includes('python')) {
    suggestions.push('Có vẻ là một ứng dụng Python đang chạy');
    suggestions.push(`Dừng process: kill ${pid}`);
  } else if (name.toLowerCase().includes('java')) {
    suggestions.push('Có vẻ là một ứng dụng Java đang chạy');
    suggestions.push(`Dừng process: kill ${pid}`);
  } else if (name.toLowerCase().includes('nginx') || name.toLowerCase().includes('apache')) {
    suggestions.push('Web server đang chạy trên port này');
    suggestions.push('Cấu hình lại web server để sử dụng port khác');
  } else {
    suggestions.push(`Process "${name}" (PID: ${pid}) đang sử dụng port ${conflictInfo.port}`);
    suggestions.push(`Dừng process: kill ${pid} (macOS/Linux) hoặc taskkill /PID ${pid} /F (Windows)`);
  }
  
  suggestions.push('Hoặc đợi ứng dụng tự động chuyển sang port khác');
  
  return suggestions;
}

/**
 * Kiểm tra service đang chạy có phải là Work Focus app không
 */
export async function isWorkFocusService(port: number): Promise<boolean> {
  try {
    // Tạo AbortController để timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 giây timeout
    
    // Thử kết nối đến API endpoint đặc trung của Work Focus
    const response = await fetch(`http://localhost:${port}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      // Kiểm tra response có chứa signature của Work Focus không
      return data.service === 'work-focus' || data.app === 'work-focus';
    }
  } catch (error) {
    // Nếu không kết nối được hoặc không phải Work Focus API
    return false;
  }
  
  return false;
}

/**
 * Tìm port khả dụng hoặc sử dụng lại Work Focus service đang chạy
 */
export async function findOrReuseWorkFocusPort(
  startPort: number, 
  maxTries: number = 10
): Promise<{ port: number; conflicts: PortConflictInfo[]; isReusing: boolean }> {
  const conflicts: PortConflictInfo[] = [];
  
  // Kiểm tra port mong muốn trước
  const portInfo = await getProcessUsingPort(startPort);
  
  if (portInfo.isAvailable) {
    return { port: startPort, conflicts: [], isReusing: false };
  }
  
  // Port đã bị sử dụng, kiểm tra có phải Work Focus service không
  const isWorkFocus = await isWorkFocusService(startPort);
  if (isWorkFocus) {
    console.log(`🔄 Phát hiện Work Focus service đang chạy ở port ${startPort}, sử dụng lại service này`);
    return { port: startPort, conflicts: [portInfo], isReusing: true };
  }
  
  // Không phải Work Focus service, tìm port khác
  conflicts.push(portInfo);
  
  for (let port = startPort + 1; port < startPort + maxTries; port++) {
    const currentPortInfo = await getProcessUsingPort(port);
    
    if (currentPortInfo.isAvailable) {
      return { port, conflicts, isReusing: false };
    } else {
      conflicts.push(currentPortInfo);
    }
  }
  
  throw new Error(`Không thể tìm thấy port khả dụng trong khoảng ${startPort}-${startPort + maxTries - 1}. Conflicts: ${conflicts.length}`);
} 