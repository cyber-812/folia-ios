// 当前文件：读取 Docker 注入的 Web 运行时配置，并兼容既有 Vite 构建变量。
// Capacitor 包内由 public/runtime-config.js 注入同一份配置（见 getWebApiBase）。

export type WebAiProvider = 'gemini' | 'openai';

const normalizeAiProvider = (value: unknown): WebAiProvider => (
    value === 'openai' ? 'openai' : 'gemini'
);

export const getWebAiProvider = (): WebAiProvider => {
    if (typeof window !== 'undefined') {
        const runtimeValue = window.__FOLIA_RUNTIME_CONFIG__?.aiProvider;
        if (runtimeValue) return normalizeAiProvider(runtimeValue);
    }

    return normalizeAiProvider(import.meta.env.VITE_AI_PROVIDER);
};

const normalizeApiBase = (value: unknown): string => (
    typeof value === 'string' ? value.trim().replace(/\/+$/, '') : ''
);

/**
 * 站内 /api 路由的绝对域名（不带尾斜杠），未配置时为空串。
 * 运行时配置优先，其次是构建时的 VITE_FOLIA_API_BASE。
 */
export const getWebApiBase = (): string => {
    if (typeof window !== 'undefined') {
        const runtimeValue = normalizeApiBase(window.__FOLIA_RUNTIME_CONFIG__?.apiBase);
        if (runtimeValue) return runtimeValue;
    }

    return normalizeApiBase(import.meta.env.VITE_FOLIA_API_BASE);
};

/**
 * 把站内路由（如 /api/generate-theme_openai）解析成最终请求地址：
 * 配置了 apiBase 时拼成绝对地址（Capacitor 壳内没有同源服务端），
 * 未配置时原样返回，Web 部署的同源行为不变。
 */
export const resolveWebApiRoute = (route: string): string => {
    const base = getWebApiBase();
    return base ? `${base}${route}` : route;
};
