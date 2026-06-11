# StudyFlow 学习助手

本地单机学习辅助 Web 应用: 计时/番茄钟 + 学后 AI 总结 + 知识卡 (艾宾浩斯复习) + 待办 + 学习统计。

## 技术栈

- 前端: React 18 + TypeScript + Vite + TailwindCSS + Recharts
- 后端: FastAPI + SQLAlchemy 2.0 (async) + SQLite + OpenAI 兼容 SDK
- 部署: Docker Compose (一键启动)

## 快速开始

```bash
# 1. 复制环境变量模板 (可选, 不配 LLM 也能用基础功能)
cp .env.example .env
# 编辑 .env 填入 LLM_API_KEY 等

# 2. 启动
docker compose up -d --build

# 3. 访问
# 浏览器打开 http://localhost:3000
```

数据保存在 `./data/sqlite/studyflow.db`, 不会因容器重启丢失。

## 配置项

- `LLM_API_KEY`: OpenAI 兼容服务的 API key, 留空时 AI 入口自动隐藏
- `LLM_BASE_URL`: 兼容接口地址, 默认 `https://api.openai.com/v1`
- `LLM_MODEL`: 模型名, 默认 `gpt-4o-mini`

## 开发模式

```bash
# 后端 (需 Python 3.10+)
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端 (另开终端)
cd frontend
npm install
npm run dev
```

前端开发服默认在 5173 端口, 通过 vite proxy 把 `/api` 转到 8000。

## 测试

```bash
# 后端
cd backend && pytest -v

# 前端
cd frontend && npm test
```

## 项目结构

参见 `docs/` 下的设计与实施文档。
