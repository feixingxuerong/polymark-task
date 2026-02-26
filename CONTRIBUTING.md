# Contributing

## Language rule (重要)

- `poly-knowledge/` 下的文档 **默认必须使用中文撰写**。
- 允许保留英文：
  - 专有名词 / API 字段名 / 代码片段
  - 引用来源时的英文原句（建议只保留关键句 + 链接）

## Index-First

- 新增知识：先更新 `poly-knowledge/index.md`（增加条目、章节状态、链接），再写正文。
- 新增来源：先更新 `poly-knowledge/sources.md`。

## CI 自动检查

本仓库已配置 GitHub Actions CI 检查，会在 push/PR 时自动检查 `poly-knowledge/**/*.md` 文件的英文占比：

- **阈值**: 默认 25%（可在 workflow 中调整）
- **忽略内容**: 代码块 (```)、URLs、frontmatter
- **运行方式**: `python check_chinese_ratio.py --threshold 25 poly-knowledge`
- **失败处理**: 检查不通过时，CI 会列出超标的文件

如需临时绕过检查（如引用必须保留英文的来源），请在 PR 描述中说明原因。

## Quality bar

- 每个结论尽量包含：来源链接、关键假设、可验证方式。
- 避免大段"观点堆砌"，优先写成可执行 checklist。
