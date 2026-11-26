# Sailing International Trade 网站

多页静态网站，支持英文 / 法文 / 荷兰文 / 德文 / 西班牙文五种语言（2026 年 11 月起不再提供中文）。所有文字、产品和图片都放在 `content/` 文件夹的 JSON 文件里，员工可以通过 **Pages CMS** 在线编辑器修改，不需要碰代码。

## 页面

| 文件 | 页面 |
| --- | --- |
| `index.html` | 首页（最上方是公司大门，点"进入展厅"走进展厅，见下文） |
| `glass.html` | 产品：玻璃（11 种） |
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
- 每段文字都有 English / Français / Nederlands / Deutsch / Español 五个输入框，五种语言一起改。
- 图片字段可以直接上传新照片（存到 `assets/img/`）。
- 点保存后，网站约 1–2 分钟自动更新。
- 产品的"Id"是网址里用的短代码（例如 `tempered`），新加产品时用小写英文加连字符，不要和已有的重复。

**还缺专门照片的产品**："Solar (PV) Glass"暂时借用超白玻璃的照片；"Tempered Glass"和"Safety-Backed Mirror"用的是旧照片。

**注意：** 首页最上方现在是公司大门，编辑器里"首页 → Hero image"这张图暂时不会显示（首页的标题、介绍文字照常显示在大门左边的石墙上）。

## 首页大门和展厅

首页一打开是公司大门（新 logo 招牌、玻璃双门，透过玻璃能看到展厅前台），首页文字在左边的石墙上。点"进入展厅"，镜头穿过玻璃门走进去，然后打开展厅（`showroom.html`），画面正好接上。展厅先显示从门口看进去的高清全景照片，再加 6 张走近各区域的照片：点下面的区域按钮、双击照片上的区域或按数字键，就会"走"进那个区域（画面推近再淡入近景照片）；点"整个展厅"、左边的 ← 、Esc 或退格键走回来。可以拖动/滑动看四周，滚轮、双指或 +/− 放大。点金色圆点会推近到那个产品并打开产品卡片（照片、简介、加入询价单、查看产品，‹ › 切换同一区域的其他产品）。网址带 `#mirrors` 这样的结尾可以直接打开某个区域。手机上大门照片在上面，文字在下面。

- 大门照片用 `python _src/make_home_entrance.py 大门图片.png` 生成（`assets/img/site/front-entrance*.jpg`）；大门在照片里的位置写在 `assets/js/home-door.js` 开头的 `DOORS`。走进门后看到的是展厅照片的手机版（`assets/img/showroom/showroom-m.jpg`）。样式在 `assets/css/home-door.css`。
- 以前的仓库导览（卷帘门）已经不在首页上了，它的文件（`assets/js/warehouse.js`、`assets/css/warehouse.css`、`assets/img/warehouse/scene.json`）还留着；区域照片 `zone-*.webp` 和大楼照片还在别的地方用（首页产品卡片、产品目录封面、关于我们横幅）。

原版首页（大图版，仓库导览之前的样子）保留在 `home-classic.html`，没有放进菜单和网站地图，用于对比。

