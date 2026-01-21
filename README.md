# RN Remote Debugger

一个用于 React Native 应用的远程调试工具，通过 WebSocket 实时查看 console 日志和网络请求。

## 功能特性

- 📝 实时查看 console 日志（log, warn, error, info, debug）
- 🌐 拦截并展示所有网络请求（fetch 和 XMLHttpRequest）
- 🔍 搜索过滤功能（支持 URL、请求头、请求体、响应体）
- 📊 查看请求详情（Request、Response、cURL）
- 🎨 美观的界面设计
- ⚡️ 实时连接状态显示

## 安装使用

### 1. 在 React Native 项目中安装 npm 包

```bash
npm install rn-remote-debugger
# 或
yarn add rn-remote-debugger
```

### 2. 在项目入口文件中引入

在 `index.js` 或 `App.js` 的最顶部添加：

```javascript
import initRemoteDebugger from "rn-remote-debugger";

// 使用默认配置
initRemoteDebugger();

// 或自定义配置
initRemoteDebugger({
  port: 8989, // WebSocket 端口（默认：8989）
  enableConsole: true, // 启用 console 拦截（默认：true）
  enableNetwork: true, // 启用网络拦截（默认：true）
});
```

### 3. 启动调试器应用

下载并打开 RN Remote Debugger 应用（DMG 文件）。

### 4. 启动 React Native 应用

正常启动你的 RN 应用，调试器会自动连接并开始显示日志和网络请求。

## 开发模式

如果你想在开发模式下运行调试器：

```bash
# 安装依赖
yarn install

# 启动 Vite 开发服务器（终端 1）
yarn dev

# 启动 Electron 应用（终端 2）
yarn start
```

## 打包应用

### 构建前端

```bash
yarn build
```

### 打包成 DMG（macOS）

```bash
# 安装打包工具
yarn add -D electron-builder

# 打包
yarn dist:mac
```

打包完成后，DMG 文件位于 `release` 目录。

## 界面说明

### 顶部栏

- **项目名称**：显示当前连接的项目
- **连接状态**：绿色链接图标表示已连接，红色表示断开
- **开发工具按钮**：点击打开/关闭 Chrome DevTools

### 左侧面板 - 网络请求列表

- **时间戳**：请求发起时间
- **方法**：HTTP 方法（GET、POST 等）
- **状态码**：响应状态码（200、404 等）
- **URL**：请求地址
- **耗时**：请求响应时间（毫秒）
- **搜索框**：支持搜索 URL、请求头、请求体、响应体

### 右侧面板 - 请求详情

- **Request 标签**：查看请求 URL、Headers、Body
- **Response 标签**：查看响应状态、Body
- **cURL 标签**：生成 cURL 命令，可直接复制使用

### Console 日志

所有 console 日志会在 Chrome DevTools 中显示（点击顶部开发工具按钮打开）。

## 配置选项

```javascript
initRemoteDebugger({
  port: 8989, // WebSocket 服务器端口
  enableConsole: true, // 是否拦截 console 日志
  enableNetwork: true, // 是否拦截网络请求
});
```

## 注意事项

1. **端口冲突**：确保端口 8989 未被占用，或修改为其他端口
2. **生产环境**：建议只在开发环境启用，避免影响生产性能
3. **网络环境**：
   - **iOS 模拟器**：使用 `localhost` 即可
   - **Android 模拟器**：使用 `10.0.2.2`（模拟器访问宿主机的特殊 IP）
   - **Android 真机**：使用电脑的局域网 IP 地址（如 `192.168.1.100`），并确保手机和电脑在同一 Wi-Fi 网络

   Android 端配置示例：
   ```javascript
   // Android 真机/模拟器
   initRemoteDebugger({
     host: '10.0.2.2', // Android 模拟器使用此 IP
     // host: '192.168.1.100', // Android 真机使用电脑的局域网 IP
     port: 8989
   });
   ```

## 常见问题

### Q: 调试器显示"等待连接"？

A: 确保 RN 应用已启动并正确引入了 `initRemoteDebugger()`。

### Q: 看不到网络请求？

A: 检查是否启用了网络拦截（`enableNetwork: true`）。

### Q: 端口被占用？

A: 修改端口配置：`initRemoteDebugger({ port: 8990 })`。

### Q: 如何在生产环境禁用？

A: 使用环境变量控制：

```javascript
if (__DEV__) {
  initRemoteDebugger();
}
```

## 技术栈

- **Electron**：桌面应用框架
- **React**：前端 UI 框架
- **Vite**：构建工具
- **Ant Design**：UI 组件库
- **WebSocket**：实时通信

## License

MIT
