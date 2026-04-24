import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Layout, Tabs, Card, Tag, Button, Empty, Typography, Space, Input, App as AntdApp, Modal, Tooltip, Segmented } from 'antd';
import { ClearOutlined, SearchOutlined, CopyOutlined } from '@ant-design/icons';
import { Link2, Link2Off, Eraser, Smartphone, SunMoon, Columns2, Columns3, X, Copy } from 'lucide-react';
import ReactJson from '@microlink/react-json-view';
import { Panel, Group, Separator, useDefaultLayout } from 'react-resizable-panels';
import './App.css';

const CONSOLE_MAX = 500;
const makeLogId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// 读 <html data-theme="..."> 并订阅变化，给模块级组件（比如 ReactJson 的 theme
// 切换）在不做 prop drilling 的情况下感知当前主题。
function useAppTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => obs.disconnect();
  }, []);
  return theme;
}
// react-json-view 在两种主题下的配色选择
const rjvTheme = (appTheme) => (appTheme === 'light' ? 'rjv-default' : 'monokai');

// ─── 开发用种子数据 ──────────────────────────────────────
// 启动时先给 UI 塞几条内容，不用每次跑测试脚本。
// WS 接到真连接或 session.start 会清空，不影响真实使用。
const HOST = 'https://api.acme.dev';
const nowMs = Date.now();
const ago = (s) => new Date(nowMs - s * 1000).toISOString();

const BEARER = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInJvbGVzIjpbImFkbWluIiwiY2xpbmljaWFuIl0sImlhdCI6MTcyOTY4MDAwMCwiZXhwIjoxNzI5NzY2NDAwfQ.3xH8_Zy-ll-QRm9R_Ht5Sb3F6xqPpVh2vL4M-nQxK8s';

