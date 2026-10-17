# 代码维护工具

在线入口：https://liuchenbing-2026.github.io/omnivoice-pr-reports/maintenance/

| 视图 | 范围 |
|---|---|
| 待提PR / 修复记录 | 74条台账，默认筛选未提交且需跟进的候选/待补项，保留全部记录与证据 |
| PR管理 | 账号151个公开PR：50 Open、35合入、66关闭未合入；仓库/状态/范围筛选、排序、一键状态刷新 |
| Issue管理 | 51个已跟踪Issue；关联分支、验证范围和PR，支持筛选后的状态刷新 |

单文件静态HTML，运行时只需浏览器，不需要镜像、Python服务或Node服务。客户端只读取GitHub公开数据；不包含令牌，也不会创建、关闭、重开PR或Issue。Issue关闭与修复验收分开显示。PR标题、URL、分支和SHA保留原文。

## 固定版本与复现

任务分支：`feat/code-maintenance-tool-20261017`
基础提交：`2acb125b637f75d77e33e8e2ef402bf66a6de6f2`
网页功能提交：`3be05a0f31bc2706b33cadc0faca7fca67ed57c5`

源码中的`index.html`就是在线交付内容。镜像、模型权重、NPU/CUDA设备和服务压测：不适用。只通过上面的远端HTTPS地址查看页面，不需要本地HTTP预览。

可核对公开GitHub数据：

```sh
gh api --paginate 'search/issues?q=is%3Apr%20is%3Apublic%20author%3ALiuchenbing-2026&per_page=100&sort=updated'
gh api repos/vllm-project/vllm-ascend/issues/18560
```

GitHub Pages实际配置为仓库`task24-omnivoice-report-20261010`分支根目录。功能源码保存在本任务分支，网页功能提交已发布到Pages分支；测试和说明仅补在任务分支，不要求部署Node依赖。

## 已执行检查与可重跑命令

实际测试版本：Node `v24.13.1`、jsdom `26.1.0`；元数据采集使用 `Python 3.9.6` 和 `gh version 2.65.0 (2025-01-06)`。

```sh
cd maintenance
npm install --ignore-scripts --cache .npm-cache
npm test
```

实际执行使用相同版本的已安装jsdom，通过NODE_PATH运行上述两个Node测试入口；没有宣称在全新clone中重新安装依赖并验收浏览器。

共15项DOM交互逻辑检查通过：三视图、筛选/排序、语言与URL恢复、刷新分页/状态映射、失败保留数据、待提PR默认筛选及验证范围保留。测试直接读取同目录HTML内嵌数据，不依赖外部私有测试件。这是jsdom模拟，不是浏览器视觉验收；桌面和窄屏实际渲染尚未验收。

## 在线数据边界

GitHub匿名Search接口已实测HTTP200和CORS，合入状态通过`merged_at`区分。Issue REST匿名接口在验收网络返回HTTP403、core剩余配额0；限流时保留已核验快照，可稍后刷新。刷新PR状态不会自动重跑模型验证；Issue状态刷新不会自动改变历史分支验证结论。初始化快照时间显示在各视图，筛选状态可由URL分享，语言选择会记忆。

六项验证表述已澄清：#18560 schema、#18640离线探针、#18129/#17532/#18518/#18209 CPU测试均有历史证据；待补项单独列明。#18209三连测是9项定向用例×3，另有165项全文件回归，不能写成165项×3。
