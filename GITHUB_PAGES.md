# AI Workshop Hub — GitHub Pages 演示版发布说明

这个演示版位于 `static-demo/`，只包含公开展示页面和三个内置体验项目。它不会连接管理员账号、数据库或文件上传服务，也不会改动正式版的 Cloudflare 架构。

## 首次发布

1. 将本地修改提交并推送到 GitHub 仓库的 `main` 分支。
2. 打开 GitHub 仓库，进入 **Settings → Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
4. 进入仓库的 **Actions** 页面，找到 **Deploy principal demo to GitHub Pages**。
5. 如果推送后没有自动运行，点击 **Run workflow → Run workflow**。
6. 等待任务显示绿色完成标记。随后回到 **Settings → Pages**，即可看到公开访问地址。

默认地址通常是：

`https://<GitHub用户名>.github.io/<仓库名称>/`

本仓库当前对应的预计地址是：

`https://nic98.github.io/WHBC-AI-Workshop-Hub/`

## 后续更新

只要修改 `static-demo/` 内的文件或发布流程文件，并再次推送到 `main`，GitHub Actions 就会自动更新演示网站。

## 演示前检查

- 使用学校网络和手机流量分别打开链接，确认中国大陆访问速度可以接受。
- 依次打开 Home、Projects、About、Privacy。
- 从项目卡片进入详情，再点击 **Experience project**，确认三个体验项目都能全屏运行并正常返回。
- 建议准备一份本地运行版本或录屏，作为现场网络不稳定时的备用方案。

## 范围说明

GitHub Pages 只能托管静态内容。本演示版不包含管理员登录、上传、发布、D1 数据库或 R2 文件存储。需要演示这些功能时，应改用 Cloudflare Workers 部署完整版本。
