import {
  Archive,
  Box,
  Check,
  Clock3,
  FolderGit2,
  KeyRound,
  PackageOpen,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { EnvironmentAsset, EnvironmentAssetKind } from '../../core/environmentPack';
import type { AgentProvider, AgentSession } from '../../core/types';

type PackState =
  | { status: 'idle' }
  | { status: 'writing'; sessionId: string }
  | { status: 'ready'; outputDir: string; files: string[] }
  | { status: 'error'; message: string };

const providerLabel: Record<AgentProvider, string> = {
  codex: 'Codex',
  'claude-code': 'Claude Code'
};

type ViewMode = 'sessions' | 'environment';

export default function App(): ReactElement {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [assets, setAssets] = useState<EnvironmentAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<'all' | AgentProvider>('all');
  const [mode, setMode] = useState<ViewMode>('sessions');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [packState, setPackState] = useState<PackState>({ status: 'idle' });
  const [environmentPackState, setEnvironmentPackState] = useState<PackState>({ status: 'idle' });

  async function scan(): Promise<void> {
    setIsScanning(true);
    setError(undefined);
    try {
      const [nextSessions, nextAssets] = await Promise.all([
        window.agentVault.scan(),
        window.agentVault.scanEnvironment()
      ]);
      setSessions(nextSessions);
      setAssets(nextAssets);
      setSelectedId((current) => current ?? nextSessions[0]?.id);
      setSelectedAssetId((current) => current ?? nextAssets[0]?.id);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }

  useEffect(() => {
    void scan();
  }, []);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesProvider = provider === 'all' || session.provider === provider;
      const text = [session.title, session.cwd, session.gitBranch, session.model, session.provider]
        .join(' ')
        .toLowerCase();
      return matchesProvider && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [provider, query, sessions]);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesProvider = provider === 'all' || asset.provider === provider;
      const text = [asset.relativePath, asset.kind, asset.provider].join(' ').toLowerCase();
      return matchesProvider && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [assets, provider, query]);

  const selected = filteredSessions.find((session) => session.id === selectedId) ?? filteredSessions[0];
  const selectedAsset = filteredAssets.find((asset) => asset.id === selectedAssetId) ?? filteredAssets[0];
  const projectCount = new Set(sessions.map((session) => session.cwd).filter(Boolean)).size;
  const messageCount = sessions.reduce((count, session) => count + session.messages.length, 0);
  const lastUpdated = sessions[0]?.updatedAt ? formatDate(sessions[0].updatedAt) : 'No sessions';
  const providerFilteredCount =
    mode === 'sessions'
      ? provider === 'all'
        ? sessions.length
        : sessions.filter((session) => session.provider === provider).length
      : provider === 'all'
        ? assets.length
        : assets.filter((asset) => asset.provider === provider).length;

  async function writePack(session: AgentSession): Promise<void> {
    setPackState({ status: 'writing', sessionId: session.id });
    try {
      const result = await window.agentVault.writePack(session.id);
      setPackState({ status: 'ready', ...result });
    } catch (packError) {
      setPackState({ status: 'error', message: packError instanceof Error ? packError.message : 'Pack failed' });
    }
  }

  async function writeEnvironmentPack(): Promise<void> {
    setEnvironmentPackState({ status: 'writing', sessionId: 'environment' });
    try {
      const result = await window.agentVault.writeEnvironmentPack();
      setEnvironmentPackState({ status: 'ready', outputDir: result.outputDir, files: result.files });
    } catch (packError) {
      setEnvironmentPackState({
        status: 'error',
        message: packError instanceof Error ? packError.message : 'Environment pack failed'
      });
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Archive size={20} aria-hidden="true" />
          </div>
          <div>
            <h1>Agent Vault</h1>
            <p>Work continuity for local agents</p>
          </div>
        </div>

        <div className="mode-nav" aria-label="Workspace mode">
          <button
            className={mode === 'sessions' ? 'active' : ''}
            onClick={() => {
              setMode('sessions');
              setPackState({ status: 'idle' });
            }}
          >
            <Archive size={16} aria-hidden="true" />
            <span>Sessions</span>
          </button>
          <button
            className={mode === 'environment' ? 'active' : ''}
            onClick={() => {
              setMode('environment');
              setEnvironmentPackState({ status: 'idle' });
            }}
          >
            <Settings2 size={16} aria-hidden="true" />
            <span>Environment</span>
          </button>
        </div>

        <nav className="source-nav" aria-label="Sources">
          <button className={provider === 'all' ? 'active' : ''} onClick={() => setProvider('all')}>
            <Box size={17} aria-hidden="true" />
            <span>{mode === 'sessions' ? 'All Sources' : 'All Assets'}</span>
            <strong>{providerFilteredCount}</strong>
          </button>
          <button className={provider === 'codex' ? 'active' : ''} onClick={() => setProvider('codex')}>
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Codex</span>
            <strong>
              {mode === 'sessions'
                ? sessions.filter((session) => session.provider === 'codex').length
                : assets.filter((asset) => asset.provider === 'codex').length}
            </strong>
          </button>
          <button className={provider === 'claude-code' ? 'active' : ''} onClick={() => setProvider('claude-code')}>
            <PackageOpen size={17} aria-hidden="true" />
            <span>Claude Code</span>
            <strong>
              {mode === 'sessions'
                ? sessions.filter((session) => session.provider === 'claude-code').length
                : assets.filter((asset) => asset.provider === 'claude-code').length}
            </strong>
          </button>
        </nav>

        <div className="sidebar-metrics">
          {mode === 'sessions' ? (
            <>
              <Metric label="Projects" value={String(projectCount)} />
              <Metric label="Messages" value={compactNumber(messageCount)} />
              <Metric label="Latest" value={lastUpdated} />
            </>
          ) : (
            <>
              <Metric label="Assets" value={String(assets.length)} />
              <Metric label="Skills" value={String(assets.filter((asset) => asset.kind === 'skill').length)} />
              <Metric label="Auth State" value="Excluded" />
            </>
          )}
        </div>
      </aside>

      <section className="session-pane">
        <header className="toolbar">
          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                mode === 'sessions' ? 'Search projects, branches, models' : 'Search skills, agents, settings'
              }
            />
          </label>
          <button className="icon-button" onClick={() => void scan()} disabled={isScanning} title="Refresh sessions">
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </header>

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="session-list" aria-label="Sessions">
          {mode === 'sessions'
            ? filteredSessions.map((session) => (
                <button
                  key={`${session.provider}-${session.id}-${session.sourcePath}`}
                  className={`session-row ${selected?.id === session.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedId(session.id);
                    setPackState({ status: 'idle' });
                  }}
                >
                  <span className={`provider-dot ${session.provider}`} />
                  <span className="session-copy">
                    <strong>{session.title}</strong>
                    <small>{session.cwd ?? session.sourcePath}</small>
                  </span>
                  <time>{session.updatedAt ? formatDate(session.updatedAt) : 'Unknown'}</time>
                </button>
              ))
            : filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  className={`session-row ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAssetId(asset.id);
                    setEnvironmentPackState({ status: 'idle' });
                  }}
                >
                  <span className={`provider-dot ${asset.provider}`} />
                  <span className="session-copy">
                    <strong>{asset.relativePath}</strong>
                    <small>
                      {providerLabel[asset.provider]} · {asset.kind}
                    </small>
                  </span>
                  <time>{formatBytes(asset.byteSize)}</time>
                </button>
              ))}
        </div>
      </section>

      <section className="detail-pane">
        {mode === 'environment' ? (
          <EnvironmentDetail
            asset={selectedAsset}
            assets={filteredAssets}
            packState={environmentPackState}
            onWritePack={() => void writeEnvironmentPack()}
          />
        ) : selected ? (
          <>
            <header className="detail-header">
              <div>
                <span className="eyebrow">{providerLabel[selected.provider]}</span>
                <h2>{selected.title}</h2>
              </div>
              <button
                className="primary-action"
                onClick={() => void writePack(selected)}
                disabled={packState.status === 'writing'}
              >
                {packState.status === 'writing' ? (
                  <RefreshCw size={18} aria-hidden="true" />
                ) : (
                  <PackageOpen size={18} aria-hidden="true" />
                )}
                <span>{packState.status === 'writing' ? 'Writing Pack' : 'Build Pack'}</span>
              </button>
            </header>

            <div className="meta-grid">
              <Meta icon={<FolderGit2 size={17} />} label="Project" value={selected.cwd ?? 'Unknown'} />
              <Meta icon={<Archive size={17} />} label="Branch" value={selected.gitBranch ?? 'Not captured'} />
              <Meta
                icon={<Clock3 size={17} />}
                label="Updated"
                value={selected.updatedAt ? formatDate(selected.updatedAt) : 'Unknown'}
              />
              <Meta icon={<ShieldCheck size={17} />} label="Messages" value={String(selected.messages.length)} />
            </div>

            <section className="pack-panel">
              <h3>Continuation Pack</h3>
              <ul>
                <li>handoff.md</li>
                <li>conversation.md</li>
                <li>state.json</li>
                <li>git.patch</li>
              </ul>
              {packState.status === 'ready' ? (
                <div className="pack-result">
                  <Check size={18} aria-hidden="true" />
                  <button onClick={() => void window.agentVault.openPath(packState.outputDir)}>
                    {packState.outputDir}
                  </button>
                </div>
              ) : null}
              {packState.status === 'error' ? <div className="inline-error">{packState.message}</div> : null}
            </section>

            <section className="conversation-preview">
              <h3>Latest Context</h3>
              <div>
                {selected.messages.slice(-6).map((message, index) => (
                  <article key={`${message.timestamp}-${index}`} className={`message ${message.role}`}>
                    <span>{message.role}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="empty-state">
            <Archive size={30} aria-hidden="true" />
            <h2>No local sessions found</h2>
            <button className="primary-action" onClick={() => void scan()}>
              <RefreshCw size={18} aria-hidden="true" />
              <span>Scan Again</span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function EnvironmentDetail({
  asset,
  assets,
  packState,
  onWritePack
}: {
  asset: EnvironmentAsset | undefined;
  assets: EnvironmentAsset[];
  packState: PackState;
  onWritePack: () => void;
}): ReactElement {
  const kinds = countKinds(assets);

  return (
    <>
      <header className="detail-header">
        <div>
          <span className="eyebrow">Environment Pack</span>
          <h2>Move skills, agents, prompts, and settings safely.</h2>
        </div>
        <button className="primary-action" onClick={onWritePack} disabled={packState.status === 'writing'}>
          {packState.status === 'writing' ? (
            <RefreshCw size={18} aria-hidden="true" />
          ) : (
            <PackageOpen size={18} aria-hidden="true" />
          )}
          <span>{packState.status === 'writing' ? 'Writing Pack' : 'Build Environment Pack'}</span>
        </button>
      </header>

      <div className="meta-grid">
        <Meta icon={<Sparkles size={17} />} label="Assets" value={String(assets.length)} />
        <Meta icon={<Settings2 size={17} />} label="Settings" value={String(kinds.settings ?? 0)} />
        <Meta icon={<PackageOpen size={17} />} label="Skills" value={String(kinds.skill ?? 0)} />
        <Meta icon={<KeyRound size={17} />} label="Auth" value="Excluded" />
      </div>

      <section className="pack-panel">
        <h3>Portable Environment</h3>
        <ul>
          <li>skills</li>
          <li>agents</li>
          <li>commands</li>
          <li>prompts</li>
          <li>hooks</li>
          <li>redacted settings</li>
        </ul>
        {packState.status === 'ready' ? (
          <div className="pack-result">
            <Check size={18} aria-hidden="true" />
            <button onClick={() => void window.agentVault.openPath(packState.outputDir)}>{packState.outputDir}</button>
          </div>
        ) : null}
        {packState.status === 'error' ? <div className="inline-error">{packState.message}</div> : null}
      </section>

      <section className="conversation-preview">
        <h3>{asset ? 'Selected Asset' : 'Restore Boundary'}</h3>
        {asset ? (
          <div className="asset-detail">
            <Meta icon={<Archive size={17} />} label="Kind" value={asset.kind} />
            <Meta icon={<ShieldCheck size={17} />} label="Provider" value={providerLabel[asset.provider]} />
            <Meta icon={<FolderGit2 size={17} />} label="Path" value={asset.relativePath} />
            <Meta icon={<Box size={17} />} label="Size" value={formatBytes(asset.byteSize)} />
          </div>
        ) : (
          <div className="restore-boundary">
            <p>
              Agent Vault exports portable assets only. Login state, auth caches, cookies, tokens, local sessions, and
              machine-local files stay out of the pack.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: ReactElement; label: string; value: string }): ReactElement {
  return (
    <div className="meta-item">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function countKinds(assets: EnvironmentAsset[]): Partial<Record<EnvironmentAssetKind, number>> {
  return assets.reduce<Partial<Record<EnvironmentAssetKind, number>>>((counts, asset) => {
    counts[asset.kind] = (counts[asset.kind] ?? 0) + 1;
    return counts;
  }, {});
}
