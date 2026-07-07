import { contextBridge, ipcRenderer } from 'electron';
import type { AgentSession } from '../core/types';

export interface PackWriteResult {
  outputDir: string;
  files: string[];
}

const api = {
  scan: (): Promise<AgentSession[]> => ipcRenderer.invoke('vault:scan'),
  writePack: (sessionId: string): Promise<PackWriteResult> => ipcRenderer.invoke('vault:write-pack', sessionId),
  openPath: (path: string): Promise<string> => ipcRenderer.invoke('vault:open-path', path)
};

contextBridge.exposeInMainWorld('agentVault', api);

export type AgentVaultApi = typeof api;
