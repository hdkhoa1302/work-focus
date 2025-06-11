# FocusTrack

**Ứng dụng desktop giúp tăng năng suất và tập trung, quản lý công việc theo phương pháp Pomodoro, chặn website và ứng dụng gây xao nhãng.**

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Công nghệ](#công-nghệ)
3. [Yêu cầu](#yêu-cầu)
4. [Cài đặt & Chạy dự án](#cài-đặt--chạy-dự-án)
5. [Cấu trúc dự án](#cấu-trúc-dự-án)
6. [Hướng dẫn phát triển chi tiết](#hướng-dẫn-phát-triển-chi-tiết)
   1. [Khởi tạo scaffold Electron + React](#khởi-tạo-scaffold-electron--react)
   2. [Kết nối MongoDB Atlas](#kết-nối-mongodb-atlas)
   3. [Xây API trong Main Process](#xây-api-trong-main-process)
   4. [Xây UI React](#xây-ui-react)
   5. [Module Pomodoro Timer](#module-pomodoro-timer)
   6. [Module Distraction Blocker](#module-distraction-blocker)
   7. [Module Reports](#module-reports)
   8. [Settings & Cấu hình](#settings--cấu-hình)
   9. [Testing & QA](#testing--qa)
   10. [Packaging & Release](#packaging--release)
7. [Wireframe & Thiết kế UI](#wireframe--thiết-kế-ui)
8. [Quy ước code](#quy-ước-code)
9. [Liên hệ](#liên-hệ)

---

## Giới thiệu

FocusTrack là ứng dụng desktop (Electron) chạy trên Linux, Windows, macOS, giúp bạn:

- Quản lý task/todo với tags, deadline, ưu tiên.
- Sử dụng Pomodoro Timer (focus/break) với thông báo desktop.
- Chặn website (hosts) và ứng dụng/process gây xao nhãng.
- Thống kê và báo cáo hiệu suất làm việc.

Mở rộng: có thể deploy phiên bản web tái sử dụng React UI.

## Công nghệ

- Electron (v16+)
- React + TypeScript
- TailwindCSS (hoặc Material-UI)
- Node.js + Express (embedded)
- MongoDB Atlas + Mongoose
- node-notifier / libnotify
- ps-list (lấy process), fs (hosts)
- Chart.js hoặc Recharts

## Yêu cầu

- Node.js v16+ và npm/yarn
- MongoDB Atlas account
- Quyền sudo (ghi `/etc/hosts`)
- Arch Linux (khuyến nghị) hoặc bất kỳ OS nào hỗ trợ Electron

## Cài đặt & Chạy dự án

```bash
# Clone repo
git clone https://github.com/<your-org>/focustrack-desktop.git
cd focustrack-desktop

# Cài dependencies
npm install     # hoặc yarn install

# Thiết lập biến môi trường
# Tạo file .env trong thư mục gốc:
# MONGO_URI=<your-mongodb-atlas-uri>
# NODE_ENV=development

# Chạy ở chế độ dev (hot reload)
npm run dev     # hoặc yarn dev
```

Sau khi build thành công, app sẽ tự khởi động cửa sổ Electron.

## Cấu trúc dự án

```
focustrack-desktop/
├─ public/                 # static assets (index.html)
├─ src/                    # React Renderer
│   ├─ components/         # UI components tái sử dụng
│   ├─ pages/              # Dashboard, Tasks, Reports, Settings
│   └─ ipc.ts              # wrapper ipcRenderer
├─ main/                   # Electron Main Process
│   ├─ main.ts             # khởi tạo cửa sổ, tray, IPC
│   ├─ db.ts               # kết nối Mongoose
│   ├─ api.ts              # Express routes
│   ├─ blocker.ts          # hosts & app blocker
│   └─ timer.ts            # logic Pomodoro + notification
├─ config/                 # mẫu config, copy vào ~/.config/focustrack/
├─ tests/                  # unit & integration tests
├─ .env.example            # file mẫu env
├─ package.json
├─ tsconfig.json
└─ electron-builder.json   # cấu hình đóng gói
```

## Hướng dẫn phát triển chi tiết

### 1. Khởi tạo scaffold Electron + React

1. Cài `electron-forge`:
   ```bash
   npm install -g @electron-forge/cli
   electron-forge init focustrack-desktop --template=typescript-webpack
   ```
2. Tích hợp TailwindCSS hoặc Material-UI theo docs tương ứng.

### 2. Kết nối MongoDB Atlas

- Thêm gói `mongoose`:
  ```bash
  npm install mongoose dotenv
  ```
- Tạo `main/db.ts`:
  ```ts
  import mongoose from 'mongoose';
  import { config } from 'dotenv';
  config();

  export function connectDB() {
    return mongoose.connect(process.env.MONGO_URI!, { useNewUrlParser: true, useUnifiedTopology: true });
  }
  ```
- Gọi `connectDB()` trong `main/main.ts` trước khi tạo window.

### 3. Xây API trong Main Process

- Cài `express`, `body-parser`:
  ```bash
  npm install express body-parser
  ```
- Tạo `main/api.ts` với các route CRUD:
  - `/api/tasks`
  - `/api/sessions`
  - `/api/config`
- Khởi động Express và lắng nghe trên port nội bộ (vd: 3000), bảo mật chỉ cho renderer.

### 4. Xây UI React

- Sử dụng React Router, tạo skeleton các page.
- Thiết kế `<Header />`, `<Sidebar />`, điều hướng.
- Kết nối axios/fetch tới `http://localhost:3000/api`.

### 5. Module Pomodoro Timer

- `main/timer.ts`: logic Pomodoro, IPC event `timer-start`, `timer-pause`, trả về tick qua `timer-tick`.
- Renderer `<TimerCard />` nghe IPC, hiển thị progress ring.
- Khi session kết thúc, gửi IPC `timer-done`, gọi API lưu session.

### 6. Module Distraction Blocker

- `main/blocker.ts`:
  - Hosts blocker: đọc/ghi `/etc/hosts` (ghi record start/end session).
  - App blocker: sử dụng `ps-list` để lấy process, `process.kill(pid, 'SIGSTOP')` để suspend, `SIGCONT` để resume.
- UI Settings:
  - Tab `Hosts`, Tab `Applications`, component `<BlockedAppList />` và `<AddAppDropdown />`.

### 7. Module Reports

- Mongoose aggregate: tổng time focus theo ngày/tuần/tháng.
- Page `<Reports />` dùng Chart.js/Recharts để vẽ Bar chart và Pie chart.
- Buttons export CSV/JSON (client-side convert hoặc API deliver file).

### 8. Settings & Cấu hình

- `main/config/` lưu file JSON nếu offline mode hoặc lưu trên Mongo `configs`.
- Page `<Settings />`: form các input, test connection, save.

### 9. Testing & QA

- Viết unit test với Jest cho core logic: timer, blocker, API.
- Kiểm thử thủ công tính năng block, thông báo.
- Sử dụng ESLint/Prettier đảm bảo style thống nhất.

### 10. Packaging & Release

- Cấu hình `electron-builder.json`:
  ```json
  {
    "appId": "com.yourorg.focustrack",
    "linux": { "target": ["AppImage"] },
    "directories": { "output": "dist" }
  }
  ```
- Build:
  ```bash
  npm run make    # electron-forge
  # hoặc
  npm run build   # electron-builder
  ```
- Tạo gói AUR (viết PKGBUILD).

---

## Wireframe & Thiết kế UI

Xem thư mục `docs/wireframes/` chứa file hình mockup cho Dashboard, Tasks, Reports, Settings, Modal Blocker.

## Quy ước code

- Tiếng Anh cho tên biến, function, comment.
- Tuân theo Airbnb style guide + Prettier.
- Dùng TypeScript strict mode.
- React hooks: `useEffect`, `useContext`, tránh class components.
- Mỗi component max 200 dòng.

## Liên hệ

- GitHub Issues: https://github.com/<your-org>/focustrack-desktop/issues
- Slack channel: #focustrack-dev
- Email: dev@yourorg.com 