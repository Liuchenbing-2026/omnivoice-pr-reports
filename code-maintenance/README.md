# 代码维护台 / Code maintenance desk

| 模块 | 初始快照范围 | 用途 |
|---|---|---|
| 全量修复分支 | 74 条远端分支：64 条核心＋4 条 Speculators 历史＋6 条补充 | 覆盖全部同名任务目录，保留失败、历史替代及授权范围外项 |
| PR 管理 | 151 个公开 PR：53 开放、35 合入、63 关闭未合入 | 按仓库、状态、CI 快照筛选，跟进历史提交 |
| 待提交候选 | 29 个候选：26 个既有候选＋3 个新增重点组 | 保留原文优先级、修复分支、验证证据及剩余工作；不是 29 个已验收 PR |
| Issue 管理 | 62 个实际 Issue：53 开放、9 关闭 | 跟进任务 Issue 和账号创建的 Issue；不代表上游全部 Issue |

**入口 / Open:** https://liuchenbing-2026.github.io/omnivoice-pr-reports/code-maintenance/?tab=branches&lang=zh

中文 / English 一键切换。支持搜索、筛选、分页、本地星标和备注、CSV 导出、点击刷新公开 GitHub 状态。原始 Issue / PR 标题、分支、SHA、URL 保留原文。

Four modules separate all registered branches, submitted PRs, conditional candidates and tracked Issues. Search, filters, pagination, local stars/notes, CSV export and user-triggered public GitHub state refresh are available. Original titles, branches, SHAs and URLs are retained.

## 全量范围与排序 / Full coverage and order

本次回查 `Model_test/main` 固定版本 `08024431c3735d4ea05436ed8de4e9cbaa8b05ee`：6 个任务目录、643 个文件。所有同名任务28目录均纳入，包括 SpecForge、两类 Ascend 扫描目录、vLLM 和十段式总览，以及任务29 Omni。页面“数据范围”逐项列出固定版本的目录链接。

74 条分支是去重后的远端分支计数，已全部回读 HEAD，本次没有发现与已归档验证 SHA 的差异。另补入此前漏列、与 DFlash 修复关联的 SpecForge Issue #501。62 个 Issue 包含任务跟进和账号创建的记录，不是上游所有 Issue。

默认按推进阶段分组，再按任务原表的实际推进顺序排列。全量分支、待提交候选及 Issue 默认列表的前三项统一为 vLLM #61954、Ascend #18978、Ascend #18679。P0/P1/P2/P3 是原文问题分级，可单独筛选，或选择“原文分级 P0→P3”排序，不能与实际执行顺序混用；未登记原文分级的保留“未登记分级”，不虚造优先级。仍需推进的修复在前，已有 PR、失败、历史替代和已覆盖项分别保留分类；可筛选。29 项候选是单独的推进视图，与74条分支存在对应关系，不能相加当作新问题数。

The pinned source covers six directories and 643 files, including every same-numbered Task 28 directory and Task 29. All 74 deduplicated branch heads were read back; none differs from the recorded validation SHA. SpecForge Issue #501 was added. Default branch order groups work by next stage, then follows the source preparation queue. Branch, candidate and Issue default views start with vLLM #61954, Ascend #18978 and Ascend #18679. Original P0/P1/P2/P3 ratings remain available as a separate filter and sort option; they are not the execution queue. Items without a recorded source rating remain unranked. Candidates and branches overlap and are not additive counts. Historical validation failures, alternatives, restricted targets and covered scope remain visible. This is metadata reconciliation, not new framework or NPU acceptance.

## 数据与刷新 / Data and refresh

- 初始账号为 `Liuchenbing-2026`；来源版本为 `seed.json` 的 `sourceCommit`，PR / Issue 采集时间分别记录。151 个 PR 均已核对为公开仓库记录。
- 刷新 PR 时分页读取账号公开 PR，区分合入与关闭未合入。**分支／SHA、CI 和检视仍是原有时间的快照**，不冒充最新 CI 或验收。
- 刷新 Issue 时更新账号创建的 Issue 以及当前页最多 20 个跟进项；逐项失败保留原记录。加入跟进只读取已有公开 Issue，不创建、评论或修改 GitHub 内容。
- 待提交候选默认按实际推进顺序排序，原文 P0/P1/P2/P3 分级独立保留；“新增重点”单独标识。刷新关联 Issue 不改变验证结论。Issue 关闭也不证明 main 已修复。
- 星标和备注只保存在当前浏览器的 localStorage，不随 CSV 导出或发往 GitHub。清除浏览器数据会删除这些本地内容。公开数据缓存也在本地，较旧缓存不覆盖较新采集结果。
- 公开 API 无令牌读取，配额不足时保留原数据并提示重试。没有后台自动扫描或后台提交。
- 历史 74 条问题归档保留在 https://liuchenbing-2026.github.io/omnivoice-pr-reports/task28-29-priority-20261017/?view=archive 。其记录口径与三个管理模块不同，不相加计数。

Refresh is manual and read-only. PR state refresh does not refresh CI/review snapshots. Issue refresh covers authored Issues and up to 20 visible tracked items. Failed items retain prior records. Closed Issues do not prove mainline resolution. Local notes/stars remain in the browser and are excluded from exports. No token, backend service or GitHub write operation is used.

