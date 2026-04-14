# AI Code Review

使用 OpenAI 兼容模型驱动的 GitHub Pull Request 代码审查工具。通过 GitHub Actions 自动在 PR 上发布审查评论，提供 bug 检测和改进建议。

## 功能特性

- 检测代码 bug
- 提出改进建议
- AI 驱动的 PR 反馈
- 支持任意 OpenAI 兼容 API（OpenAI、DeepSeek、Groq、MiniMax、Ollama 等）

## 快速开始

将以下内容添加到 `.github/workflows/code-review.yml`：

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write

jobs:
  review:
    name: Review
    runs-on: ubuntu-latest
    steps:
      - name: Code Review
        uses: LittleY98/ai-code-review@v1.0.0
        with:
          API_KEY: ${{ secrets.API_KEY }}
```

默认使用 OpenAI 的 `gpt-4o` 模型。如需使用其他提供商，请设置 `API_BASE_URL` 和 `MODEL`：

```yaml
      - name: Code Review
        uses: LittleY98/ai-code-review@v1.0.0
        with:
          API_KEY: ${{ secrets.API_KEY }}
          API_BASE_URL: https://api.minimaxi.chat/v1
          MODEL: MiniMax-M2.5
```

## 输入参数

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `API_KEY` | 是 | — | OpenAI 兼容服务的 API 密钥 |
| `API_BASE_URL` | 否 | `https://api.openai.com/v1` | API 基础 URL，路径 `/chat/completions` 会自动追加 |
| `MODEL` | 否 | `gpt-4o` | 用于审查的 AI 模型 |
| `SYSTEM_PROMPT` | 否 | 见下文 | AI 审查者的自定义系统提示词 |
| `REVIEWER_NAME` | 否 | `AI Code Review` | 审查评论标题中显示的名称 |

默认系统提示词：

> You are an expert code reviewer. Review the provided code changes and give clear, actionable feedback.

您可以覆盖默认提示词以聚焦特定问题、强化编码规范或调整审查语气，例如：

> You are a security-focused code reviewer. Identify vulnerabilities, unsafe patterns, and authentication issues. Skip style comments.

## 配置说明

使用此 Action 必须将您的 API 密钥添加为 GitHub Secret。

### 1. 获取 API 密钥

从模型提供商的仪表板生成 API 密钥（如 OpenAI、DeepSeek、Groq、MiniMax）。

### 2. 将 API 密钥添加到仓库

1. 进入您的 GitHub 仓库
2. 点击 **Settings（设置）**
3. 导航到 **Secrets and variables > Actions**
4. 点击 **New repository secret** 并添加：

   - **Name:** `API_KEY` — **Value:** 您的 API 密钥

## 服务商配置示例

### OpenAI（默认）

```yaml
API_KEY: ${{ secrets.API_KEY }}
# API_BASE_URL 默认为 https://api.openai.com/v1
# MODEL 默认为 gpt-4o
```

### MiniMax

```yaml
API_KEY: ${{ secrets.API_KEY }}
API_BASE_URL: https://api.minimaxi.chat/v1
MODEL: MiniMax-M2.5
```

### DeepSeek

```yaml
API_KEY: ${{ secrets.API_KEY }}
API_BASE_URL: https://api.deepseek.com/v1
MODEL: deepseek-chat
```

### Groq

```yaml
API_KEY: ${{ secrets.API_KEY }}
API_BASE_URL: https://api.groq.com/openai/v1
MODEL: llama-3.3-70b-versatile
```

## 高级配置

您可以覆盖 `MODEL`、`SYSTEM_PROMPT` 和 `REVIEWER_NAME` 的默认值，并将其作为 GitHub Actions 变量管理。这样您可以更新模型、审查提示词或审查者名称，而无需修改工作流文件。

### 1. 向仓库添加变量

1. 进入您的 GitHub 仓库
2. 点击 **Settings（设置）**
3. 导航到 **Secrets and variables > Actions**
4. 点击 **Variables** 选项卡
5. 点击 **New repository variable** 并添加：

   - **Name:** `API_BASE_URL` — **Value:** 例如 `https://api.openai.com/v1`
   - **Name:** `MODEL` — **Value:** 例如 `gpt-4o`
   - **Name:** `SYSTEM_PROMPT` — **Value:** 您的自定义系统提示词
   - **Name:** `REVIEWER_NAME` — **Value:** 例如 `AI Code Review`

### 2. 在工作流中引用这些变量

```yaml
      - name: Code Review
        uses: LittleY98/minimax-code-review@v1.0.0
        with:
          API_KEY: ${{ secrets.API_KEY }}
          API_BASE_URL: ${{ vars.API_BASE_URL }}
          MODEL: ${{ vars.MODEL }}
          SYSTEM_PROMPT: ${{ vars.SYSTEM_PROMPT }}
          REVIEWER_NAME: ${{ vars.REVIEWER_NAME }}
```