const SEED_REQUESTS = [
  {
    id: 'seed-1', method: 'GET', url: `${HOST}/v2/users/me`,
    headers: {
      authorization: BEARER,
      accept: 'application/json',
      'x-device-id': 'ios-8F7A-DEVA-4B2C',
      'x-app-version': '2.4.1',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    body: null, status: 200, statusText: 'OK', duration: 142,
    responseBody: JSON.stringify({
      id: 42,
      name: 'Alice Chen',
      email: 'alice@acme.dev',
      phone: '+86 138 0013 8000',
      createdAt: '2024-03-15T08:22:00Z',
      avatar: 'https://cdn.acme.dev/avatar/42.jpg',
      profile: {
        theme: 'dark',
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        unitSystem: 'metric',
        notifications: { push: true, email: false, sms: true, inApp: true },
        privacy: { shareHealthData: false, analytics: true, crashReports: true },
      },
      devices: [
        { sn: 'BP7-0001', type: 'blood_pressure', model: 'BP7s', paired: true,  lastSync: 1729683600, firmware: '3.2.1' },
        { sn: 'BG5-1092', type: 'glucose',        model: 'BG5+', paired: true,  lastSync: 1729680000, firmware: '2.8.0' },
        { sn: 'PO3-0774', type: 'pulse_ox',       model: 'PO3',  paired: false, lastSync: null,       firmware: null    },
        { sn: 'WS1-9921', type: 'scale',          model: 'WS1',  paired: true,  lastSync: 1729590000, firmware: '1.4.2' },
      ],
      healthGoals: {
        weight:        { target: 65, current: 68.2, unit: 'kg', trend: 'decreasing' },
        bloodPressure: { targetSys: 120, targetDia: 80, avgSys: 128, avgDia: 82 },
        glucose:       { targetFastingMin: 4.4, targetFastingMax: 6.1, avg: 5.2 },
        steps:         { dailyTarget: 10000, weeklyAvg: 8542, todayCount: 6203 },
      },
      subscriptionTier: 'premium',
      featureFlags: ['ai-insights', 'family-sharing', 'labs', 'beta-charts', 'offline-sync'],
      stats: { measurements: 1284, consecutiveDays: 47, joinedDaysAgo: 406, lastActiveAt: '2026-04-24T09:15:22Z' },
    }, null, 2),
    timestamp: ago(30),
  },
  {
    id: 'seed-2', method: 'POST', url: `${HOST}/v2/measurements/bp`,
    headers: {
      'content-type': 'application/json',
      authorization: BEARER,
      'x-idempotency-key': 'bp-1729683600-a81f',
    },
    body: JSON.stringify({
      deviceSn: 'BP7-0001',
      measurements: [
        { systolic: 128, diastolic: 82, pulse: 72, takenAt: '2026-04-24T17:30:12Z', posture: 'sitting', arm: 'left', irregular: false },
        { systolic: 130, diastolic: 85, pulse: 74, takenAt: '2026-04-24T17:32:30Z', posture: 'sitting', arm: 'left', irregular: false },
        { systolic: 125, diastolic: 80, pulse: 70, takenAt: '2026-04-24T17:35:05Z', posture: 'sitting', arm: 'left', irregular: false },
      ],
      context: { mood: 'calm', activity: 'resting', beforeMeal: true, notes: '晨起测量' },
    }, null, 2),
    status: 201, statusText: 'Created', duration: 389,
    responseBody: JSON.stringify({
      success: true,
      accepted: 3,
      rejected: 0,
      measurements: [
        { id: 991823, serverTimestamp: '2026-04-24T17:30:12.347Z', anomaly: null },
        { id: 991824, serverTimestamp: '2026-04-24T17:32:30.582Z', anomaly: null },
        { id: 991825, serverTimestamp: '2026-04-24T17:35:05.109Z', anomaly: null },
      ],
      averages: { systolic: 127.67, diastolic: 82.33, pulse: 72 },
      warnings: [],
    }, null, 2),
    timestamp: ago(180),
  },
  {
    id: 'seed-3', method: 'GET', url: `${HOST}/v2/measurements/history?range=7d&type=bp`,
    headers: { accept: 'application/json', authorization: BEARER },
    body: null, status: 200, statusText: 'OK', duration: 211,
    responseBody: JSON.stringify({
      range: '7d',
      count: 11,
      items: [
        { id: 991812, systolic: 124, diastolic: 78, pulse: 68, takenAt: '2026-04-24T07:12:00Z' },
        { id: 991813, systolic: 132, diastolic: 86, pulse: 76, takenAt: '2026-04-23T21:45:00Z' },
        { id: 991814, systolic: 128, diastolic: 82, pulse: 72, takenAt: '2026-04-23T07:30:00Z' },
        { id: 991815, systolic: 126, diastolic: 80, pulse: 70, takenAt: '2026-04-22T22:10:00Z' },
        { id: 991816, systolic: 130, diastolic: 84, pulse: 74, takenAt: '2026-04-22T07:25:00Z' },
        { id: 991817, systolic: 125, diastolic: 79, pulse: 69, takenAt: '2026-04-21T21:50:00Z' },
        { id: 991818, systolic: 131, diastolic: 85, pulse: 73, takenAt: '2026-04-21T07:40:00Z' },
        { id: 991819, systolic: 127, diastolic: 81, pulse: 71, takenAt: '2026-04-20T22:00:00Z' },
        { id: 991820, systolic: 129, diastolic: 83, pulse: 72, takenAt: '2026-04-20T07:15:00Z' },
        { id: 991821, systolic: 124, diastolic: 78, pulse: 68, takenAt: '2026-04-19T21:55:00Z' },
        { id: 991822, systolic: 133, diastolic: 87, pulse: 76, takenAt: '2026-04-19T07:35:00Z' },
      ],
      stats: { avgSys: 128.1, avgDia: 82.1, avgPulse: 71.5, minSys: 124, maxSys: 133, trend: 'stable' },
      summary: { normalCount: 10, elevatedCount: 1, stage1Count: 0, stage2Count: 0 },
    }, null, 2),
    timestamp: ago(480),
  },
  {
    id: 'seed-4', method: 'POST', url: `${HOST}/v2/auth/refresh`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: 'rt-f28d91a7-88b1-4c37-b6e9-9a81f8b2a991', clientId: 'ios-app' }, null, 2),
    status: 401, statusText: 'Unauthorized', duration: 98,
    responseBody: JSON.stringify({
      error: 'token_expired',
      message: 'Refresh token has expired, please login again.',
      code: 40102,
      details: {
        issuedAt: '2026-03-10T08:00:00Z',
        expiredAt: '2026-04-10T08:00:00Z',
        gracePeriod: '7d',
        suggestedAction: 'full_reauth',
      },
    }, null, 2),
    timestamp: ago(960),
  },
  {
    id: 'seed-5', method: 'GET', url: 'https://cdn.acme.dev/banner/home.png',
    headers: { 'if-none-match': '"b1a4f"', accept: 'image/png,image/*,*/*;q=0.8' },
    body: null,
    status: 304, statusText: 'Not Modified', duration: 23,
    timestamp: ago(1620),
  },
  {
    id: 'seed-6', method: 'PUT', url: `${HOST}/v2/users/42/profile`,
    headers: { 'content-type': 'application/json', authorization: BEARER },
    body: JSON.stringify({
      theme: 'dark',
      locale: 'zh-CN',
      unitSystem: 'metric',
      notifications: { push: true, email: false, sms: true, inApp: true },
      privacy: { shareHealthData: false, analytics: true, crashReports: true },
      widgets: ['bp-trend', 'glucose-today', 'steps-ring', 'weight-monthly'],
    }, null, 2),
    status: 200, statusText: 'OK', duration: 218,
    responseBody: JSON.stringify({
      ok: true,
      updatedFields: ['theme', 'locale', 'unitSystem', 'notifications', 'privacy', 'widgets'],
      serverTimestamp: '2026-04-24T16:58:32Z',
    }, null, 2),
    timestamp: ago(2520),
  },
  {
    id: 'seed-7', method: 'DELETE', url: `${HOST}/v2/sessions/old`,
    headers: { authorization: BEARER },
    body: null, status: 204, statusText: 'No Content', duration: 67,
    timestamp: ago(3060),
  },
  {
    id: 'seed-8', method: 'POST', url: 'https://telemetry.acme.dev/events',
    headers: { 'content-type': 'application/json', 'x-batch-id': 'tel-7f3a-881c' },
    body: JSON.stringify({
      batchId: 'tel-7f3a-881c',
      sentAt: '2026-04-24T15:12:00Z',
      events: [
        { name: 'app_open',          ts: 1729676400, props: { source: 'notification', cold: true } },
        { name: 'screen_home',       ts: 1729676401, props: { durationMs: 120 } },
        { name: 'tap',               ts: 1729676413, props: { target: 'add_measurement_fab' } },
        { name: 'screen_bp',         ts: 1729676415, props: { durationMs: 45 } },
        { name: 'ble_connect',       ts: 1729676420, props: { deviceSn: 'BP7-0001', rtt: 180 } },
        { name: 'measurement_start', ts: 1729676425, props: { deviceSn: 'BP7-0001', type: 'bp' } },
      ],
    }, null, 2),
    status: 'error', error: 'Request timeout after 5000ms', duration: 5000,
    timestamp: ago(7200),
  },
];