- 图片都在 `assets/img/warehouse/`：外观（`entrance.webp`、关门版 `entrance-closed.webp`）、室内全景（`warehouse-photo.webp`）和 7 张区域特写（`zone-*.webp`）。
- 用哪张图、7 个圆点的位置、特写里的产品点，都写在 `assets/img/warehouse/scene.json`。坐标按 1672 × 941 的画面计算。换图时只改这个文件，不用改代码。
- 文字、按钮和行为在 `assets/js/warehouse.js`，样式在 `assets/css/warehouse.css`。
- 关于我们页的「全球市场布局」是一个可拖动的 3D 地球（`assets/js/globe.js`，不用任何外部库）。市场名称、说明和两个数字在 `content/pages/about.json`（`market_*`、`markets`），编辑器里可以改；每个市场在地球上的位置写在 `globe.js` 开头的 `PLACES`，列表第一个市场（亚洲）是所有航线的起点。陆地轮廓来自 `assets/img/site/land-mask.png`，由 `_src/make_land_mask.py` 从 Natural Earth 公共领域数据生成。
- 产品目录（数字版）：网页 `catalogue.html`（产品菜单和页脚里都有链接），文字在 `content/pages/catalogue.json`。PDF、封面图和每页预览图都在 `assets/catalogue/`，由 `_src/make_catalogue.py` 生成：目录的内容（产品介绍、规格、联系方式 `CONTACT`）写在脚本里，排版在 `_src/catalogue/catalogue.css`，照片和「典型用途」直接用网站上的。换照片或改内容后运行 `python _src/make_catalogue.py`（需要 Chrome、Pillow、PyMuPDF），PDF 和网页预览会一起更新。目录有英文、法文、西班牙文三个版本（文字按 Sailing 提供的译文，写在脚本里的 `L(英, 法, 西)` 中）：英文在 `assets/catalogue/`，法文在 `assets/catalogue/fr/`，西班牙文在 `assets/catalogue/es/`；只更新一个版本可运行 `python _src/make_catalogue.py fr`。网页上的翻页书默认跟随网站语言（法文网站显示法文目录），访客也可以在书上方切换；分享时可用 `catalogue.html?edition=es` 这样的链接直接打开某个版本。
- 展厅：网页 `showroom.html`（产品菜单和首页按钮都有链接），文字在 `content/pages/showroom.json`。照片、金色产品点和区域按钮在 `assets/img/showroom/showroom.json`：产品点的 x/y 是在照片里的位置（照片宽和高的百分比），点开就是对应产品页；每个区域按钮自动移到它那组产品的中间并放大。照片按 `_design/showroom-inside-prompt.md` 生成（Codex 存成 `showroom-inside.png` 和 `points.json`），然后运行 `python _src/make_showroom.py 文件夹`：生成电脑版 `showroom.jpg`（最宽 5120 像素，放大也清楚）和手机版 `showroom-m.jpg`（2560 像素），并写入产品点。手动移动 `showroom.json` 里的点以后，运行 `python _src/make_showroom.py --points-only` 重新计算区域按钮。走近各区域的照片按 `_design/showroom-walk-prompt.md` 生成（`view-<区域>.png` 和 `points-<区域>.json`），用 `python _src/make_showroom.py --walk 文件夹` 安装（生成 `showroom-<区域>.jpg` 和手机版）。产品卡片的特写照片按 `_design/showroom-closeups-prompt.md` 生成（`glass-clear-float.png` 这样的文件名），用 `python _src/make_showroom.py --closeups 文件夹` 安装；还没有特写的产品卡片显示产品页上的照片。
- Logo（2026 年 11 月起用新 logo：紫色手写体 "S" + 小帆船）：原图在 `_src/brand/sailing-mark.png`。运行 `python _src/make_logo.py` 生成网页用的 `assets/img/site/sailing-logo.png`（页头页脚）、`sailing-mark.png`（浏览器图标）和 `sailing-mark-light.png`（目录深色页用）；运行 `python _src/warehouse_sign.py` 把招牌画到旧的仓库大楼照片上（目录封面还在用；关于我们页面的横幅现在是新大门照片的下半部分 `hero-about-door.jpg`）；运行 `python _src/make_catalogue.py` 更新三本目录。换 logo 时只要换掉原图再依次运行这几个脚本。
- 外观墙上的公司招牌（舵轮标志 + SAILING / INTERNATIONAL TRADE LTD）是用 `_src/warehouse_sign.py` 合成上去的，没有招牌的原图在 `_src/warehouse/`。换 logo、颜色或公司名后，改脚本开头的几行再运行 `python _src/warehouse_sign.py`，开门和关门两张图会一起更新，位置保持一致。
- 生成 AI 图片的提示词在本机的 `_design/warehouse-AI-prompt.txt`（不上传）。

## 多语言

- 右上角 EN / FR / NL / DE / ES 切换（手机上在菜单里），会记住访客的选择。
- 第一次访问时按浏览器语言自动选择（法文、荷兰文、德文、西班牙文浏览器显示对应语言，其他显示英文）。
- 也可以在网址后面加 `?lang=fr`、`?lang=nl`、`?lang=de`、`?lang=es` 直接打开指定语言。
- 法文用加拿大法语（询价叫 "soumission"）。荷兰文、德文、西班牙文是新翻译的，正式使用前最好请母语人士看一遍。产品目录的西班牙文版本跟随西班牙文网站自动打开。

## 询价表单

表单通过 FormSubmit（免费服务）发邮件：表单登记在 **公司资料 → quoteEmail**（`administration@sailingtrades.com`，第一次收到 FormSubmit 的激活邮件，每封询价也会收到一份），并抄送到 **quoteCc**（`sales@sailingtrades.com`，销售收询价）。换地址后，第一封询价会触发一封激活邮件，要在那个邮箱里点 "Activate" 才会开始转发。

**第一次使用前必须激活：** 在正式网站上提交一次测试询价，FormSubmit 会给这个邮箱发一封激活邮件，点里面的确认链接后，之后的询价才会送达。以后改收件邮箱，也要用新邮箱再激活一次。

如果发送失败，表单会显示公司邮箱，访客可以直接发邮件。

## 给开发人员

- 内容：`content/*.json`。每段可翻译的文字格式是 `{"en": "...", "zh": "...", "fr": "..."}`。
- 页面结构：`_src/pages/*.html`；共用的页头、页脚：`_src/layout.html`；共用区块：`_src/partials/*.html`。改完运行：

```bash
python _src/build.py
```

  构建时会给 `assets/css`、`assets/js` 的链接加上版本号（如 `site.js?v=096fbad3`，按文件内容计算）。改了 CSS 或 JS 之后也要重新构建，访客的浏览器才会加载新文件，而不是用缓存里的旧版本。

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
- 测试：`python tests/check_content.py` 检查内容文件；在本地服务器打开 http://localhost:5173/tests/smoke.html 点 Run，会在五种语言、三种屏幕宽度下检查所有页面和仓库导览。

## 图片

- `assets/img/products`、`glass`、`site`：Sailing 自己的产品照片、玻璃照片和项目照片
- `assets/img/library`：公司照片库（同事整理的产品照片和海报）
- `assets/img/warehouse`：首页仓库导览的图片（AI 生成）
- `assets/img/online`：来自 Wikimedia Commons 的照片，必须保留署名。页脚的"Photo credits"会自动列出，署名内容在 `content/credits.json`。弧形玻璃的两张 Unsplash 照片也列在这里。
