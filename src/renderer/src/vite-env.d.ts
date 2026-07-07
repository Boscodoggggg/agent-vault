/// <reference types="vite/client" />

import type { AgentVaultApi } from '../../preload';

declare global {
  interface Window {
    agentVault: AgentVaultApi;
  }
}
