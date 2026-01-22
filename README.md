<div align="center">

<img src="readme/logo.png" width="120" alt="RN Remote Debugger Logo" />

# RN Remote Debugger

</div>

<p align="center">
  <a href="README.md">English</a> •
  <a href="README.zh-CN.md">简体中文</a> •
  <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/rn-remote-debugger"><img src="https://img.shields.io/npm/v/rn-remote-debugger?color=5865F2&style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/rn-remote-debugger"><img src="https://img.shields.io/npm/dm/rn-remote-debugger?color=5865F2&style=flat-square" alt="npm downloads"></a>
  <a href="https://github.com/niceyoo/rn-remote-debugger/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
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

Download and install the DMG from [Releases](https://github.com/niceyoo/rn-remote-debugger/releases).

### Step 2: Install npm package

```bash
yarn add rn-remote-debugger
```

### Step 3: Generate config file

```bash
npx rn-remote-debugger-create
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
