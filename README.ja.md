<div align="center">
  <table border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td><img src="readme/logo.png" width="80" alt="Logo" /></td>
      <td><h1>RN Remote Debugger</h1></td>
    </tr>
  </table>
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
  <img src="readme/main.png" width="100%" alt="RN Remote Debugger スクリーンショット" />
</p>

---

## なぜこのプロジェクトを作ったのか？

React Native が Hermes エンジンを採用して以来、React Native Debugger は使用できなくなりました。特にアニメーションライブラリを使用する際に問題が発生します。ネットワークリクエストを確認したい、Chrome のようにログを見たい — そこでこのプロジェクトが生まれました。皆さんのお役に立てれば幸いです！

---

## クイックスタート

### ステップ 1：デスクトップアプリをダウンロード

[Releases](https://github.com/niceyoo/rn-remote-debugger/releases) から DMG をダウンロードしてインストール。

### ステップ 2：npm パッケージをインストール

```bash
yarn add rn-remote-debugger
```

### ステップ 3：設定ファイルを生成

```bash
npx rn-remote-debugger-create
```

プロジェクトルートに `rn-remote-debug.js` ファイルが生成されます：

```javascript
if (__DEV__) {
  module.exports = {
    host: '192.168.1.100', // パソコンの IP（自動検出）
    port: 8989,
    enableConsole: true,
    enableNetwork: true
  }
} else {
  module.exports = {}
}
```

> **iOS 注意**：`host` がパソコンの IP アドレスと一致していることを確認してください。

### ステップ 4：エントリーファイルでインポート

React Native プロジェクトの `index.js` の先頭に追加：

```javascript
import initRemoteDebugger from 'rn-remote-debugger'

initRemoteDebugger({})
```

完了！デバッガーは自動的に接続します。

---

## プラットフォーム別の注意事項

### Android

アプリを起動する前に以下のコマンドを実行：

```bash
adb reverse tcp:8989 tcp:8989
```

### iOS

追加設定は不要です。設定ファイルの IP アドレスがパソコンの IP と一致していることを確認してください。

---

## 設定の優先順位

**設定ファイル > コードパラメータ**

生成された `rn-remote-debug.js` ファイルは、コードで渡されたパラメータより優先されます。

---

## License

[MIT](LICENSE)