const SEED_LOGS = [
  { id: 'log-1', method: 'log', data: [
    'App launched',
    { version: '2.4.1', build: 'iOS-20260424-001', platform: 'iOS', model: 'iPhone 15 Pro Max', osVersion: '18.4.2' },
  ], timestamp: ago(70) },
  { id: 'log-2', method: 'info', data: [
    'User session restored',
    {
      user: { id: 42, name: 'Alice Chen', email: 'alice@acme.dev', roles: ['admin', 'clinician'] },
      session: { token: 'sess_ab9f2c7e_b88a1f5d_dc0e9b41', issuedAt: '2026-04-24T08:00:00Z', expiresAt: '2026-04-25T08:00:00Z' },
      preferences: { locale: 'zh-CN', theme: 'dark', unitSystem: 'metric', notifications: { push: true, email: false } },
      devices: [
        { sn: 'BP7-0001', type: 'blood_pressure', lastSync: 1729683600 },
        { sn: 'BG5-1092', type: 'glucose',        lastSync: 1729680000 },
        { sn: 'PO3-0774', type: 'pulse_ox',       lastSync: null       },
      ],
    },
  ], timestamp: ago(62) },
  { id: 'log-3', method: 'warn', data: [
    'Slow network detected (rtt=420ms)',
    { carrier: 'CMCC', networkType: '4G', signalDbm: -92, rttMs: 420, bandwidthMbps: 2.3, suggestedAction: 'reduce_payload' },
  ], timestamp: ago(40) },
  { id: 'log-4', method: 'error', data: [
    'Auth refresh failed:',
    'token_expired',
    {
      status: 401,
      retry: false,
      trace: ['auth.refresh', 'api.v2.authService', 'middleware.session', 'http.client'],
      context: { userId: 42, lastValidAt: '2026-04-24T09:00:00Z', correlationId: 'corr-8f1d-22a7' },
    },
  ], timestamp: ago(18) },
  { id: 'log-5', method: 'debug', data: [
    'Ring buffer size:',
    'network=8',
    'console=5',
    { maxNetwork: 500, maxConsole: 500, flushIntervalMs: 2000 },
  ], timestamp: ago(10) },
  { id: 'log-6', method: 'log', data: [
    'Active feature flags:',
    ['new-onboarding', 'bluetooth-v2', 'offline-sync', 'ai-insights', 'chart-v3', 'family-sharing', 'labs'],
  ], timestamp: ago(7) },
  // JS 7 种类型各传一个 arg，让 formatArg 分别格式化。
  // 顺序：undefined / null / boolean / number / string / symbol / bigint
  // 注：Symbol/BigInt 放对象里会被 JSON.stringify 静默丢 key 或抛错，所以作为独立 arg 传。
  { id: 'log-7', method: 'info', data: [
    'All 7 JS primitive types:',
    undefined,
    null,
    true,
    3.141592653589793,
    'hello, 世界 🌍',
    Symbol('event.id'),
    9007199254740993n,
  ], timestamp: ago(4) },
  { id: 'log-8', method: 'debug', data: [
    'Object + array showcase:',
    {
      empty: {},
      emptyArr: [],
      nested: { a: { b: { c: { d: 'deep' } } } },
      mixed: [1, 'two', true, null, { k: 'v' }],
    },
  ], timestamp: ago(2) },
];

// 极简：把 console.log 的参数转成文本。不折叠、不带树。
// 对象默认单行紧凑；若单行超过 120 字符就换成 2 缩进多行。
const formatArg = (arg) => {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (arg instanceof Error || (arg && arg.stack)) return arg.stack || String(arg);
  try {
    const inline = JSON.stringify(arg);
    if (inline.length <= 120) return inline;
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
};

const LEVEL_STYLE = {
  log:   { fg: 'var(--fg-log)', bg: 'transparent',              tag: 'var(--fg-muted)' },
  info:  { fg: 'var(--level-info-fg)', bg: 'var(--level-info-bg)',    tag: 'var(--accent)' },
  warn:  { fg: 'var(--level-warn-fg)', bg: 'var(--level-warn-bg)',    tag: 'var(--status-warn)' },
  error: { fg: 'var(--status-error-soft)', bg: 'var(--level-error-bg)',   tag: 'var(--status-error)' },
  debug: { fg: 'var(--level-debug-fg)', bg: 'transparent',              tag: 'var(--level-debug-tag)' },
};

// 级别筛选 chip：三轴拉开选中/未选中的对比，避免 LOG 这种本身就是灰的级别在关闭时和打开时难以区分。
// - 关：极暗灰文字（#3f3f46）、透明底、透明边；hover 时浅高亮
// - 开：语义色文字 + 语义色底（16% 透明）+ 语义色边框（40% 透明）
function LevelChip({ level, checked, onChange }) {
  const [hover, setHover] = useState(false);
  const tag = (LEVEL_STYLE[level] && LEVEL_STYLE[level].tag) || 'var(--fg-muted)';
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 10px',
        fontSize: 10,
        lineHeight: 1.6,
        fontFamily: 'inherit',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        borderRadius: 999,
        border: `1px solid ${checked ? `${tag}66` : 'transparent'}`,
        background: checked
          ? `${tag}2a`
          : hover ? 'var(--surface-04)' : 'transparent',
        color: checked ? tag : 'var(--fg-faint)',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        userSelect: 'none',
      }}
    >
      {level}
    </button>
  );
}

// 判断一个值要不要用 ReactJson 渲染（可展开收起）。
// - null/undefined → 走 text（因为 typeof null === 'object'，要单独排除）
// - Symbol / BigInt / primitive → 走 text
// - 纯对象 / 数组 → 走 ReactJson
const isExpandable = (arg) => arg !== null && typeof arg === 'object';

function SimpleConsoleLine({ log }) {
  const appTheme = useAppTheme();
  const s = LEVEL_STYLE[log.method] || LEVEL_STYLE.log;
  const ts = log.timestamp
    ? (typeof log.timestamp === 'string' ? log.timestamp.slice(11, 23) : new Date(log.timestamp).toISOString().slice(11, 23))
    : '';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '2px 12px',
      borderBottom: '1px solid var(--surface-04)',
      background: s.bg,
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace',
      fontSize: 12, lineHeight: 1.45,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        flexShrink: 0, minWidth: 78, gap: 1,
      }}>
        <span style={{
          color: s.tag, fontWeight: 600, fontSize: 10, lineHeight: 1.2,
          textTransform: 'uppercase',
        }}>{log.method}</span>
        <span style={{ color: 'var(--fg-subtle)', fontSize: 11, lineHeight: 1.2 }}>{ts}</span>
      </div>
      <div style={{
        flex: 1, color: s.fg,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        minWidth: 0,
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
        columnGap: 12, rowGap: 2,
      }}>
        {log.data.map((a, i) => (
          isExpandable(a) ? (
            <div key={i} className="dense-json" style={{ width: '100%' }}>
              <ReactJson
                src={a}
                theme={rjvTheme(appTheme)}
                collapsed={1}
                displayDataTypes={false}
                displayObjectSize={false}
                enableClipboard={false}
                name={false}
                style={{
                  fontSize: 12,
                  background: 'transparent',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          ) : (
            <span key={i}>{formatArg(a)}</span>
          )
        ))}
      </div>
    </div>
  );
}

