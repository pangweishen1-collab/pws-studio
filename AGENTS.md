# 网站图片规则

- 新增或更新的网站展示图片一律先压缩为 WebP，再加入 public 并引用；按实际显示尺寸提供适当分辨率。
- 保持宽高比及透明通道；图片填写尺寸，首屏外的大图使用 loading="lazy" 和 decoding="async"。
- 图标图片同样使用 WebP；代码内的 Lucide/SVG 界面图标保持矢量。
- 下载包中的原始素材、Skill 源文件保持原格式，不破坏可下载内容。Sites 要求的 public/screenshot.jpeg 如有则保留。
- 构建前运行 npm run check:images，防止非 WebP 展示图片回归。
