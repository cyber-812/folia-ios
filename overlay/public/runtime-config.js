// 当前文件：Capacitor（iOS / Android）包内的运行时配置。
//
// 原生壳的页面源是 https://localhost，站内 /api 路由没有同源服务端可达，
// 因此把 AI 路由指向已部署的 folia-ai-api 服务：
//   POST {apiBase}/api/generate-theme_openai
//   POST {apiBase}/api/segment-lyrics
// 密钥只存在该服务端（环境变量），不进包内。aiProvider 与该服务端的
// AI_PROVIDER=openai 保持一致（分词路由靠它选 OpenAI 连接）。
window.__FOLIA_RUNTIME_CONFIG__ = {
  aiProvider: 'openai',
  apiBase: 'https://folia-ai-api-soxq.onrender.com',
};
