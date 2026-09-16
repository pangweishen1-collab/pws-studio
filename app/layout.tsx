import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'庞伟深 · 个人资源库',description:'查找实用 Skills、超级工具和实践笔记。按场景筛选、切换列表与卡片，把有用的方法收藏起来。'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
