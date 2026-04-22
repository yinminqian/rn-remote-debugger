const path = require('path');

module.exports = {
  appId: 'com.rnremotedebugger.app',
  productName: 'RN Remote Debugger',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: [
    'main.cjs',
    'preload.cjs',
    'mcp-server.mjs',
    'dist/**/*',
    'package.json',
  ],
  extraFiles: [],
  mac: {
    category: 'public.app-category.developer-tools',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'build/icon.icns',
    identity: null,
    compression: 'maximum',
  },
  dmg: {
    contents: [
      { x: 130, y: 180 },
      {
        x: 410,
        y: 180,
        type: 'link',
        path: '/Applications',
      },
      {
        x: 270,
        y: 380,
        type: 'file',
        path: path.resolve(__dirname, 'build/Fix.command'),
        name: '首次启动修复.command',
      },
    ],
    window: {
      width: 540,
      height: 500,
    },
  },
  win: {
    target: ['nsis'],
    icon: 'build/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Development',
    icon: 'build/icon.png',
  },
  publish: {
    provider: 'github',
    owner: 'yinminqian',
    repo: 'rn-remote-debugger',
  },
};
