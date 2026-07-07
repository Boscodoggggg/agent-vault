import {
  App as AntApp,
  Alert,
  Button,
  ConfigProvider,
  Empty,
  Flex,
  Input,
  Layout,
  List,
  Segmented,
  Space,
  Tag,
  Typography,
  theme
} from 'antd';
import {
  AppstoreOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ExportOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ToolOutlined
} from '@ant-design/icons';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { EnvironmentAsset, EnvironmentAssetKind } from '../../core/environmentPack';
import type { AgentProvider, AgentSession } from '../../core/types';

type PackState =
  | { status: 'idle' }
  | { status: 'writing'; sessionId: string }
  | { status: 'ready'; outputDir: string; files: string[] }
  | { status: 'error'; message: string };

type ViewMode = 'sessions' | 'environment';

const { Sider, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

const providerLabel: Record<AgentProvider, string> = {
  codex: 'Codex',
  'claude-code': 'Claude Code'
};

const roleLabel: Record<string, string> = {
  user: '用户',
  assistant: '助手',
  system: '系统',
  tool: '工具'
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

export default function App(): ReactElement {
  return (
    <ConfigProvider
      theme={{
        algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],
        token: {
          colorPrimary: '#b85a3a',
          colorInfo: '#315f9f',
          colorSuccess: '#16845d',
          colorWarning: '#a86b12',
          colorError: '#c7382f',
          colorBgLayout: '#eef3f8',
          colorBgContainer: '#f8fafc',
          colorBorder: '#d5dde8',
          colorTextBase: '#111827',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        },
        components: {
          Layout: {
            siderBg: '#20252c',
            triggerBg: '#20252c'
          },
          Button: {
            controlHeight: 34,
            borderRadius: 6
          },
          Input: {
            controlHeight: 36,
            borderRadius: 6
          },
          Tag: {
            borderRadiusSM: 5
          },
          Segmented: {
            borderRadius: 6,
            borderRadiusSM: 5
          }
        }
      }}
    >
      <AntApp>
        <VaultWorkbench />
      </AntApp>
    </ConfigProvider>
  );
}

function VaultWorkbench(): ReactElement {
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
      if (!window.agentVault) throw new Error('桌面桥接未加载，请重启 Agent Vault。');

      const [nextSessions, nextAssets] = await Promise.all([window.agentVault.scan(), window.agentVault.scanEnvironment()]);
      setSessions(nextSessions);
      setAssets(nextAssets);
      setSelectedId((current) => current ?? nextSessions[0]?.id);
      setSelectedAssetId((current) => current ?? nextAssets[0]?.id);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : '扫描失败');
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
  const scopedCount =
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
      setPackState({ status: 'error', message: packError instanceof Error ? packError.message : '续接包生成失败' });
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
    <Layout className="vault-shell">
      <Sider width={292} className="vault-sider">
        <div className="window-dots" aria-hidden="true">
          <span className="red" />
          <span className="yellow" />
          <span className="green" />
        </div>

        <Flex vertical gap={24} className="sider-inner">
          <Flex gap={12} align="center">
            <div className="brand-tile">
              <DatabaseOutlined />
            </div>
            <div>
              <Title level={3} className="brand-title">
                Agent Vault
              </Title>
              <Text className="brand-subtitle">本地上下文库</Text>
            </div>
          </Flex>

          <Segmented
            block
            size="large"
            value={mode}
            onChange={(value) => {
              setMode(value as ViewMode);
              setPackState({ status: 'idle' });
              setEnvironmentPackState({ status: 'idle' });
            }}
            options={[
              { label: '会话', value: 'sessions', icon: <HistoryOutlined /> },
              { label: '环境', value: 'environment', icon: <SettingOutlined /> }
            ]}
          />

          <div className="provider-menu">
            <ProviderButton
              active={provider === 'all'}
              tone="all"
              icon={<AppstoreOutlined />}
              label={mode === 'sessions' ? '全部来源' : '全部资产'}
              count={scopedCount}
              onClick={() => setProvider('all')}
            />
            <ProviderButton
              active={provider === 'codex'}
              tone="codex"
              icon={<SafetyCertificateOutlined />}
              label="Codex"
              count={
                mode === 'sessions'
                  ? sessions.filter((session) => session.provider === 'codex').length
                  : assets.filter((asset) => asset.provider === 'codex').length
              }
              onClick={() => setProvider('codex')}
            />
            <ProviderButton
              active={provider === 'claude-code'}
              tone="claude"
              icon={<CloudServerOutlined />}
              label="Claude Code"
              count={
                mode === 'sessions'
                  ? sessions.filter((session) => session.provider === 'claude-code').length
                  : assets.filter((asset) => asset.provider === 'claude-code').length
              }
              onClick={() => setProvider('claude-code')}
            />
          </div>

          <div className="sider-stats">
            {mode === 'sessions' ? (
              <>
                <StatRow label="项目" value={String(projectCount)} />
                <StatRow label="消息" value={compactNumber(messageCount)} />
                <StatRow label="最近" value={lastUpdated} />
              </>
            ) : (
              <>
                <StatRow label="资产" value={String(assets.length)} />
                <StatRow label="Skills" value={String(assets.filter((asset) => asset.kind === 'skill').length)} />
                <StatRow label="登录态" value="不导出" />
              </>
            )}
          </div>
        </Flex>
      </Sider>

      <Layout>
        <Content className="vault-main">
          <section className="list-pane">
            <Flex gap={10} className="list-toolbar">
              <Input
                allowClear
                prefix={<FileSearchOutlined />}
                placeholder={mode === 'sessions' ? '搜索项目、分支、模型' : '搜索 skills、agents、配置'}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button icon={<ReloadOutlined spin={isScanning} />} onClick={() => void scan()} disabled={isScanning} />
            </Flex>

            <div className="scan-line">
              {isScanning
                ? '正在扫描本机 Codex / Claude Code 历史...'
                : mode === 'sessions'
                  ? `已发现 ${filteredSessions.length} 个会话`
                  : `已发现 ${filteredAssets.length} 个环境资产`}
            </div>

            {error ? <Alert className="error-alert" type="error" showIcon message={error} /> : null}

            {mode === 'sessions' ? (
              <SessionList
                sessions={filteredSessions}
                selectedId={selected?.id}
                onSelect={(session) => {
                  setSelectedId(session.id);
                  setPackState({ status: 'idle' });
                }}
              />
            ) : (
              <AssetList
                assets={filteredAssets}
                selectedId={selectedAsset?.id}
                onSelect={(asset) => {
                  setSelectedAssetId(asset.id);
                  setEnvironmentPackState({ status: 'idle' });
                }}
              />
            )}
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
              <SessionDetail session={selected} packState={packState} onWritePack={() => void writePack(selected)} />
            ) : (
              <EmptyState mode={mode} onScan={() => void scan()} />
            )}
          </section>
        </Content>
      </Layout>
    </Layout>
  );
}

