import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd';
import App from './App';

// 共享 token：排版 + 圆角，两种主题通用
const sharedTokens = {
  borderRadius: 6,
  borderRadiusLG: 8,
  borderRadiusSM: 4,
  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 13,
};

// ─── Dark · shadcn / zinc 风格 ─────────────────────────────
const darkConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: '#60a5fa',
    colorInfo: '#60a5fa',
    colorSuccess: '#22c55e',
    colorWarning: '#eab308',
    colorError: '#f87171',

    colorBgBase: '#17171a',
    colorBgLayout: '#17171a',
    colorBgContainer: '#1e1e22',
    colorBgElevated: '#26262b',

    colorBorder: 'rgba(255,255,255,0.08)',
    colorBorderSecondary: 'rgba(255,255,255,0.06)',

    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorTextTertiary: '#71717a',
    colorTextQuaternary: '#52525b',
  },
  components: {
    Card: {
      colorBgContainer: '#1e1e22',
      colorBorderSecondary: 'rgba(255,255,255,0.06)',
    },
    Tabs: {
      itemColor: '#71717a',
      itemActiveColor: '#fafafa',
      itemHoverColor: '#e4e4e7',
      itemSelectedColor: '#fafafa',
      inkBarColor: '#60a5fa',
    },
    // 与 App 内原生搜索框 var(--bg-panel) 一致，避免 Console 筛选条偏色
    Input: { colorBgContainer: '#18181b' },
    Button: { colorBgContainer: '#26262b' },
    Modal: { contentBg: '#1e1e22', headerBg: '#1e1e22' },
    Message: {
      contentBg: '#1e1e22',
      colorText: '#fafafa',
      contentPadding: '9px 14px',
    },
    Tag: {
      defaultBg: 'rgba(255,255,255,0.06)',
      defaultColor: '#e4e4e7',
    },
    Segmented: {
      trackBg: '#18181b',
      trackPadding: 3,
      itemColor: '#a1a1aa',
      itemHoverColor: '#fafafa',
      itemHoverBg: 'rgba(255,255,255,0.04)',
      itemSelectedBg: 'rgba(255,255,255,0.08)',
      itemSelectedColor: '#fafafa',
      borderRadius: 8,
      borderRadiusSM: 6,
    },
  },
};

// ─── Light · 参考 Codex Appearance 面板 ─────────────────────
// accent: #339CFF · bg: #FFFFFF · fg: #1A1C1F
const lightConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: '#339cff',
    colorInfo: '#339cff',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',

    colorBgBase: '#ffffff',
    colorBgLayout: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#f7f7f9',

    colorBorder: 'rgba(0,0,0,0.10)',
    colorBorderSecondary: 'rgba(0,0,0,0.06)',

    colorText: '#1a1c1f',
    colorTextSecondary: '#52525b',
    colorTextTertiary: '#71717a',
    colorTextQuaternary: '#a1a1aa',
  },
  components: {
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: 'rgba(0,0,0,0.08)',
    },
    Tabs: {
      itemColor: '#71717a',
      itemActiveColor: '#1a1c1f',
      itemHoverColor: '#1a1c1f',
      itemSelectedColor: '#1a1c1f',
      inkBarColor: '#339cff',
    },
    Input: { colorBgContainer: '#f4f4f6' },
    Button: { colorBgContainer: '#ffffff' },
    Modal: { contentBg: '#ffffff', headerBg: '#ffffff' },
    Message: {
      contentBg: '#ffffff',
      colorText: '#1a1c1f',
      contentPadding: '9px 14px',
    },
    Tag: {
      defaultBg: 'rgba(0,0,0,0.05)',
      defaultColor: '#1a1c1f',
    },
    Segmented: {
      trackBg: '#f4f4f6',
      trackPadding: 3,
      itemColor: '#52525b',
      itemHoverColor: '#1a1c1f',
      itemHoverBg: 'rgba(0,0,0,0.04)',
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#1a1c1f',
      borderRadius: 8,
      borderRadiusSM: 6,
    },
  },
};

function Root() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  // 同步到 <html data-theme="...">，让 CSS 能针对浅色做覆盖。
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  const cfg = theme === 'dark' ? darkConfig : lightConfig;

  return (
    <ConfigProvider theme={cfg}>
      <AntdApp message={{ top: 16 }} component={false}>
        <App theme={theme} onToggleTheme={toggleTheme} />
      </AntdApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
