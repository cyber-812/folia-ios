import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Loader2, Server, Trash2 } from 'lucide-react';
import {
    clearRuntimeNeteaseApiBase,
    getBuildTimeNeteaseApiBase,
    getRuntimeNeteaseApiBase,
    setRuntimeNeteaseApiBase,
} from '../../../services/runtimeApiBase';

// src/components/modal/settings/ApiSourceSettingsCard.tsx
// 「音源服务器」设置卡片：运行时覆盖网易云 API 地址，不用重新构建。

interface ApiSourceSettingsCardProps {
    isDaylight: boolean;
    settingsCardClass: string;
    utilityGhostButtonClass: string;
}

// ---------------------------------------------------------------------
// Online music backend (runtime override) — 移植自 0.6.7 移植版
// GeneralSettingsSubview 的「音源服务器」一节。
// Lets a self-hosted / tunnelled API be swapped in without a rebuild.
// 0.7.25 设置页已改版为 pages + kit，这里做成独立卡片挂在通用页末尾，
// 逻辑与文案与移植版保持一致。
// ---------------------------------------------------------------------
const ApiSourceSettingsCard: React.FC<ApiSourceSettingsCardProps> = ({
    settingsCardClass,
    utilityGhostButtonClass,
}) => {
    const { i18n } = useTranslation();
    const isZh = Boolean(i18n.resolvedLanguage?.startsWith('zh'));
    const L = (zh: string, en: string) => (isZh ? zh : en);

    const buildTimeApiBase = getBuildTimeNeteaseApiBase();
    const [apiBaseDraft, setApiBaseDraft] = useState<string>(() => getRuntimeNeteaseApiBase() || '');
    const [apiBaseSaved, setApiBaseSaved] = useState<string>(() => getRuntimeNeteaseApiBase() || '');
    const [apiBaseStatus, setApiBaseStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
    const [apiBaseMessage, setApiBaseMessage] = useState<string | null>(null);

    const effectiveApiBase = apiBaseSaved || buildTimeApiBase || null;
    const apiBaseIsOverridden = Boolean(apiBaseSaved);

    const handleSaveApiBase = () => {
        const value = apiBaseDraft.trim();
        setRuntimeNeteaseApiBase(value || null);
        const saved = getRuntimeNeteaseApiBase() || '';
        setApiBaseSaved(saved);
        setApiBaseStatus('idle');
        setApiBaseMessage(
            saved
                ? L('已保存。建议重启 App 后生效。', 'Saved. Restart the app to be safe.')
                : L('已清除自定义地址，将使用内置地址。', 'Override cleared; the built-in address will be used.')
        );
    };

    const handleResetApiBase = () => {
        clearRuntimeNeteaseApiBase();
        setApiBaseDraft('');
        setApiBaseSaved('');
        setApiBaseStatus('idle');
        setApiBaseMessage(L('已恢复为内置地址。', 'Restored to the built-in address.'));
    };

    const handleTestApiBase = async () => {
        const value = apiBaseDraft.trim().replace(/\/+$/, '');
        if (!value) {
            setApiBaseStatus('fail');
            setApiBaseMessage(L('请先填写服务器地址。', 'Enter a server address first.'));
            return;
        }
        setApiBaseStatus('testing');
        setApiBaseMessage(null);
        try {
            const res = await fetch(`${value}/search?keywords=test&limit=1`, { method: 'GET' });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const count = Array.isArray(data?.result?.songs) ? data.result.songs.length : 0;
            setApiBaseStatus('ok');
            setApiBaseMessage(L(`连接成功，返回 ${count} 条结果。`, `Connected. ${count} result(s) returned.`));
        } catch (error) {
            setApiBaseStatus('fail');
            const detail = error instanceof Error ? error.message : String(error);
            setApiBaseMessage(L(`连接失败：${detail}`, `Failed: ${detail}`));
        }
    };

    const apiBaseStatusStyle: React.CSSProperties | undefined = apiBaseStatus === 'ok'
        ? { color: '#10b981' }
        : apiBaseStatus === 'fail'
            ? { color: '#ef4444' }
            : undefined;

    return (
        <section>
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Server size={14} /> {L('音源服务器', 'Music API Server')}
                {apiBaseIsOverridden && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-normal normal-case bg-emerald-500/15 text-emerald-500">
                        {L('已自定义', 'Custom')}
                    </span>
                )}
            </h3>
            <div className={`p-4 rounded-xl border space-y-4 ${settingsCardClass}`}>
                <div className="space-y-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {L('服务器地址', 'Server address')}
                    </div>
                    <div className="text-[11px] opacity-50 max-w-[420px]" style={{ color: 'var(--text-secondary)' }}>
                        {L(
                            '在线音乐（网易云）接口的地址。留空则使用 App 内置地址。iOS 上必须使用 https。',
                            'Base URL of the online music (Netease) API. Leave empty to use the address baked into the build. Must be https on iOS.'
                        )}
                    </div>
                </div>

                <input
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={apiBaseDraft}
                    onChange={(e) => setApiBaseDraft(e.target.value)}
                    placeholder="https://your-tunnel.example.com"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/30 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                />

                <div className="text-[11px] opacity-60 break-all" style={{ color: 'var(--text-secondary)' }}>
                    {L('当前生效：', 'Currently in effect: ')}
                    <span style={{ color: 'var(--text-primary)' }}>
                        {effectiveApiBase || L('（未配置）', '(not configured)')}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleSaveApiBase}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${utilityGhostButtonClass}`}
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {L('保存', 'Save')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleTestApiBase()}
                        disabled={apiBaseStatus === 'testing'}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 flex items-center gap-2 border ${utilityGhostButtonClass}`}
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {apiBaseStatus === 'testing' ? <Loader2 size={14} className="animate-spin" /> : null}
                        {L('测试连接', 'Test connection')}
                    </button>
                    <button
                        type="button"
                        onClick={handleResetApiBase}
                        disabled={!apiBaseIsOverridden && !apiBaseDraft}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 flex items-center gap-2 border ${utilityGhostButtonClass}`}
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <Trash2 size={14} />
                        {L('恢复内置地址', 'Use built-in')}
                    </button>
                </div>

                {apiBaseMessage && (
                    <div className="flex items-start gap-2 text-[11px]" style={apiBaseStatusStyle}>
                        {apiBaseStatus === 'ok' && <Check size={14} className="mt-[1px] shrink-0" />}
                        {apiBaseStatus === 'fail' && <AlertCircle size={14} className="mt-[1px] shrink-0" />}
                        <span className="break-all">{apiBaseMessage}</span>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ApiSourceSettingsCard;
