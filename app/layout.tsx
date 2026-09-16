import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'庞伟深 · 个人实践与创造空间',description:'整理实用 Skills 与工具，记录实践笔记，收集超级工具链接。保持好奇，让实践生长。'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN" className="dark"><body>{children}</body></html>}
