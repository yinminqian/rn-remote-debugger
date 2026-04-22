<div align="center">
  <img src="readme/logo.png" width="120" alt="RN Remote Debugger" />
  <h1>RN Remote Debugger</h1>
</div>

<p align="center">
  <a href="README.md">English</a> •
  <a href="README.zh-CN.md">简体中文</a> •
  <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/rn-remote-debugger"><img src="https://img.shields.io/npm/v/rn-remote-debugger?color=5865F2&style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/rn-remote-debugger"><img src="https://img.shields.io/npm/dm/rn-remote-debugger?color=5865F2&style=flat-square" alt="npm downloads"></a>
  <a href="https://github.com/yinminqian/rn-remote-debugger/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <img src="readme/main.png" width="100%" alt="RN Remote Debugger Screenshot" />
</p>

---

## Why This Project?

Since React Native adopted the Hermes engine, React Native Debugger is no longer usable — especially when working with animation libraries. I wanted to view network requests and check logs in Chrome just like before. That's why this project was born. Hope it helps everyone!

---

## Quick Start

### Step 1: Download Desktop App

Grab the latest DMG from the [Releases page](https://github.com/yinminqian/rn-remote-debugger/releases/latest):

| Mac | File |
| --- | --- |
| Apple Silicon (M1/M2/M3/M4) | `RN-Remote-Debugger-<version>-arm64.dmg` |
| Intel | `RN-Remote-Debugger-<version>.dmg` |

**First launch (one-time):** the DMG is not code-signed, so macOS Gatekeeper will block it the first time.

1. Open the DMG → drag **RN Remote Debugger** to the `Applications` folder.
2. Double-click **首次启动修复.command** (bundled inside the same DMG). If macOS blocks it, right-click → **Open** → confirm once.
3. You can now launch the app normally.

<details>
<summary>Prefer the command line?</summary>

```bash
xattr -cr "/Applications/RN Remote Debugger.app"
```

</details>

### Step 2: Install npm package

```bash
yarn add rn-remote-debugger
```

### Step 3: Generate config file

```bash
npx rn-remote-debugger-create
```

This will generate a `rn-remote-debug.js` file in your project root:

```javascript
if (__DEV__) {
  module.exports = {
    host: '192.168.1.100', // Your computer's IP (auto-detected)
    port: 8989,
    enableConsole: true,
    enableNetwork: true
  }
} else {
  module.exports = {}
}
```

> **iOS Note**: Make sure the `host` matches your computer's IP address.

### Step 4: Import in entry file

Add at the top of `index.js` in your React Native project:

```javascript
import initRemoteDebugger from 'rn-remote-debugger'

initRemoteDebugger({})
```

Done! The debugger will automatically connect.

---

## Platform Notes

### Android

Run this command before starting your app:

```bash
adb reverse tcp:8989 tcp:8989
```

### iOS

No additional setup required. Just make sure the IP address in config file matches your computer's IP.

---

## Configuration Priority

**Config file > Code parameters**

The generated `rn-remote-debug.js` file takes priority over any parameters passed in code.

---

## License

[MIT](LICENSE)
