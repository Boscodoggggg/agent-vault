import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { join } from 'node:path';
import { scanAgentSessions } from '../core/scanner';
import { captureGitSnapshot } from '../core/gitSnapshot';
import { writeContinuationPack } from '../core/continuationPack';
import { scanEnvironmentAssets, writeEnvironmentPack } from '../core/environmentPack';
import type { AgentSession } from '../core/types';

let mainWindow: BrowserWindow | undefined;
let cachedSessions: AgentSession[] = [];

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    title: 'Agent Vault',
    backgroundColor: '#f6f7f3',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.agentvault.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.handle('vault:scan', async () => {
    cachedSessions = await scanAgentSessions();
    return cachedSessions;
  });

  ipcMain.handle('vault:write-pack', async (_, sessionId: string) => {
    const session = cachedSessions.find(
      (candidate) => candidate.id === sessionId || candidate.sourcePath === sessionId
    );
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const git = await captureGitSnapshot(session.cwd);
    const outputDir = join(
      app.getPath('documents'),
      'Agent Vault Packs',
      safeFileName(`${session.provider}-${session.title}`)
    );
    const files = await writeContinuationPack(session, outputDir, { git });
    return { outputDir, files };
  });

  ipcMain.handle('vault:scan-environment', async () => {
    return scanEnvironmentAssets();
  });

  ipcMain.handle('vault:write-environment-pack', async () => {
    const outputDir = join(app.getPath('documents'), 'Agent Vault Environment Pack');
    return writeEnvironmentPack({ outputDir });
  });

  ipcMain.handle('vault:open-path', async (_, path: string) => {
    return shell.openPath(path);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function safeFileName(input: string): string {
  return input
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
}
