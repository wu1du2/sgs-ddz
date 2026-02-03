# 卡牌游戏部署（Render）

## 本地开发

```bash
npm install
npm run dev
npm run server
```

如果需要指定本地 WebSocket 地址：

```bash
VITE_WS_URL=ws://localhost:5174 npm run dev
```

## Render 部署

本项目使用单一服务同时提供静态页面与 WebSocket。

- Build Command：`npm run build`
- Start Command：`npm run start`

服务会读取 `PORT` 环境变量并在同端口提供 HTTP + WebSocket。