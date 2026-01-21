# Electron 打包指南

本文档说明如何使用 electron-builder 打包 RN Remote Debugger 应用。

## 准备工作

### 1. 添加应用图标

在 `build/` 目录中放置以下图标文件：

- **macOS**: `icon.icns` (1024x1024px)
- **Windows**: `icon.ico` (256x256px)
- **Linux**: `icon.png` (512x512px)

可以使用在线工具转换图标：
- https://cloudconvert.com/png-to-icns
- https://cloudconvert.com/png-to-ico

### 2. 配置应用信息

在 `package.json` 中修改以下字段：

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Your app description"
}
```

## 打包命令

### 开发模式
```bash
yarn dev
```

### 构建前端资源
```bash
yarn build
```

### 打包应用

#### macOS
```bash
# 打包为 DMG (支持 Intel 和 Apple Silicon)
yarn dist:mac
```

输出文件: `release/RN Remote Debugger-1.0.0.dmg`

#### Windows
```bash
# 打包为 NSIS 安装程序
yarn dist:win
```

输出文件: `release/RN Remote Debugger Setup 1.0.0.exe`

#### Linux
```bash
# 打包为 AppImage 和 deb
yarn dist:linux
```

输出文件:
- `release/RN Remote Debugger-1.0.0.AppImage`
- `release/rn-remote-debugger-app_1.0.0_amd64.deb`

### 不打包直接测试
```bash
yarn pack
```

这会生成未打包的应用目录，用于测试。

## 输出目录

所有打包文件都会输出到 `release/` 目录。

## 签名（可选）

### macOS 代码签名

如果要分发应用，建议进行代码签名：

```bash
# 设置开发者身份
electron-builder --mac --identity "Developer ID Application: Your Name"
```

### Windows 代码签名

需要购买代码签名证书，然后在配置中添加：

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

## 自动更新（可选）

配置自动更新需要设置更新服务器。electron-builder 支持多种更新服务器：

- GitHub Releases
- Amazon S3
- 自定义服务器

在 `package.json` 中已配置 GitHub Releases 作为更新源：

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "rn-remote-debugger"
    }
  }
}
```

## 常见问题

### 1. 打包失败
- 确保已运行 `yarn build` 构建前端资源
- 确保 Node.js 版本 >= 16
- 删除 `node_modules` 重新安装依赖

### 2. 应用无法启动
- 检查 `main.cjs` 和 `preload.cjs` 是否存在
- 检查 `package.json` 中的 `main` 字段是否正确
- 查看控制台错误信息

### 3. 图标未显示
- 确保图标文件路径正确
- macOS 图标必须是 `.icns` 格式
- Windows 图标必须是 `.ico` 格式

## 更多信息

- [electron-builder 官方文档](https://www.electron.build/)
- [Electron 官方文档](https://www.electronjs.org/docs)
