# StudyFlow 学习助手 🧠

> 本地单机学习辅助 Web 应用 — 计时/番茄钟 + AI 对话学习 + 知识卡 (艾宾浩斯复习) + 待办 + 学习统计

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 💬 **AI 对话学习** | 接入大模型作为学习伙伴和老师，记录长期记忆 |
| 🍅 **番茄钟** | 专注 25 分 + 休息轮循，SVG 圆环倒计时，休息引导 |
| ⏱ **自由计时** | 不限时长的自由学习模式，结束时 AI 自动总结 |
| 🃏 **知识卡片** | 翻转卡片 3D 效果，支持手动/AI 生成，艾宾浩斯复习队列 |
| ✅ **待办事项** | 优先级排序，完成勾选，三种筛选 |
| 📊 **学习统计** | 今日学习、连续天数、周/月趋势图表 |

## 🚀 快速开始

`ash
# 1. 复制环境变量模板 (不配 LLM 也能用基础功能)
cp .env.example .env

# 2. 一键启动
docker compose up -d --build

# 3. 打开浏览器
# http://localhost:3000
`

数据保存在 \./data/sqlite/studyflow.db\，容器重启不丢失。

## ⚙️ 配置

编辑 \.env\ 文件：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| \LLM_API_KEY\ | OpenAI 兼容 API 密钥 | 留空则 AI 功能隐藏 |
| \LLM_BASE_URL\ | API 地址 | \https://api.openai.com/v1\ |
| \LLM_MODEL\ | 模型名 | \gpt-4o-mini\ |

## 🛠 开发

`ash
# 后端 (Python 3.10+)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端 (另开终端)
cd frontend
npm install
npm run dev        # → http://localhost:5173
`

## 📁 项目结构

\├── docker-compose.yml        # 一键部署
├── .env.example              # 环境变量模板
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI 入口
│   │   ├── models.py         # SQLAlchemy ORM
│   │   ├── routers/          # 各功能 API
│   │   └── services/         # LLM / 统计 / 艾宾浩斯
│   └── tests/
└── frontend/
    ├── src/
    │   ├── pages/            # 页面组件
    │   ├── components/       # UI 组件
    │   ├── api/              # API 调用
    │   └── store/            # 状态管理 (Zustand)
    └── __tests__/
\
## 🧪 测试

`ash
cd backend && pytest -v      # 后端测试
cd frontend && npm test       # 前端测试
`