// ─── Network list · shadcn / zinc 风格 ─────────────────────────────
//
// 设计 token 完全照 shadcn default dark (zinc 主题)：
//   --background:       #17171a
//   --foreground:       #fafafa
//   --muted-foreground: #71717a
//   --border:           rgba(255,255,255,0.08)
//   --accent:           rgba(255,255,255,0.06)
//
// 样式走 style 对象，先不引 Tailwind；后面真要上 Radix 原子组件
// （Command / ScrollArea 之类）再一起切到 Tailwind v4 + shadcn CLI。

function getDisplayUrl(url) {
  try {
    const u = new URL(url);
    return (u.pathname + u.search) || '/';
  } catch { return url; }
}

function formatRelative(ts) {
  if (!ts) return '';
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function statusDotColor(status) {
  if (status === 'pending') return 'var(--fg-muted)';
  if (status === 'error') return 'var(--status-error)';
  if (status >= 200 && status < 300) return 'var(--status-success-alt)';
  if (status >= 300 && status < 400) return 'var(--status-warn-dot)';
  return 'var(--status-error)';
}

function NetworkRow({ req, selected, onSelect }) {
  const [hover, setHover] = useState(false);
  const bg = selected
    ? 'var(--surface-06)'
    : hover ? 'var(--surface-03)' : 'transparent';

  return (
    <div
      onClick={() => onSelect(req)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 12px',
        cursor: 'pointer',
        background: bg,
        borderRadius: 8,
        transition: 'background 0.12s',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: statusDotColor(req.status),
        flexShrink: 0,
      }} />
      <div style={{
        flex: 1, minWidth: 0,
        fontSize: 12,
        color: selected ? 'var(--fg-primary)' : 'var(--fg-secondary)',
        fontWeight: selected ? 500 : 400,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.003em',
      }}>
        {getDisplayUrl(req.url)}
      </div>
      <span style={{
        fontSize: 11,
        color: 'var(--fg-muted)',
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {formatRelative(req.timestamp)}
      </span>
    </div>
  );
}

// JSON 字符串 → 对象；解析失败则原样返回字符串。
function parseBodyLoose(body) {
  if (body == null) return null;
  if (typeof body !== 'string') return body;
  try { return JSON.parse(body); } catch { return body; }
}

function statusTagColor(status) {
  if (status === 'pending' || status === 'error') return 'default';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'warning';
  if (status >= 400) return 'error';
  return 'default';
}

// 详情预览浮层：仅在 2 栏模式（隐藏详情面板时）由 hover / click 触发。
// 内容复用详情面板的 Card + ReactJson 呈现，保证两种视图一致。
function RequestPreview({ req, onClose, onMouseEnter, onMouseLeave }) {
  const { message } = AntdApp.useApp();
  const appTheme = useAppTheme();
  if (!req) return null;

  const copy = (text) => {
    if (text == null) return;
    const str = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    navigator.clipboard.writeText(str)
      .then(() => message.success('Copied to clipboard'))
      .catch(() => message.error('Failed to copy'));
  };

  const renderJson = (data) => {
    const parsed = typeof data === 'string' ? parseBodyLoose(data) : data;
    if (typeof parsed === 'object' && parsed !== null) {
      return (
        <div className="dense-json">
          <ReactJson
            src={parsed}
            theme={rjvTheme(appTheme)}
            collapsed={1}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            style={{
              fontSize: 12,
              background: 'transparent',
              fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          />
        </div>
      );
    }
    return (
      <pre style={{
        margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        fontFamily: 'inherit', color: 'var(--fg-secondary)',
      }}>{String(data)}</pre>
    );
  };

  const hasHeaders = req.headers && Object.keys(req.headers).length > 0;
  const hasReqBody = req.body != null && req.body !== '';
  const hasRespBody = req.responseBody != null && req.responseBody !== '';

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: 720,
        height: '86vh',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--fg-primary)',
      }}
    >
      {/* Title bar: "Details" label + prominent close ✕ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 10px 10px 16px',
        borderBottom: '1px solid var(--surface-08)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: 'var(--fg-tertiary)',
        }}>Request Details</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          title="关闭"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, padding: 0,
            background: 'var(--surface-08)',
            border: '1px solid var(--surface-10)',
            borderRadius: 8,
            color: 'var(--fg-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--status-error-wash)';
            e.currentTarget.style.borderColor = 'var(--status-error-ring)';
            e.currentTarget.style.color = 'var(--status-error-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface-08)';
            e.currentTarget.style.borderColor = 'var(--surface-10)';
            e.currentTarget.style.color = 'var(--fg-primary)';
          }}
        >
          <X size={18} strokeWidth={2.25} />
        </button>
      </div>

      {/* Scrollable content — Card 风格和详情面板保持一致 */}
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '16px 16px 20px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card
            title={
              <Space>
                <span>Request URL</span>
                <Tag color="blue">{req.method}</Tag>
              </Space>
            }
            size="small"
          >
            <Typography.Paragraph
              copyable={{ text: req.url }}
              style={{ margin: 0, fontSize: 12, fontFamily: 'inherit', wordBreak: 'break-all' }}
            >
              {req.url}
            </Typography.Paragraph>
          </Card>

          {hasHeaders && (
            <Card title="Headers" size="small">
              {renderJson(req.headers)}
            </Card>
          )}

          {hasReqBody && (
            <Card
              title="Body"
              size="small"
              extra={
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copy(req.body)}
                >Copy</Button>
              }
            >
              {renderJson(req.body)}
            </Card>
          )}

          {req.status === 'pending' ? (
            <Card size="small"><Empty description="Request is pending…" /></Card>
          ) : req.status === 'error' ? (
            <Card size="small">
              <Typography.Text type="danger">
                {req.error || 'Request failed'}
              </Typography.Text>
            </Card>
          ) : (
            <>
              <Card title="Status" size="small">
                <Tag color={statusTagColor(req.status)}>
                  {req.status}{req.statusText ? ` ${req.statusText}` : ''}
                </Tag>
                {Number.isFinite(req.duration) && (
                  <Tag style={{ marginLeft: 8 }}>{req.duration}ms</Tag>
                )}
              </Card>
              {hasRespBody && (
                <Card
                  title="Response Body"
                  size="small"
                  extra={
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={() => copy(req.responseBody)}
                    >Copy</Button>
                  }
                >
                  {renderJson(req.responseBody)}
                </Card>
              )}
            </>
          )}
        </Space>
      </div>
    </div>
  );
}

