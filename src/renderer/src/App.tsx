import { Archive, Box, Check, Clock3, FolderGit2, PackageOpen, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
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

export default function App(): ReactElement {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<'all' | AgentProvider>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [packState, setPackState] = useState<PackState>({ status: 'idle' });

  async function scan(): Promise<void> {
    setIsScanning(true);
    setError(undefined);
    try {
      const nextSessions = await window.agentVault.scan();
      setSessions(nextSessions);
      setSelectedId((current) => current ?? nextSessions[0]?.id);
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

  const selected = filteredSessions.find((session) => session.id === selectedId) ?? filteredSessions[0];
  const projectCount = new Set(sessions.map((session) => session.cwd).filter(Boolean)).size;
  const messageCount = sessions.reduce((count, session) => count + session.messages.length, 0);
  const lastUpdated = sessions[0]?.updatedAt ? formatDate(sessions[0].updatedAt) : 'No sessions';

  async function writePack(session: AgentSession): Promise<void> {
    setPackState({ status: 'writing', sessionId: session.id });
    try {
      const result = await window.agentVault.writePack(session.id);
      setPackState({ status: 'ready', ...result });
    } catch (packError) {
      setPackState({ status: 'error', message: packError instanceof Error ? packError.message : 'Pack failed' });
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

        <nav className="source-nav" aria-label="Sources">
          <button className={provider === 'all' ? 'active' : ''} onClick={() => setProvider('all')}>
            <Box size={17} aria-hidden="true" />
            <span>All Sources</span>
            <strong>{sessions.length}</strong>
          </button>
          <button className={provider === 'codex' ? 'active' : ''} onClick={() => setProvider('codex')}>
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Codex</span>
            <strong>{sessions.filter((session) => session.provider === 'codex').length}</strong>
          </button>
          <button className={provider === 'claude-code' ? 'active' : ''} onClick={() => setProvider('claude-code')}>
            <PackageOpen size={17} aria-hidden="true" />
            <span>Claude Code</span>
            <strong>{sessions.filter((session) => session.provider === 'claude-code').length}</strong>
          </button>
        </nav>

        <div className="sidebar-metrics">
          <Metric label="Projects" value={String(projectCount)} />
          <Metric label="Messages" value={compactNumber(messageCount)} />
          <Metric label="Latest" value={lastUpdated} />
        </div>
      </aside>

      <section className="session-pane">
        <header className="toolbar">
          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, branches, models"
            />
          </label>
          <button className="icon-button" onClick={() => void scan()} disabled={isScanning} title="Refresh sessions">
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </header>

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="session-list" aria-label="Sessions">
          {filteredSessions.map((session) => (
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
          ))}
        </div>
      </section>

      <section className="detail-pane">
        {selected ? (
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
