# BSnapshot

主页/文档：<https://bsnapshot.rinne.in>

BSnapshot 是一个面向 B 站弹幕数据的下载和管理服务。它支持普通弹幕（实时、历史）、高级弹幕（如 BAS 等）以及基于创作中心的 UP 主专用弹幕获取接口，并提供定时任务、多账号轮询、片段弹幕获取和信息关联等能力。

这个仓库是 BSnapshot 的后端服务，基于 Nitro + Prisma + SQLite 构建。Web 客户端与桌面客户端位于配套的前端工程中。

## 功能

- 获取普通弹幕、历史弹幕、高级弹幕和 UP 主专用弹幕
- 通过定时任务自动拉取和同步数据
- 支持多账号轮询，降低单账号请求压力
- 支持按时间片管理弹幕数据，便于片段级处理
- 通过 Episode、Season、Clip 等模型组织视频和番剧数据

## 项目结构

- `prisma/`：数据库 schema 与迁移文件
- `generated/`：Prisma 与 Zod 生成产物
- `server/api/`：HTTP 接口
- `server/tasks/`：定时与后台任务
- `server/utils/`：通用工具方法
- `server/plugins/`：Nitro 插件

## 开发

请优先使用 pnpm。

```bash
pnpm install
pnpm dev
```

## 常用脚本

```bash
pnpm vite dev   # 启动开发服务器
pnpm build      # 构建生产版本
pnpm preview    # 本地预览构建产物
pnpm clean-init # 清理本地数据库与迁移并重新初始化
```

## 数据库

本项目使用 Prisma 管理 SQLite 数据库。首次运行或需要重建本地数据时，可以使用 `pnpm clean-init` 清理 `.data/db` 下的本地数据并重新初始化迁移。