function DarkNetworkList({ requests, filteredRequests, searchText, setSearchText, selected, onSelect, onClear, showDetails, onToggleDetails }) {
  const [searchFocus, setSearchFocus] = useState(false);
  // Preview 浮层状态（仅 !showDetails 时生效）
  const [previewId, setPreviewId] = useState(null);
  const [pinned, setPinned] = useState(false);
  const closeTimerRef = useRef(null);
  // pinned 的镜像 ref — scheduleClose 的 setTimeout 回调会延迟执行，
  // 读 state 闭包会拿到旧值；走 ref 能读到最新 pinned 状态。
  const pinnedRef = useRef(false);
  useEffect(() => { pinnedRef.current = pinned; }, [pinned]);

  // 浮层定位：整个 Network 面板的右边 + 外间距，垂直方向始终在视口中央，
  // 不跟随 hover 的行位置走，避免 popup 超出视口导致内容被切。
  const listRootRef = useRef(null);
  const [anchorLeft, setAnchorLeft] = useState(0);
  useEffect(() => {
    if (!previewId) return;
    const el = listRootRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setAnchorLeft(rect.right + 20);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [previewId]);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (!pinnedRef.current) setPreviewId(null);
    }, 140);
  };
  const openHover = (req) => {
    // pinned 时不允许 hover 切换到别的行
    if (pinned) return;
    cancelClose();
    setPreviewId(req.id);
  };
  const pin = (req) => {
    cancelClose();
    setPreviewId(req.id);
    setPinned(true);
  };
  const closePreview = () => {
    cancelClose();
    setPreviewId(null);
    setPinned(false);
  };

  // 切换到三栏模式时，关闭浮层，避免残留
  useEffect(() => {
    if (showDetails) closePreview();
  }, [showDetails]);
  // 卸载时清理定时器
  useEffect(() => () => cancelClose(), []);

  // 当前要预览的 req 对象
  const previewReq = previewId
    ? (filteredRequests.find(r => r.id === previewId) || requests.find(r => r.id === previewId))
    : null;

  // 进出场动画：用 mountedReq 保留一帧供退出动画播放，
  // open 控制 CSS 类切换；unmount 比 open=false 再晚 200ms，跟 transition 时长对齐。
  const [mountedReq, setMountedReq] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (previewReq && !showDetails) {
      setMountedReq(previewReq);
      const r = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(r);
    }
    setOpen(false);
    const t = setTimeout(() => setMountedReq(null), 200);
    return () => clearTimeout(t);
  }, [previewReq, showDetails]);
  // 每 10s 强制重渲染一次，让相对时间"8m → 9m"自动滚动
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div ref={listRootRef} style={{
      height: '100%',
      color: 'var(--fg-primary)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    }}>
      {/* header: title + count + clear */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)',
            letterSpacing: '-0.01em',
          }}>Network</span>
          <span style={{
            fontSize: 12, color: 'var(--fg-subtle)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {searchText ? `${filteredRequests.length}/${requests.length}` : requests.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            onClick={onClear}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--fg-muted)', fontSize: 12,
              cursor: 'pointer', padding: '4px 8px',
              borderRadius: 6, transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--fg-primary)';
              e.currentTarget.style.background = 'var(--surface-06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >Clear</button>
          <button
            onClick={onToggleDetails}
            title={showDetails ? '隐藏请求详情（仅保留 Network 与 Console）' : '显示请求详情'}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer', padding: '4px 6px',
              borderRadius: 6, transition: 'all 0.15s',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--fg-primary)';
              e.currentTarget.style.background = 'var(--surface-06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {showDetails ? <Columns3 size={14} /> : <Columns2 size={14} />}
          </button>
        </div>
      </div>

      {/* search */}
      <div style={{ padding: '0 12px 10px' }}>
        <div style={{ position: 'relative' }}>
          <SearchOutlined style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--fg-subtle)', fontSize: 12, pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            placeholder="Filter requests…"
            style={{
              width: '100%',
              height: 32,
              padding: '0 10px 0 30px',
              background: 'var(--bg-panel)',
              border: `1px solid ${searchFocus ? 'var(--surface-15)' : 'var(--surface-08)'}`,
              borderRadius: 8,
              color: 'var(--fg-primary)',
              fontSize: 13,
              outline: 'none',
              boxShadow: searchFocus ? '0 0 0 3px var(--surface-04)' : 'none',
              transition: 'all 0.15s',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {filteredRequests.length === 0 ? (
          <div style={{
            padding: '48px 20px',
            textAlign: 'center',
            color: 'var(--fg-faint)',
            fontSize: 13,
          }}>
            {searchText ? 'No matching requests' : 'Waiting for requests…'}
          </div>
        ) : (
          filteredRequests.map(req => {
            // 三栏模式：常规列表行，点击即选中到详情面板
            if (showDetails) {
              return (
                <NetworkRow
                  key={req.id}
                  req={req}
                  selected={selected?.id === req.id}
                  onSelect={onSelect}
                />
              );
            }
            // 两栏模式：hover 弹出预览；点击钉住（不再自动消失）
            return (
              <div
                key={req.id}
                onMouseEnter={() => openHover(req)}
                onMouseLeave={scheduleClose}
              >
                <NetworkRow
                  req={req}
                  selected={selected?.id === req.id}
                  onSelect={(r) => { onSelect(r); pin(r); }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* 全局单实例预览浮层：通过 portal 挂到 body，固定定位在 Network
       * 面板右边 + 20px，垂直方向永远是视口中央，避免 hover 到底部的行时
       * popup 被视口裁切。 */}
      {mountedReq && createPortal(
        <div
          className={`request-preview-wrap${open ? ' request-preview-wrap--open' : ''}`}
          style={{
            position: 'fixed',
            left: anchorLeft,
            top: '50%',
            zIndex: 1050,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--surface-08)',
            borderRadius: 12,
            boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          <RequestPreview
            req={mountedReq}
            onClose={closePreview}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function SimpleConsole({ logs, search, levels }) {
  const filtered = logs.filter(l => {
    if (!levels.includes(l.method)) return false;
    if (search) {
      const needle = search.toLowerCase();
      const hay = l.data.map(formatArg).join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  return (
    <div>
      {filtered.map(l => <SimpleConsoleLine key={l.id} log={l} />)}
    </div>
  );
}

const { Content } = Layout;
const { Text, Paragraph, Title } = Typography;

function App({ theme = 'dark', onToggleTheme }) {
  const { message, modal } = AntdApp.useApp();
  const [status, setStatus] = useState('waiting');
  const [networkRequests, setNetworkRequests] = useState(SEED_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState(SEED_LOGS);
  const [consoleSearch, setConsoleSearch] = useState('');
  const [consoleLevels, setConsoleLevels] = useState(['log', 'info', 'warn', 'error', 'debug']);
  const [detailTab, setDetailTab] = useState('request');

  // 是否展示中间的 Details 板块；启动时从 localStorage 恢复，默认展示
  const [showDetails, setShowDetails] = useState(() => {
    const v = localStorage.getItem('network-debugger-show-details');
    return v === null ? true : v !== 'false';
  });
  useEffect(() => {
    localStorage.setItem('network-debugger-show-details', String(showDetails));
  }, [showDetails]);

  // 布局存档与 showDetails 绑定：3 栏 vs 2 栏的宽度比例独立存储，切换时不互相污染
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: showDetails ? 'network-debugger-layout-v2-3col' : 'network-debugger-layout-v2-2col',
    storage: localStorage,
  });

  useEffect(() => {
    const hasShownTip = localStorage.getItem('android-tip-shown');
    if (!hasShownTip) {
      setShowAndroidModal(true);
      localStorage.setItem('android-tip-shown', 'true');
    }
  }, []);

  const showAndroidTip = () => {
    modal.info({
      title: 'Android 设备连接提示',
      content: (
        <div>
          <p>如果 Android 设备无法连接，请在终端执行以下命令：</p>
          <Input.TextArea
            value="adb reverse tcp:8989 tcp:8989"
            readOnly
            autoSize
            style={{ marginTop: 8, fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
          />
          <Button
            icon={<CopyOutlined />}
            size="small"
            style={{ marginTop: 8 }}
            onClick={() => {
              navigator.clipboard.writeText('adb reverse tcp:8989 tcp:8989');
              message.success('已复制到剪贴板');
            }}
          >
            复制命令
          </Button>
        </div>
      ),
      okText: '知道了'
    });
  };

  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8989');
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // 不在这里清空 —— 只有 RN 端发 session.start 或用户点 Clear 时才清，
      // 否则种子/既有数据会被 UI 自己的连接清掉。
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.channel === 'network') {
          handleNetwork(data);
        } else if (data.channel === 'console') {
          handleConsole(data);
        } else if (data.channel === 'session' && data.type === 'start') {
          // RN 新会话（reload 或首次启动），清空旧数据
          setNetworkRequests([]);
          setSelectedRequest(null);
          setSearchText('');
          setConsoleLogs([]);
          console.clear();
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onclose = () => {
      setStatus('waiting');
    };

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, []);

  const handleNetwork = (data) => {
    if (data.type === 'request') {
      setNetworkRequests(prev => [{
        id: data.id,
        method: data.method,
        url: data.url,
        headers: data.headers,
        body: data.body,
        status: 'pending',
        timestamp: Date.now()
      }, ...prev]);
    }
    else if (data.type === 'response') {
      setNetworkRequests(prev => prev.map(req =>
        req.id === data.id
          ? { ...req, status: data.status, statusText: data.statusText, responseBody: data.body, duration: data.duration }
          : req
      ));
    }
    else if (data.type === 'error') {
      setNetworkRequests(prev => prev.map(req =>
        req.id === data.id
          ? { ...req, status: 'error', error: data.error, duration: data.duration }
          : req
      ));
    }
  };

  const handleConsole = (data) => {
    // 1) 原行为保留：把日志转到宿主 DevTools 的 console，方便老用户
    const consoleMethod = console[data.type] || console.log;
    consoleMethod(...data.args);

    // 2) 新增：喂给 console-feed 面板
    const entry = {
      id: makeLogId(),
      method: data.type || 'log',
      data: data.args || [],
      timestamp: data.timestamp,
    };
    setConsoleLogs(prev => {
      const next = prev.length >= CONSOLE_MAX ? prev.slice(-(CONSOLE_MAX - 1)) : prev.slice();
      next.push(entry);
      return next;
    });
  };

  const clearAll = () => {
    setNetworkRequests([]);
    setSelectedRequest(null);
    setSearchText('');
    setConsoleLogs([]);
    console.clear();
    // 同时通知主进程清空环形缓冲区，保持 UI 和 MCP 数据一致
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ channel: 'session', type: 'clear' }));
    }
  };

  const generateCurl = (req) => {
    let curl = `curl -X ${req.method} '${req.url}'`;

    if (req.headers) {
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'host') {
          curl += ` \\\n  -H '${key}: ${value}'`;
        }
      });
    }

    if (req.body) {
      curl += ` \\\n  -d '${req.body}'`;
    }

    return curl;
  };

  const parseBody = (body) => {
    if (!body) return null;
    try {
      return JSON.parse(body);
    } catch (e) {
      return body;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Copied to clipboard');
    }).catch(() => {
      message.error('Failed to copy');
    });
  };

  const getStatusColor = (status) => {
    if (status === 'pending' || status === 'error') return 'default';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400 && status < 500) return 'error';
    return 'error';
  };

  const getStatusText = (req) => {
    if (req.status === 'pending') return '...';
    if (req.status === 'error') return 'ERROR';
    return req.status;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // 高亮搜索文本
  const highlightText = (text, search) => {
    if (!search || !text) return text;
    const textStr = String(text);

    const parts = textStr.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase()
        ? <mark key={i} style={{ background: 'var(--highlight-bg)', color: 'var(--highlight-fg)', padding: '0 2px', borderRadius: 2 }}>{part}</mark>
        : part
    );
  };

  // 渲染带高亮的 JSON（当有搜索词时使用）
  const renderJsonWithHighlight = (data, search) => {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    if (!search) {
      return (
        <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {jsonStr}
        </pre>
      );
    }

    return (
      <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {highlightText(jsonStr, search)}
      </pre>
    );
  };

  // 渲染 JSON 内容（有搜索词时高亮，否则使用 ReactJson）
  const renderJsonContent = (data, search) => {
    const parsed = typeof data === 'string' ? parseBody(data) : data;

    // 有搜索词时，使用带高亮的纯文本渲染
    if (search && search.trim()) {
      return renderJsonWithHighlight(parsed, search);
    }

    // 没有搜索词时，使用 ReactJson 组件
    if (typeof parsed === 'object' && parsed !== null) {
      return (
        <ReactJson
          src={parsed}
          theme={rjvTheme(theme)}
          collapsed={1}
          displayDataTypes={false}
          displayObjectSize={false}
          enableClipboard={false}
          style={{
            fontSize: '12px',
            background: 'transparent',
            fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}
        />
      );
    }

    return (
      <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {data}
      </pre>
    );
  };

  // 递归搜索对象中的所有字符串值
  const searchInObject = (obj, searchLower) => {
    if (!obj) return false;

    if (typeof obj === 'string') {
      return obj.toLowerCase().includes(searchLower);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj).toLowerCase().includes(searchLower);
    }

    if (Array.isArray(obj)) {
      return obj.some(item => searchInObject(item, searchLower));
    }

    if (typeof obj === 'object') {
      return Object.values(obj).some(value => searchInObject(value, searchLower));
    }

    return false;
  };

  // 过滤网络请求
  const filteredRequests = useMemo(() => {
    if (!searchText.trim()) {
      return networkRequests;
    }

    const searchLower = searchText.toLowerCase();

    return networkRequests.filter(req => {
      // 搜索 URL
      if (req.url && req.url.toLowerCase().includes(searchLower)) {
        return true;
      }

      // 搜索请求头
      if (req.headers && searchInObject(req.headers, searchLower)) {
        return true;
      }

      // 搜索请求体
      if (req.body && searchInObject(req.body, searchLower)) {
        return true;
      }

      // 搜索响应体
      if (req.responseBody && searchInObject(req.responseBody, searchLower)) {
        return true;
      }

      return false;
    });
  }, [networkRequests, searchText]);

  const renderRequestTab = () => {
    if (!selectedRequest) return null;

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '0 12px 20px' }}>
        <div className="detail-tab-stack">
          <Card
            title={
              <Space>
                <span>Request URL</span>
                <Tag color="blue">{selectedRequest.method}</Tag>
              </Space>
            }
            size="small"
          >
            <Paragraph copyable style={{ margin: 0 }}>
              {selectedRequest.url}
            </Paragraph>
          </Card>

          {selectedRequest.headers && (
            <Card title="Headers" size="small">
              {renderJsonContent(selectedRequest.headers, searchText)}
            </Card>
          )}

          {selectedRequest.body && (
            <Card
              title="Body"
              size="small"
              extra={
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(selectedRequest.body)}
                >
                  Copy
                </Button>
              }
            >
              {renderJsonContent(selectedRequest.body, searchText)}
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderResponseTab = () => {
    if (!selectedRequest) return null;

    if (selectedRequest.status === 'pending') {
      return <div style={{ height: '100%', overflow: 'auto', padding: '0 12px 20px' }}><Empty description="Request is pending..." /></div>;
    }

    if (selectedRequest.status === 'error') {
      return (
        <div style={{ height: '100%', overflow: 'auto', padding: '0 12px 20px' }}>
          <Card>
            <Text type="danger">{selectedRequest.error || 'Request failed'}</Text>
          </Card>
        </div>
      );
    }

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '0 12px 20px' }}>
        <div className="detail-tab-stack">
          <Card title="Status" size="small">
            <Tag color={getStatusColor(selectedRequest.status)}>
              {selectedRequest.status} {selectedRequest.statusText}
            </Tag>
            {selectedRequest.duration && (
              <Tag style={{ marginLeft: 8 }}>
                {selectedRequest.duration}ms
              </Tag>
            )}
          </Card>

          {selectedRequest.responseBody && (
            <Card
              title="Response Body"
              size="small"
              extra={
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(selectedRequest.responseBody)}
                >
                  Copy
                </Button>
              }
            >
              {renderJsonContent(selectedRequest.responseBody, searchText)}
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderCurlTab = () => {
    if (!selectedRequest) return null;

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '0 12px 20px' }}>
        <Card
          title="cURL Command"
          size="small"
          extra={
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => copyToClipboard(generateCurl(selectedRequest))}
            >
              Copy
            </Button>
          }
        >
          <pre
            style={{
              margin: 0,
              background: 'var(--bg-panel)',
              color: 'var(--fg-secondary)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--surface-06)',
              fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
          >
            {generateCurl(selectedRequest)}
          </pre>
        </Card>
      </div>
    );
  };

  const detailContent =
    detailTab === 'request' ? renderRequestTab() :
    detailTab === 'response' ? renderResponseTab() :
    renderCurlTab();

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const mcpEndpoint = `http://localhost:${window.location.port && window.location.port !== '5173' ? window.location.port : '8989'}/mcp`;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      padding: '10px',
      gap: '10px',
      boxSizing: 'border-box',
    }}>
      <div
        className="titlebar"
        style={{
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: isMac ? '84px' : '16px',
          paddingRight: '12px',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* 左侧：标题 */}
        <span style={{ color: 'var(--fg-primary)', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
          Remote Console Debugger
        </span>

        {/* 可拖拽空白区 */}
        <div style={{ flex: 1 }} />

        {/* 右侧：状态和操作 */}
        <div
          className="titlebar-no-drag"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <button type="button" className="pill-btn">
            {status === 'connected' ? (
              <>
                <Link2 size={14} strokeWidth={2} color="var(--status-success)" />
                <span style={{ color: 'var(--status-success)' }}>Connected</span>
              </>
            ) : (
              <>
                <Link2Off size={14} strokeWidth={2} color="var(--status-error)" />
                <span style={{ color: 'var(--status-error)' }}>Waiting</span>
              </>
            )}
          </button>

          <Tooltip title={`点击复制 MCP 端点: ${mcpEndpoint}`} placement="left">
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                navigator.clipboard.writeText(mcpEndpoint);
                message.success('MCP 端点已复制');
              }}
            >
              <Copy size={14} strokeWidth={2} />
              <span>MCP</span>
            </button>
          </Tooltip>

          <Tooltip title="清空日志与请求" placement="left">
            <button type="button" className="pill-btn" onClick={clearAll}>
              <Eraser size={14} strokeWidth={2} />
              <span>Clear</span>
            </button>
          </Tooltip>

          <Tooltip title="Android 连接提示" placement="left">
            <button type="button" className="pill-btn" onClick={showAndroidTip}>
              <Smartphone size={14} strokeWidth={2} />
              <span>Android</span>
            </button>
          </Tooltip>

          <Tooltip title={theme === 'dark' ? '切到浅色主题' : '切到深色主题'} placement="left">
            <button
              type="button"
              className="pill-btn"
              onClick={onToggleTheme}
            >
              <SunMoon size={14} strokeWidth={2} />
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </Tooltip>
        </div>
      </div>

      <Layout style={{
        flex: 1,
        minHeight: 0,
        background: 'transparent',
      }}>
        <Group
          key={showDetails ? '3col' : '2col'}
          orientation="horizontal"
          defaultLayout={
            defaultLayout ?? (showDetails
              ? { 'network-list': 30, 'details': 35, 'console': 35 }
              : { 'network-list': 40, 'console': 60 })
          }
          onLayoutChanged={onLayoutChanged}
        >
          <Panel
            id="network-list"
            defaultSize="30%"
            minSize="15%"
            maxSize="60%"
          >
            <div className="card card--side-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <DarkNetworkList
                requests={networkRequests}
                filteredRequests={filteredRequests}
                searchText={searchText}
                setSearchText={setSearchText}
                selected={selectedRequest}
                onSelect={setSelectedRequest}
                onClear={clearAll}
                showDetails={showDetails}
                onToggleDetails={() => setShowDetails(v => !v)}
              />
            </div>
          </Panel>

          {showDetails && (
            <>
              <Separator className="resize-handle" />

              <Panel
                id="details"
                defaultSize="35%"
                minSize="20%"
                maxSize="70%"
              >
                <div className="card card--side-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Content style={{ background: 'transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                    {selectedRequest ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 12px 10px', flexShrink: 0 }}>
                          <Segmented
                            value={detailTab}
                            onChange={setDetailTab}
                            size="middle"
                            options={[
                              { label: 'Request', value: 'request' },
                              { label: 'Response', value: 'response' },
                              { label: 'cURL', value: 'curl' },
                            ]}
                            style={{
                              border: '1px solid var(--surface-08)',
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                          {detailContent}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Empty
                          description="Select a network request to view details"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </div>
                    )}
                  </Content>
                </div>
              </Panel>
            </>
          )}

          <Separator className="resize-handle" />

          <Panel
            id="console"
            defaultSize="35%"
            minSize="15%"
            maxSize="60%"
          >
            <div className="card card--side-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--surface-08)',
                display: 'flex', alignItems: 'center', gap: 8,
                flexShrink: 0,
              }}>
                <Input
                  placeholder="Filter console"
                  prefix={<SearchOutlined />}
                  value={consoleSearch}
                  onChange={(e) => setConsoleSearch(e.target.value)}
                  allowClear
                  style={{ flex: 1, minWidth: 0, height: 32 }}
                />
                <Button
                  icon={<ClearOutlined />}
                  size="small"
                  onClick={() => setConsoleLogs([])}
                  title="Clear console"
                />
              </div>
              <div style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--surface-08)',
                display: 'flex', alignItems: 'center', gap: 4,
                flexShrink: 0,
                flexWrap: 'wrap',
              }}>
                {['log', 'info', 'warn', 'error', 'debug'].map(lvl => (
                  <LevelChip
                    key={lvl}
                    level={lvl}
                    checked={consoleLevels.includes(lvl)}
                    onChange={(checked) => {
                      setConsoleLevels(prev => checked
                        ? Array.from(new Set([...prev, lvl]))
                        : prev.filter(l => l !== lvl));
                    }}
                  />
                ))}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  {consoleLogs.length} / {CONSOLE_MAX}
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {consoleLogs.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No console output yet"
                    />
                  </div>
                ) : (
                  <SimpleConsole
                    logs={consoleLogs}
                    search={consoleSearch}
                    levels={consoleLevels}
                  />
                )}
              </div>
            </div>
          </Panel>
        </Group>
      </Layout>

      <Modal
        title="Android 设备连接提示"
        open={showAndroidModal}
        onOk={() => setShowAndroidModal(false)}
        onCancel={() => setShowAndroidModal(false)}
        okText="知道了"
        cancelText="关闭"
      >
        <div>
          <p>如果 Android 设备无法连接，请在终端执行以下命令：</p>
          <Input.TextArea
            value="adb reverse tcp:8989 tcp:8989"
            readOnly
            autoSize
            style={{ marginTop: 8, fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
          />
          <Button
            icon={<CopyOutlined />}
            size="small"
            style={{ marginTop: 8 }}
            onClick={() => {
              navigator.clipboard.writeText('adb reverse tcp:8989 tcp:8989');
              message.success('已复制到剪贴板');
            }}
          >
            复制命令
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
