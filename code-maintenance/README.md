# 代码维护台 / Code maintenance desk

| 模块 | 初始快照范围 | 用途 |
|---|---|---|
| PR 管理 | 151 个公开 PR：50 开放、35 合入、66 关闭未合入 | 按仓库、状态、CI 快照筛选，跟进历史提交 |
| 待提交候选 | 29 个候选：26 个既有候选＋3 个新增重点组 | 保留原文优先级、修复分支、验证证据及剩余工作；不是 29 个已验收 PR |
| Issue 管理 | 61 个实际 Issue：52 开放、9 关闭 | 跟进任务 Issue 和账号创建的 Issue；不代表上游全部 Issue |

**入口 / Open:** https://liuchenbing-2026.github.io/omnivoice-pr-reports/code-maintenance/?tab=pending&lang=zh

中文 / English 一键切换。支持搜索、筛选、分页、本地星标和备注、CSV 导出、点击刷新公开 GitHub 状态。原始 Issue / PR 标题、分支、SHA、URL 保留原文。

The three modules separate submitted PRs, conditional candidates and tracked Issues. Search, filters, pagination, local stars/notes, CSV export and user-triggered public GitHub state refresh are available. Original titles, branches, SHAs and URLs are retained.

## 数据与刷新 / Data and refresh

- 初始账号为 `Liuchenbing-2026`；来源版本为 `seed.json` 的 `sourceCommit`，PR / Issue 采集时间分别记录。151 个 PR 均已核对为公开仓库记录。
- 刷新 PR 时分页读取账号公开 PR，区分合入与关闭未合入。**分支／SHA、CI 和检视仍是原有时间的快照**，不冒充最新 CI 或验收。
- 刷新 Issue 时更新账号创建的 Issue 以及当前页最多 20 个跟进项；逐项失败保留原记录。加入跟进只读取已有公开 Issue，不创建、评论或修改 GitHub 内容。
- 待提交候选按原文 P0/P1/P2/P3 排序；“新增重点”单独标识。刷新关联 Issue 不改变验证结论。Issue 关闭也不证明 main 已修复。
- 星标和备注只保存在当前浏览器的 localStorage，不随 CSV 导出或发往 GitHub。清除浏览器数据会删除这些本地内容。公开数据缓存也在本地，较旧缓存不覆盖较新采集结果。
- 公开 API 无令牌读取，配额不足时保留原数据并提示重试。没有后台自动扫描或后台提交。
- 历史 74 条问题归档保留在 https://liuchenbing-2026.github.io/omnivoice-pr-reports/task28-29-priority-20261017/?view=archive 。其记录口径与三个管理模块不同，不相加计数。

Refresh is manual and read-only. PR state refresh does not refresh CI/review snapshots. Issue refresh covers authored Issues and up to 20 visible tracked items. Failed items retain prior records. Closed Issues do not prove mainline resolution. Local notes/stars remain in the browser and are excluded from exports. No token, backend service or GitHub write operation is used.

## 运行与验证 / Run and validate

纯静态 HTML/CSS/JavaScript，无构建步骤、镜像、额外运行依赖、模型服务或 NPU 资源。GitHub Pages 分支为 `task24-omnivoice-report-20261010`，目录为 `code-maintenance/`；任务源码分支为 `docs/code-maintenance-desk-20261017`，交付 SHA 以该分支 Git 记录为准。本地文件仅用于构建与检查，查看使用上面的 HTTPS 地址。

Static HTML/CSS/JavaScript; no build, container, model service or NPU allocation. GitHub Pages serves this directory from `task24-omnivoice-report-20261010`. Source is on `docs/code-maintenance-desk-20261017`; use its Git commit to pin the delivered version.

```bash
git clone --branch docs/code-maintenance-desk-20261017 https://github.com/Liuchenbing-2026/omnivoice-pr-reports.git
cd omnivoice-pr-reports
node --check code-maintenance/app.js
node --test code-maintenance/model.test.cjs
```

检查覆盖 DOM harness 下的控制器交互（不代表浏览器渲染）、记录口径、筛选与排序、分页完整性、Issue/PR 区分、陈旧缓存、CSV 转义、API 失败保留数据以及静态结构。测试采用 Node.js 24.13.1；不把这些检查说成浏览器视觉验收或框架/NPU 回归。服务压测和模型精度评测不适用于此静态工具。

Checks cover controller events with a DOM harness (not browser rendering), count semantics, filtering/sorting, API pagination, PR/Issue separation, stale caches, CSV escaping, failure retention and document structure. Node.js 24.13.1 was used. These checks do not constitute browser visual acceptance or framework/NPU regression. Model accuracy and service load benchmarks are not applicable.
