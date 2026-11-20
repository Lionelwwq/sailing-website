# Sailing International Trade 网站

多页静态网站，支持英文 / 中文 / 法文三种语言。所有文字、产品和图片都放在 `content/` 文件夹的 JSON 文件里，员工可以通过 **Pages CMS** 在线编辑器修改，不需要碰代码。

## 页面

| 文件 | 页面 |
| --- | --- |
| `index.html` | 首页 |
| `glass.html` | 产品：玻璃（9 种） |
| `mirrors.html` | 产品：镜子（5 种） |
| `accessories.html` | 产品：配件（16 种，分 4 类） |
| `about.html` | 关于我们 |
| `contact.html` | 联系我们 / 询价表单 / 常见问题 |

三个产品页用同一个组件：点击左边（手机上是上方）的产品，右边会同时切换照片、介绍和规格。每个产品都有自己的网址，例如 `glass.html#tempered`。

旧网址（`products.html`、`product.html?id=…`、`applications.html`）会自动跳转到新页面。

## 员工如何编辑内容（Pages CMS）

**第一次设置（Lionel 做一次）：**
1. 打开 https://app.pagescms.org ，用 GitHub 账号（Lionelwwq）登录。
2. 按提示安装 Pages CMS 的 GitHub App，并允许它访问 `sailing-website` 这个仓库。
3. 打开仓库后，左侧会出现这些编辑区块：玻璃产品、镜子、配件、首页、关于页、联系页、产品页标题、公司资料、按钮和菜单文字、图片署名。
4. 让员工也能登录：在 Pages CMS 的协作者设置里按邮箱邀请，或把员工的 GitHub 账号加为仓库协作者。

**日常编辑：**
- 每段文字都有 English / 中文 / Français 三个输入框，三种语言一起改。
- 图片字段可以直接上传新照片（存到 `assets/img/`）。
- 点保存后，网站约 1–2 分钟自动更新。
- 产品的"Id"是网址里用的短代码（例如 `tempered`），新加产品时用小写英文加连字符，不要和已有的重复。

**目前用示意图代替的照片**（请尽快在编辑器里换成实拍照片）：镜子页的"Tinted Mirror"、"Antique Mirror"、"Back-Painted Glass"。另外，"Solar (PV) Glass"暂时借用了超白玻璃的照片。

## 多语言

- 右上角 EN / 中文 / FR 切换，会记住访客的选择。
- 第一次访问时按浏览器语言自动选择（中文、法文浏览器显示对应语言，其他显示英文）。
- 也可以在网址后面加 `?lang=zh` 或 `?lang=fr` 直接打开指定语言。
- 中文用简体，法文用加拿大法语（询价叫 "soumission"）。

## 询价表单

表单通过 FormSubmit（免费服务）直接把邮件发到 **公司资料 → quoteEmail**，目前是 `lionelwwq@gmail.com`。

**第一次使用前必须激活：** 在正式网站上提交一次测试询价，FormSubmit 会给这个邮箱发一封激活邮件，点里面的确认链接后，之后的询价才会送达。以后改收件邮箱，也要用新邮箱再激活一次。

如果发送失败，表单会显示公司邮箱，访客可以直接发邮件。

## 给开发人员

- 内容：`content/*.json`。每段可翻译的文字格式是 `{"en": "...", "zh": "...", "fr": "..."}`。
- 页面结构：`_src/pages/*.html`；共用的页头、页脚：`_src/layout.html`；共用区块：`_src/partials/*.html`。改完运行：

```bash
python _src/build.py
```

- 编辑器配置 `.pages.yml` 是根据内容文件自动生成的。给 JSON 加了新字段后运行：

```bash
python _src/make_cms_config.py
```

- 本地预览（内容是用 JavaScript 读取的，直接双击 html 文件打不开，需要本地服务器）：

```bash
python -m http.server 5173
```

然后打开 http://localhost:5173

- 配件的示意图在 `assets/js/diagrams.js`；页面的行为都在 `assets/js/site.js`；样式在 `assets/css/style.css`。

## 图片

- `assets/img/products`、`glass`、`site`：Sailing 自己的产品照片、玻璃照片和项目照片
- `assets/img/mirrors`：镜子的临时示意图（SVG）
- `assets/img/online`：来自 Wikimedia Commons 的照片，必须保留署名。页脚的"Photo credits"会自动列出，署名内容在 `content/credits.json`。
