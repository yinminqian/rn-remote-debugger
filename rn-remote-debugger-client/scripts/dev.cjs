#!/usr/bin/env node
/**
 * 一键重启脚本：
 *   1. 杀掉残留的 vite / electron 进程
 *   2. 启动 vite
 *   3. 等 :5173 可连后启动 electron
 *   4. Ctrl+C 会同时停掉两个
 *
 * 零依赖：只用 Node 内置模块（child_process + net）。
 * 再次运行 = 重启（kill + start），所以这一个脚本既是 "dev" 也是 "restart"。
 */

const { spawn, execSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

// 进程匹配特征（pkill -f 的正则）
const KILL_PATTERNS = [
  'node_modules/\\.bin/vite',
  'Electron\\.app/Contents/MacOS/Electron',
  'rn-remote-debugger-client/node_modules/electron/dist/Electron',
];

const VITE_PORT = 5173;
const BOOT_TIMEOUT_MS = 30_000;
const CWD = path.resolve(__dirname, '..');

// ─── helpers ────────────────────────────────────────────────────

function killStale() {
  for (const p of KILL_PATTERNS) {
    try {
      execSync(`pkill -f ${JSON.stringify(p)}`, { stdio: 'ignore' });
    } catch {
      /* pkill exit 1 means "no process matched" — fine */
    }
  }
}

function waitPort(port, timeout = BOOT_TIMEOUT_MS) {
  // 尝试 IPv4 + IPv6 两个 localhost，哪个先通就算通
  const hosts = ['127.0.0.1', '::1'];
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tick() {
      let remaining = hosts.length;
      let anyOk = false;
      for (const h of hosts) {
        const s = net.connect(port, h, () => {
          if (!anyOk) { anyOk = true; s.destroy(); resolve(); }
        });
        s.on('error', () => { s.destroy(); if (--remaining === 0 && !anyOk) retry(); });
        s.on('end',  () => { if (--remaining === 0 && !anyOk) retry(); });
      }
      function retry() {
        if (Date.now() - start > timeout) reject(new Error(`timeout waiting for :${port}`));
        else setTimeout(tick, 200);
      }
    })();
  });
}

function run(label, cmd, args, color) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], cwd: CWD });
  const tag = `\x1b[${color}m[${label}]\x1b[0m `;
  const pipe = (src, dst) => src.on('data', (buf) => {
    const lines = buf.toString().split('\n');
    for (const line of lines) if (line.length) dst.write(tag + line + '\n');
  });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(tag + `exited with code ${code}`);
    cleanup(code ?? 0);
  });
  children.push(child);
  return child;
}

// ─── main ────────────────────────────────────────────────────────

const children = [];
let shuttingDown = false;

function cleanup(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch { /* ignore */ }
  }
  setTimeout(() => process.exit(code), 300).unref();
}
process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

(async () => {
  console.log('→ killing stale vite / electron processes…');
  killStale();

  console.log(`→ starting vite (waiting for :${VITE_PORT})…`);
  run('vite', 'npx', ['vite'], 36 /* cyan */);

  try {
    await waitPort(VITE_PORT);
    console.log(`\x1b[32m✓\x1b[0m vite ready on :${VITE_PORT}`);
  } catch (err) {
    console.error(`\x1b[31m✗\x1b[0m ${err.message}`);
    cleanup(1);
    return;
  }

  console.log('→ starting electron…');
  run('electron', 'npx', ['electron', '.'], 35 /* magenta */);
})();
