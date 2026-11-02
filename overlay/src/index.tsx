import { Buffer } from 'buffer';
import { installGlobalVisualizerFrameRateLimiter } from './utils/frameRateLimiter';
import { installConsoleLogCapture } from './utils/consoleLogBuffer';
import { installDebugModule } from './services/debug/debugModule';
import { installMemorySampleFeed } from './services/debug/memorySamples';
// import { installCoverSizeAudit } from './services/debug/coverSizeSamples';
// @ts-ignore
globalThis.Buffer = Buffer;
// First, so the debug overlay's console tab has the startup lines too - they are where a failure
// to reach a library or restore a session shows up.
installConsoleLogCapture();
// Right after it, so the startup lines reach the runtime log file too and not only the in-memory
// buffer. Both no-op off Electron. See services/debug/debugModule.ts.
installDebugModule();
installMemorySampleFeed();
// Cover size audit, left wired but switched off: it answered whether the provider CDNs honour the
// size in a cover URL - they do - and that is not a question worth re-asking every session. The
// collector and its panel are still in the tree, and `?probe=coverSizeAudit` still reaches them.
// To bring the tab back, uncomment this line and the four sites in DevDebugOverlay.tsx. It was dev
// only even then: a packaged build has nothing to do with the answer, so it should not pay the
// observer or the rows it retains.
// if (import.meta.env.DEV) installCoverSizeAudit();
installGlobalVisualizerFrameRateLimiter();

// 动态导入 bootstrap（要等 Buffer shim 装好之后才能执行）。
//
// 这里【必须】显式 catch。原来是 `void import('./bootstrap')`：
// 一旦这个模块加载失败或解析失败，就变成一个没人处理的 Promise rejection，
// 界面直接黑屏且零提示 —— 这正是我们排查了半天的那个现象。
import('./bootstrap').catch((error: unknown) => {
  console.error('[Folia] failed to load ./bootstrap', error);
  const report = (window as unknown as {
    __folia_report_boot_error__?: (err: unknown) => void;
  }).__folia_report_boot_error__;
  if (typeof report === 'function') {
    report(error);
  }
});
