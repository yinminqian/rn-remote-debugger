# RN Remote Debugger

Remote debugger for React Native - intercept console logs and network requests via WebSocket.

## Installation

```bash
npm install rn-remote-debugger
# or
yarn add rn-remote-debugger
```

## Usage

In your React Native app's entry file (e.g., `index.js`):

```javascript
import initRemoteDebugger from 'rn-remote-debugger'

// Initialize with default options
initRemoteDebugger()

// Or with custom options
initRemoteDebugger({
  port: 8989, // WebSocket port (default: 8989)
  enableConsole: true, // Intercept console logs (default: true)
  enableNetwork: true, // Intercept network requests (default: true)
})
```

## Features

- 📝 Intercept all console logs (log, warn, error, info, debug)
- 🌐 Intercept network requests (fetch & XMLHttpRequest)
- 🔍 Search and filter requests
- 📊 View request/response details
- 🎨 Beautiful UI with Ant Design
- ⚡️ Real-time WebSocket connection
- 🚀 Auto-disabled in production (`__DEV__` check)

## Options

- `port` (number): WebSocket server port. Default: `8989`
- `enableConsole` (boolean): Enable console interception. Default: `true`
- `enableNetwork` (boolean): Enable network interception. Default: `true`

## Desktop App

Download the desktop debugger app to view logs and network requests:

- macOS: [Download DMG](#)

The desktop app will automatically connect to your React Native app via WebSocket on port 8989.

## How It Works

1. The npm package intercepts console logs and network requests in your RN app
2. Data is sent via WebSocket to the desktop debugger app
3. View all logs and requests in real-time with a beautiful UI

## Production Safety

The debugger automatically checks `__DEV__` and only runs in development mode. In production builds, it returns immediately without any overhead.

## License

MIT
