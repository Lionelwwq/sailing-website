# Sailing International Trade 网站

多页静态网站，不需要服务器或数据库，任何静态主机都能直接上传使用。

## 页面

| 文件 | 页面 |
| --- | --- |
| `index.html` | 首页 Home |
| `products.html` | 玻璃产品 Products（9 种玻璃） |
| `accessories.html` | 配件目录 Accessories（筛选、搜索、排序） |
| `product.html?id=…` | 单个配件详情页（16 个配件共用一个模板） |
| `applications.html` | 按应用场景浏览 Applications |
| `about.html` | 关于我们 About Us |
| `contact.html` | 联系我们 + 报价表单 + FAQ |

## 修改内容

- **产品文字、规格、照片、应用场景、玻璃类型**：`assets/js/products.js`。改完刷新页面即可，不需要重新构建。
- **页面内容**（标题、段落等）：`_src/pages/*.html`
- **所有页面共用的部分**（顶部栏、导航、页脚、报价清单）：`_src/layout.html`
- **多个页面共用的区块**（联系卡片、订购流程、地图）：`_src/partials/*.html`

改了 `_src` 里的文件后，在网站文件夹运行一次：

```bash
python _src/build.py
```

它会重新生成根目录下的 7 个 `.html` 文件。不要直接改根目录的 `.html`，下次构建会被覆盖。

## 本地预览

```bash
python -m http.server 5173
```

然后打开 http://localhost:5173

## 图片

- `assets/img/products`、`glass`、`site`：来自 sailingintltrade.com 的产品照片、玻璃照片、项目照片和 logo
- `assets/img/online`：来自 Wikimedia Commons 的照片，必须保留署名（页脚的 “Photo credits” 已自动列出）

## 报价表单

表单没有后台：点击发送会打开访客的邮件程序，内容已填好，发往 info@sailingintltrade.com。如果要直接发到邮箱，需要接入表单服务（如 Formspree）或后端。