function ProviderButton({
  active,
  icon,
  label,
  count,
  tone,
  onClick
}: {
  active: boolean;
  icon: ReactElement;
  label: string;
  count: number;
  tone: 'all' | 'codex' | 'claude';
  onClick: () => void;
}): ReactElement {
  return (
    <Button type={active ? 'primary' : 'text'} className={`provider-button ${tone}`} icon={icon} onClick={onClick}>
      <span>{label}</span>
      <Text className="provider-count">{count}</Text>
    </Button>
  );
}

function StatRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Flex justify="space-between" className="stat-row">
      <Text>{label}</Text>
      <Text strong>{value}</Text>
    </Flex>
  );
}

function SessionList({
  sessions,
  selectedId,
  onSelect
}: {
  sessions: AgentSession[];
  selectedId: string | undefined;
  onSelect: (session: AgentSession) => void;
}): ReactElement {
  if (sessions.length === 0) return <Empty className="list-empty" description="没有匹配的会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <List
      className="entity-list"
      dataSource={sessions}
      rowKey={(session) => `${session.provider}-${session.id}-${session.sourcePath}`}
      renderItem={(session) => (
        <List.Item
          className={selectedId === session.id ? 'entity-item selected' : 'entity-item'}
          onClick={() => onSelect(session)}
        >
          <List.Item.Meta
            avatar={<ProviderAvatar provider={session.provider} />}
            title={<Text ellipsis>{session.title}</Text>}
            description={
              <Space direction="vertical" size={2} className="item-description">
                <Text type="secondary" ellipsis>
                  {session.cwd ?? session.sourcePath}
                </Text>
                <Space size={6} wrap>
                  <ProviderTag provider={session.provider} />
                  <Tag>{session.messages.length} 条消息</Tag>
                  <Tag>{session.updatedAt ? formatDate(session.updatedAt) : '未知时间'}</Tag>
                </Space>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
}

function AssetList({
  assets,
  selectedId,
  onSelect
}: {
  assets: EnvironmentAsset[];
  selectedId: string | undefined;
  onSelect: (asset: EnvironmentAsset) => void;
}): ReactElement {
  if (assets.length === 0) return <Empty className="list-empty" description="没有匹配的环境资产" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <List
      className="entity-list"
      dataSource={assets}
      rowKey={(asset) => asset.id}
      renderItem={(asset) => (
        <List.Item className={selectedId === asset.id ? 'entity-item selected' : 'entity-item'} onClick={() => onSelect(asset)}>
          <List.Item.Meta
            avatar={<ProviderAvatar provider={asset.provider} />}
            title={<Text ellipsis>{asset.relativePath}</Text>}
            description={
              <Space size={6} wrap>
                <ProviderTag provider={asset.provider} />
                <Tag>{assetKindLabel[asset.kind]}</Tag>
                <Tag>{formatBytes(asset.byteSize)}</Tag>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
}

function SessionDetail({
  session,
  packState,
  onWritePack
}: {
  session: AgentSession;
  packState: PackState;
  onWritePack: () => void;
}): ReactElement {
  return (
    <Flex vertical gap={22}>
      <Flex justify="space-between" align="flex-start" gap={24}>
        <div>
          <ProviderTag provider={session.provider} />
          <Title level={2} className="detail-title">
            {session.title}
          </Title>
        </div>
        <Button
          type="primary"
          icon={<ExportOutlined />}
          loading={packState.status === 'writing'}
          onClick={onWritePack}
        >
          生成续接包
        </Button>
      </Flex>

      <div className="metric-grid">
        <Metric label="项目" value={session.cwd ?? '未知'} icon={<FolderOpenOutlined />} />
        <Metric label="分支" value={session.gitBranch ?? '未捕获'} icon={<CodeOutlined />} />
        <Metric label="更新" value={session.updatedAt ? formatDate(session.updatedAt) : '未知'} icon={<HistoryOutlined />} />
        <Metric label="消息" value={`${session.messages.length} 条`} icon={<FileSearchOutlined />} />
      </div>

      <PackResult state={packState} />

      <section className="content-section">
        <Flex justify="space-between" align="center">
          <Title level={4}>最近上下文</Title>
          <Text type="secondary">末尾 6 条</Text>
        </Flex>
        <div className="message-stack">
          {session.messages.slice(-6).map((message, index) => (
            <div key={`${message.timestamp}-${index}`} className="message-row">
              <RoleTag role={message.role} />
              <Paragraph ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}>{message.content}</Paragraph>
            </div>
          ))}
        </div>
      </section>
    </Flex>
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
    <Flex vertical gap={22}>
      <Flex justify="space-between" align="flex-start" gap={24}>
        <div>
          <Tag className="tone-tag vault">迁移边界</Tag>
          <Title level={2} className="detail-title">
            打包 skills、agents、prompts 与配置，避开登录态。
          </Title>
        </div>
        <Button
          type="primary"
          icon={<ExportOutlined />}
          loading={packState.status === 'writing'}
          onClick={onWritePack}
        >
          生成环境包
        </Button>
      </Flex>

      <div className="metric-grid">
        <Metric label="资产" value={`${assets.length} 个`} icon={<AppstoreOutlined />} />
        <Metric label="配置" value={`${kinds.settings ?? 0} 个`} icon={<SettingOutlined />} />
        <Metric label="Skills" value={`${kinds.skill ?? 0} 个`} icon={<ToolOutlined />} />
        <Metric label="登录态" value="不导出" icon={<SafetyCertificateOutlined />} />
      </div>

      <PackResult state={packState} />

      <section className="content-section">
        <Title level={4}>{asset ? '选中资产' : '恢复边界'}</Title>
        {asset ? (
          <div className="asset-grid">
            <Info label="类型" value={assetKindLabel[asset.kind]} />
            <Info label="来源" value={providerLabel[asset.provider]} />
            <Info label="路径" value={asset.relativePath} />
            <Info label="大小" value={formatBytes(asset.byteSize)} />
          </div>
        ) : (
          <Alert
            type="info"
            showIcon
            message="只导出可迁移资产"
            description="登录态、认证缓存、cookies、tokens、本机会话和机器本地文件不会进入迁移包。"
          />
        )}
      </section>
    </Flex>
  );
}

function PackResult({ state }: { state: PackState }): ReactElement | null {
  if (state.status === 'idle' || state.status === 'writing') return null;

  if (state.status === 'error') return <Alert type="error" showIcon message={state.message} />;

  return (
    <Alert
      type="success"
      showIcon
      message="生成成功"
      description={
        <Button type="link" className="path-link" onClick={() => void window.agentVault.openPath(state.outputDir)}>
          {state.outputDir}
        </Button>
      }
    />
  );
}

function EmptyState({ mode, onScan }: { mode: ViewMode; onScan: () => void }): ReactElement {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={mode === 'sessions' ? '没有发现本地会话' : '没有发现可迁移环境资产'}
    >
      <Button type="primary" icon={<ReloadOutlined />} onClick={onScan}>
        重新扫描
      </Button>
    </Empty>
  );
}

function ProviderAvatar({ provider }: { provider: AgentProvider }): ReactElement {
  return <div className={`provider-avatar ${provider}`}>{provider === 'codex' ? <SafetyCertificateOutlined /> : <CloudServerOutlined />}</div>;
}

function ProviderTag({ provider }: { provider: AgentProvider }): ReactElement {
  return <Tag className={`tone-tag ${provider}`}>{providerLabel[provider]}</Tag>;
}

function RoleTag({ role }: { role: string }): ReactElement {
  return <Tag className={`role-tag ${role}`}>{roleLabel[role] ?? role}</Tag>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactElement }): ReactElement {
  return (
    <div className="metric-cell">
      <Flex align="center" gap={8} className="metric-label">
        <span className="metric-icon">{icon}</span>
        <Text type="secondary">{label}</Text>
      </Flex>
      <Text strong ellipsis title={value} className="metric-value">
        {value}
      </Text>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="info-cell">
      <Text type="secondary">{label}</Text>
      <Text strong ellipsis>
        {value}
      </Text>
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
