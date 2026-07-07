import { contextBridge, ipcRenderer } from 'electron';
import type { EnvironmentAsset, EnvironmentPackResult } from '../core/environmentPack';
import type { AgentSession } from '../core/types';

export interface PackWriteResult {
  outputDir: string;
  files: string[];
}

const api = {
  scan: (): Promise<AgentSession[]> => ipcRenderer.invoke('vault:scan'),
  writePack: (sessionId: string): Promise<PackWriteResult> => ipcRenderer.invoke('vault:write-pack', sessionId),
  scanEnvironment: (): Promise<EnvironmentAsset[]> => ipcRenderer.invoke('vault:scan-environment'),
  writeEnvironmentPack: (): Promise<EnvironmentPackResult> => ipcRenderer.invoke('vault:write-environment-pack'),
  openPath: (path: string): Promise<string> => ipcRenderer.invoke('vault:open-path', path)
};

contextBridge.exposeInMainWorld('agentVault', api);

export type AgentVaultApi = typeof api;
