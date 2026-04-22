#!/bin/bash
# 修复 macOS Gatekeeper 隔离属性，让未签名的 RN Remote Debugger 可以正常打开。
# 使用方法：先把 App 拖到 /Applications，再双击本脚本。
#         首次双击若被系统拦截，请右键 → 打开 → 确认后会记住选择。

set -e

APP_PATH="/Applications/RN Remote Debugger.app"

echo ""
echo "RN Remote Debugger - 首次启动修复工具"
echo "========================================"
echo ""

if [ ! -d "$APP_PATH" ]; then
  echo "⚠️  未在 /Applications 下找到 RN Remote Debugger.app"
  echo "    请先把 DMG 左边的 App 图标拖到右边的 Applications 文件夹，再运行本脚本。"
  echo ""
  read -n 1 -s -r -p "按任意键关闭..."
  exit 1
fi

if xattr -cr "$APP_PATH"; then
  echo "✅ 修复完成！现在可以直接双击 RN Remote Debugger 打开。"
else
  echo "❌ 修复失败。请手动在终端执行："
  echo "   xattr -cr \"$APP_PATH\""
fi

echo ""
read -n 1 -s -r -p "按任意键关闭..."
echo ""
