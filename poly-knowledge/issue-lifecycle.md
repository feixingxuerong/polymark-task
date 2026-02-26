# Issue 生命周期（Issue Lifecycle）

本文件定义 `polymark-task` 仓库中每个 issue 的标准推进流程。

## 状态定义

- `todo`：已创建，尚未开始
- `doing`：已分配子代理执行中
- `review`：子代理输出已提交，主 agent 验收中
- `done`：已验收完成，可关闭
- `blocked`：被依赖或用户决策阻塞

## 主 agent 规则

- 永远优先从 open issues 拉取工作。
- 如果没有任何 open issue 能推进目标：新建一个高杠杆 issue。
- 每个完成的 issue 必须留一条“验收记录 comment”，至少包含：
  - 摘要（做了什么）
  - 证据链接（文件/截图/数据）
  - 风险备注
  - 下一步动作

## 子代理任务模板

Title: Subagent Task - <issue title>

**Input**
- issue id / 链接
- 期望产出（文件/清单/结论）
- 截止时间（如有）
- 质量标准（验收口径）

**Output 必须包含**
- 做了什么
- 修改了哪些文件（路径）
- 证据/来源链接
- 未解决的风险/依赖
