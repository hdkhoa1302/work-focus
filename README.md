# FocusTrack - AI-Powered Productivity Application

**An intelligent desktop application that combines the Pomodoro Technique with AI-powered task management, project organization, and productivity insights.**

![FocusTrack Screenshot](docs/screenshot.png)

## 🌟 Features

### 🎯 Core Productivity Features
- **Pomodoro Timer**: Customizable focus and break sessions with system notifications
- **Task Management**: Create, organize, and track tasks with priorities and deadlines
- **Project Organization**: Group related tasks into projects with progress tracking
- **Kanban Board**: Visual task management with drag-and-drop functionality

### 🤖 AI-Powered Intelligence
- **Smart Project Analysis**: AI analyzes your project descriptions and creates structured task breakdowns
- **Intelligent Suggestions**: Get personalized recommendations based on your work patterns
- **Proactive Insights**: Receive timely feedback and motivation based on your productivity data
- **Whiteboard Integration**: AI remembers important decisions, notes, and project insights

### 📊 Analytics & Insights
- **Productivity Reports**: Detailed analytics on focus time, task completion, and patterns
- **Achievement System**: Gamified experience with unlockable achievements
- **Progress Tracking**: Visual progress indicators and completion statistics
- **Performance Trends**: Track your productivity over time with charts and metrics

### 🔧 Advanced Features
- **Multi-language Support**: English and Vietnamese interface
- **Dark/Light Theme**: Customizable appearance
- **Data Backup**: Automatic and manual backup functionality
- **Distraction Blocking**: Block distracting applications during focus sessions
- **Cross-platform**: Available for Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- MongoDB Atlas account (for data storage)
- Google Gemini API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/focustrack/focustrack-desktop.git
   cd focustrack-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/focustrack
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Start the development server**
   ```bash
   npm run start:dev
   ```

### Building for Production

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + MongoDB
- **Desktop**: Electron
- **AI Integration**: Google Gemini API
- **Charts**: Recharts
- **Drag & Drop**: @hello-pangea/dnd

### Project Structure
```
focustrack-desktop/
├── main/                   # Electron main process
│   ├── api.ts             # Express API server
│   ├── auth.ts            # Authentication middleware
│   ├── models/            # MongoDB models
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── routes/            # API route handlers
├── src/                   # React renderer process
│   ├── components/        # Reusable UI components
│   ├── pages/             # Application pages
│   ├── services/          # API client services
│   ├── hooks/             # Custom React hooks
│   └── i18n/              # Internationalization
├── public/                # Static assets
└── build/                 # Build configuration
```

## 🔧 Development

### Available Scripts

```bash
npm run start:dev          # Start development mode
npm run build              # Build for production
npm run test               # Run tests
npm run test:watch         # Run tests in watch mode
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run clean              # Clean build directory
```

### Code Quality

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Jest** for testing

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📖 User Guide

### Getting Started
1. **Create an Account**: Sign up with your email and password
2. **Set Up Your First Project**: Use the AI assistant to analyze and create your first project
3. **Start a Pomodoro Session**: Select a task and begin your focused work session
4. **Track Your Progress**: Monitor your productivity through the dashboard and reports

### AI Assistant Usage
- **Project Creation**: Describe your project in natural language, and the AI will break it down into manageable tasks
- **Smart Suggestions**: Ask for productivity tips and task prioritization advice
- **Whiteboard**: Use the AI whiteboard to capture and organize important decisions and notes

### Keyboard Shortcuts
- `Ctrl/Cmd + N`: Create new task
- `Ctrl/Cmd + P`: Create new project
- `Space`: Start/pause timer
- `Ctrl/Cmd + ,`: Open settings

## 🔒 Security & Privacy

- **Local Data Storage**: All sensitive data is stored locally and encrypted
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **API Security**: Rate limiting, input validation, and CORS protection
- **Privacy First**: AI interactions are processed securely with no personal data retention

## 🌍 Internationalization

FocusTrack supports multiple languages:
- English (en)
- Vietnamese (vi)

To add a new language:
1. Create a new translation file in `src/i18n/locales/`
2. Add the language to the configuration in `src/i18n/index.ts`
3. Update the language selector in settings

## 📊 Performance

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB available space
- **OS**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)

### Optimization Features
- Lazy loading for improved startup time
- Efficient state management with React hooks
- Optimized database queries with MongoDB indexing
- Background task processing for smooth UI experience

## 🐛 Troubleshooting

### Common Issues

**Application won't start**
- Ensure Node.js 18+ is installed
- Check that all environment variables are set correctly
- Verify MongoDB connection string

**AI features not working**
- Confirm Gemini API key is valid and has sufficient quota
- Check internet connection
- Review API rate limits

**Performance issues**
- Close unnecessary applications
- Check available system memory
- Consider reducing the number of active projects

### Getting Help
- Check the [Issues](https://github.com/focustrack/focustrack-desktop/issues) page
- Join our [Discord community](https://discord.gg/focustrack)
- Email support: support@focustrack.app

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electron](https://electronjs.org/) for the desktop framework
- [React](https://reactjs.org/) for the UI library
- [MongoDB](https://mongodb.com/) for the database
- [Google Gemini](https://ai.google.dev/) for AI capabilities
- [TailwindCSS](https://tailwindcss.com/) for styling
- The open-source community for inspiration and contributions

## 🚀 Roadmap

### Upcoming Features
- [ ] Team collaboration features
- [ ] Calendar integration
- [ ] Mobile companion app
- [ ] Advanced AI coaching
- [ ] Plugin system
- [ ] Cloud synchronization
- [ ] Voice commands
- [ ] Habit tracking

### Version History
- **v1.0.0** - Initial release with core features
- **v1.1.0** - AI assistant and whiteboard integration
- **v1.2.0** - Enhanced analytics and reporting
- **v1.3.0** - Multi-language support and accessibility improvements

---

**Made with ❤️ by the FocusTrack Team**

[Website](https://focustrack.app) • [Documentation](https://docs.focustrack.app) • [Community](https://discord.gg/focustrack) • [Support](mailto:support@focustrack.app)