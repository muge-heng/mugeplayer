<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Muse.ai — AI 音乐播放器

一个由 **Gemini AI Studio** 生成的现代化、智能化的音乐播放器应用。它结合了优雅的视觉效果（极光背景动画）和强大的 AI 功能，提供流畅的音乐播放体验、实时歌词显示、智能队列管理以及多语言支持。

---

## ✨ 主要功能

*   **🎵 核心播放功能**：完整的音乐播放控制（播放/暂停、上一首/下一首、进度条拖拽）、音量调节、循环模式切换。
*   **📝 实时歌词**：支持同步滚动歌词显示，高亮当前演唱行，提供流畅的视觉跟随效果。
*   **📋 播放队列与历史**：可视化的待播放队列管理，自动记录播放历史，方便快速回溯。
*   **🤖 AI 驱动**：集成 Google Gemini AI，可能用于智能推荐、歌词生成或元数据增强（具体取决于 `geminiService.ts` 实现）。
*   **🌍 多语言支持 (i18n)**：内置国际化系统，支持多种语言界面切换。
*   **🎨 现代 UI/UX**：
    *   **Aurora Background**：动态极光背景动画，营造沉浸式氛围。
    *   **Glassmorphism**：采用毛玻璃特效的卡片和面板设计。
    *   **响应式布局**：完美适配桌面端和移动端，包含专门的移动端导航栏。
    *   **Framer Motion 动画**：流畅的页面转场和交互微动画。
*   **💾 本地持久化**：使用 IndexedDB (`db.ts`) 在浏览器本地存储播放列表、歌曲库和用户设置，刷新页面不丢失数据。
*   **⚙️ 自定义设置**：用户可调整应用主题、语言等偏好设置。

---

## 🛠️ 技术栈

*   **框架**: React 19 + TypeScript
*   **构建工具**: Vite 6
*   **AI SDK**: `@google/genai` (Gemini API)
*   **UI 图标**: `lucide-react`
*   **动画库**: `framer-motion`
*   **状态管理**: React Context API (`PlayerContext`)
*   **本地数据库**: IndexedDB (通过 `idb` 或直接封装)
*   **样式**: Tailwind CSS (推测，基于类名风格)

---

## 📂 项目结构

```
├── components/          # React 组件
│   ├── AuroraBackground.tsx   # 极光背景特效
│   ├── ContextMenu.tsx        # 右键上下文菜单
│   ├── LyricsView.tsx         # 歌词显示视图
│   ├── MobileNav.tsx          # 移动端底部导航
│   ├── PlayerBar.tsx          # 底部播放控制条
│   ├── QueueView.tsx          # 播放队列视图
│   ├── Sidebar.tsx            # 侧边栏导航
│   └── SongList.tsx           # 歌曲列表展示
├── context/             # React Context
│   └── PlayerContext.tsx      # 全局播放器状态管理
├── services/            # 服务层
│   ├── db.ts                    # IndexedDB 数据库操作
│   └── geminiService.ts         # Gemini AI 服务封装
├── utils/               # 工具函数
│   └── i18n.ts                  # 国际化翻译工具
├── types.ts             # TypeScript 类型定义
├── utils.ts             # 通用工具函数
├── App.tsx              # 主应用入口组件
├── index.tsx            # React DOM 渲染入口
└── vite.config.ts       # Vite 配置文件
```

---

## 🚀 快速开始

### 前置要求

*   Node.js (建议 v18 或更高版本)
*   npm 或 yarn
*   **Gemini API Key** (用于 AI 功能)

### 安装与运行

1.  **克隆项目** (如果尚未完成):
    ```bash
    git clone <your-repo-url>
    cd <project-folder>
    ```

2.  **安装依赖**:
    ```bash
    npm install
    ```

3.  **配置环境变量**:
    在项目根目录创建 `.env.local` 文件，并填入你的 Gemini API Key：
    ```env
    GEMINI_API_KEY=your_actual_gemini_api_key_here
    ```

4.  **启动开发服务器**:
    ```bash
    npm run dev
    ```
    应用将在 `http://localhost:5173` (默认端口) 启动。

5.  **构建生产版本**:
    ```bash
    npm run build
    ```
    构建产物将输出到 `dist/` 目录。

6.  **预览生产构建**:
    ```bash
    npm run preview
    ```

---

## 🔗 相关链接

*   **在 AI Studio 中查看**: [Muse.ai App](https://ai.studio/apps/drive/1ZaCJyXTwcmzrXyFagL_V9HOuysmgkzWe)
*   **React 文档**: https://react.dev/
*   **Vite 文档**: https://vitejs.dev/
*   **Gemini API 文档**: https://ai.google.dev/

---

## 📄 许可证

本项目由 Gemini AI Studio 生成。请根据实际使用情况添加相应的开源许可证（如 MIT, Apache 2.0 等）。

---

*Made with ❤️ by Gemini AI Studio*
