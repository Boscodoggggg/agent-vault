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

const assetKindLabel: Record<EnvironmentAssetKind, string> = {
  skill: 'Skill',
  agent: 'Agent',
  command: '命令',
  settings: '配置',
  instruction: '指令',
  hook: 'Hook',
  prompt: 'Prompt',
  mcp: 'MCP',
  other: '其他'
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
  const lastUpdated = sessions[0]?.updatedAt ? formatDate(sessions[0].updatedAt) : '暂无会话';
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
        message: packError instanceof Error ? packError.message : '环境包生成失败'
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
            <p>AI 工作不断片</p>
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
            <span>会话</span>
          </button>
          <button
            className={mode === 'environment' ? 'active' : ''}
            onClick={() => {
              setMode('environment');
              setEnvironmentPackState({ status: 'idle' });
            }}
          >
            <Settings2 size={16} aria-hidden="true" />
            <span>环境</span>
          </button>
        </div>

        <nav className="source-nav" aria-label="Sources">
          <button className={provider === 'all' ? 'active' : ''} onClick={() => setProvider('all')}>
            <Box size={17} aria-hidden="true" />
            <span>{mode === 'sessions' ? '全部来源' : '全部资产'}</span>
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
              <Metric label="项目" value={String(projectCount)} />
              <Metric label="消息" value={compactNumber(messageCount)} />
              <Metric label="最近" value={lastUpdated} />
            </>
          ) : (
            <>
              <Metric label="资产" value={String(assets.length)} />
              <Metric label="Skills" value={String(assets.filter((asset) => asset.kind === 'skill').length)} />
              <Metric label="登录态" value="不导出" />
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
              placeholder={mode === 'sessions' ? '搜索项目、分支、模型' : '搜索 skills、agents、配置'}
            />
          </label>
          <button className="icon-button" onClick={() => void scan()} disabled={isScanning} title="重新扫描">
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="scan-status">
          {isScanning
            ? '正在扫描本机 Codex / Claude Code 历史...'
            : mode === 'sessions'
              ? `已发现 ${filteredSessions.length} 个会话`
              : `已发现 ${filteredAssets.length} 个环境资产`}
        </div>

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="session-list" aria-label={mode === 'sessions' ? '会话列表' : '环境资产列表'}>
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
                  <time>{session.updatedAt ? formatDate(session.updatedAt) : '未知'}</time>
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
                      {providerLabel[asset.provider]} · {assetKindLabel[asset.kind]}
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
                <span>{packState.status === 'writing' ? '正在生成' : '生成续接包'}</span>
              </button>
            </header>

            <div className="meta-grid">
              <Meta icon={<FolderGit2 size={17} />} label="项目" value={selected.cwd ?? '未知'} />
              <Meta icon={<Archive size={17} />} label="分支" value={selected.gitBranch ?? '未捕获'} />
              <Meta
                icon={<Clock3 size={17} />}
                label="更新"
                value={selected.updatedAt ? formatDate(selected.updatedAt) : '未知'}
              />
              <Meta icon={<ShieldCheck size={17} />} label="消息" value={String(selected.messages.length)} />
            </div>

            <section className="pack-panel">
              <h3>续接包</h3>
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
              <h3>最近上下文</h3>
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
            <h2>{mode === 'sessions' ? '没有发现本地会话' : '没有发现可迁移环境资产'}</h2>
            <button className="primary-action" onClick={() => void scan()}>
              <RefreshCw size={18} aria-hidden="true" />
              <span>重新扫描</span>
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
          <span className="eyebrow">环境迁移包</span>
          <h2>安全迁移 skills、agents、prompts 和配置。</h2>
        </div>
        <button className="primary-action" onClick={onWritePack} disabled={packState.status === 'writing'}>
          {packState.status === 'writing' ? (
            <RefreshCw size={18} aria-hidden="true" />
          ) : (
            <PackageOpen size={18} aria-hidden="true" />
          )}
          <span>{packState.status === 'writing' ? '正在生成' : '生成环境包'}</span>
        </button>
      </header>

      <div className="meta-grid">
        <Meta icon={<Sparkles size={17} />} label="资产" value={String(assets.length)} />
        <Meta icon={<Settings2 size={17} />} label="配置" value={String(kinds.settings ?? 0)} />
        <Meta icon={<PackageOpen size={17} />} label="Skills" value={String(kinds.skill ?? 0)} />
        <Meta icon={<KeyRound size={17} />} label="登录态" value="不导出" />
      </div>

      <section className="pack-panel">
        <h3>可迁移环境</h3>
        <ul>
          <li>skills</li>
          <li>agents</li>
          <li>commands</li>
          <li>prompts</li>
          <li>hooks</li>
          <li>脱敏配置</li>
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
        <h3>{asset ? '选中资产' : '恢复边界'}</h3>
        {asset ? (
          <div className="asset-detail">
            <Meta icon={<Archive size={17} />} label="类型" value={assetKindLabel[asset.kind]} />
            <Meta icon={<ShieldCheck size={17} />} label="来源" value={providerLabel[asset.provider]} />
            <Meta icon={<FolderGit2 size={17} />} label="路径" value={asset.relativePath} />
            <Meta icon={<Box size={17} />} label="大小" value={formatBytes(asset.byteSize)} />
          </div>
        ) : (
          <div className="restore-boundary">
            <p>
              Agent Vault 只导出可迁移资产。登录态、认证缓存、cookies、tokens、本机会话和机器本地文件不会进入迁移包。
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
  if (Number.isNaN(date.getTime())) return '未知';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact' }).format(value);
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
