import type {Metadata} from 'next';
import SiteClient from '../site-client';
export const metadata:Metadata={title:'经验沉淀 · PWS STUDIO',description:'整理项目复盘、需求方法和创作经验，让每一次实践成为可以复用的资产。'};
export default function ExperiencePage(){return <SiteClient experienceMode/>}