## 运行与验证 / Run and validate

纯静态 HTML/CSS/JavaScript，无构建步骤、镜像、额外运行依赖、模型服务或 NPU 资源。GitHub Pages 分支为 `task24-omnivoice-report-20261010`，目录为 `code-maintenance/`；任务源码分支为 `fix/task28-29-issue-execution-order-20261017`，交付 SHA 以该分支 Git 记录为准。本地文件仅用于构建与检查，查看使用上面的 HTTPS 地址。

Static HTML/CSS/JavaScript; no build, container, model service or NPU allocation. GitHub Pages serves this directory from `task24-omnivoice-report-20261010`. Source is on `fix/task28-29-issue-execution-order-20261017`; use its Git commit to pin the delivered version.

```bash
git clone --branch fix/task28-29-issue-execution-order-20261017 https://github.com/Liuchenbing-2026/omnivoice-pr-reports.git
cd omnivoice-pr-reports
node --check code-maintenance/app.js
node --test code-maintenance/model.test.cjs
```

检查覆盖 DOM harness 下的控制器交互（不代表浏览器渲染）、记录口径、筛选与排序、分页完整性、Issue/PR 区分、陈旧缓存、CSV 转义、API 失败保留数据以及静态结构。测试采用 Node.js 24.13.1；不把这些检查说成浏览器视觉验收或框架/NPU 回归。服务压测和模型精度评测不适用于此静态工具。

Checks cover controller events with a DOM harness (not browser rendering), count semantics, filtering/sorting, API pagination, PR/Issue separation, stale caches, CSV escaping, failure retention and document structure. Node.js 24.13.1 was used. These checks do not constitute browser visual acceptance or framework/NPU regression. Model accuracy and service load benchmarks are not applicable.

## 2026-10-17 状态刷新 / Snapshot refresh

当前是手动刷新工具，**不是自动实时同步**：页面不会定时轮询 GitHub。打开页面读取最新发布的 seed；按钮刷新只更新本浏览器的公开 API 缓存，不会重新发布服务器文件。PR 按钮刷新生命周期；CI／评审仍保留各自标注时间。Issue 按钮刷新本人创建的 Issue 与本页跟进项；分支／候选按钮只刷新本页关联 Issue，不抓取新的任务分支或执行测试。

本次完整采集截至北京时间 2026-10-17 19:08：PR 151 个（53 开放、35 合入、63 关闭未合入），Issue 62 个、分支 74 条、候选 29 项。3 个旧 PR 从关闭变为开放；没有新增合入。已刷新所有 PR 的 head、CI 和评审，62 个 Issue 与74个分支均读取成功。对任务目录采用逐目录 Git tree SHA 比对；只有任务29的核查 README/audit 变化，未增加或删除修复分支。没有进行新的框架/NPU验收。

需要完整重采公开元数据时，使用 Python 3 和已登录的 GitHub CLI（令牌由 gh 自行管理，不写入页面）：

```bash
python3 code-maintenance/refresh_snapshot.py --receipt /tmp/code-maintenance-refresh.json
node --test code-maintenance/model.test.cjs
```

脚本分页读取公开 PR 的状态、CI、评审、分支，以及已登记的 Issue/分支。脚本仅执行 GitHub 读取请求，原子更新本地 seed，不创建／修改 PR 或 Issue，也不自动推送或部署。失败项目保留原记录及采集时间，错误写入 receipt；GitHub 临时502/503/504只做有限次数只读重试。新任务分支的发现和框架修复验收仍需独立核对。

The tool is manual, not a live feed. Opening reads the latest published seed without a browser cache; refresh buttons update local public-API caches only. They do not publish server snapshots, discover new task branches or run tests. The full snapshot above refreshed all public PR lifecycle/head/CI/review metadata, tracked Issues and registered branch heads. Three closed PRs reopened and no additional PR merged. The Python command is read-only on GitHub, updates the local seed atomically and writes an audit receipt. It neither mutates GitHub Issues/PRs nor pushes/deploys files. Source discovery and framework/NPU acceptance are separate work.

本轮完整采集使用 Python 3.9.6、GitHub CLI 2.65.0；页面逻辑检查使用 Node.js 24.13.1。测试中的固定快照计数须在新采集后与真实变化一并核对。

## Issue 默认排序修正 / Issue default order

Issue 页默认与候选推进顺序对齐，前三为 #61954 → #18978 → #18679。以完整 Issue URL 关联代码仓和编号，避免跨仓同号误匹配。开放项优先；未登记推进顺序的开放项按更新时间补排，关闭项后置。可单独选择“最近更新优先”，恢复纯时间顺序。表格增加“顺序／状态”列；更新时间是 GitHub Issue 更新时间，不是优先级，也不是采集时间。

Issue defaults now follow the candidate execution queue using full Issue URLs as keys. Open Issues with a known queue position come first; unranked open Issues follow by update time, and closed Issues come last. Most-recently-updated remains an explicit independent sort. The first column shows display order and state; update time is not priority or collection time. This changes ordering only, without revalidating framework fixes.
