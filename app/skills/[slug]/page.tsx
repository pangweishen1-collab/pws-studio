import type {Metadata} from 'next';
import SkillDetailClient from './skill-detail-client';
import {readSkill} from '@/lib/skill-store';

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  try{
    const {slug}=await params,skill=await readSkill(slug);
    if(skill)return {title:`${skill.title} · 庞伟深`,description:skill.summary,openGraph:{title:skill.title,description:skill.summary,images:[]},twitter:{card:'summary',title:skill.title,description:skill.summary,images:[]}};
  }catch{}
  return {title:'Skill 详情 · 庞伟深',description:'查看 Skill 概述、SKILL.md 文件和版本，并下载使用。',openGraph:{images:[]},twitter:{images:[]}};
}
export default async function SkillDetailPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  return <SkillDetailClient slug={slug}/>;
}
