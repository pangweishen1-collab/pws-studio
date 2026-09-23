import {readSkill} from '@/lib/skill-store';
import {getAutoReport} from '@/lib/skill-auto-report';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 try{const {slug}=await params,skill=await readSkill(slug);if(!skill)return Response.json({error:'Skill 不存在'},{status:404});
 const selected=new URL(request.url).searchParams.get('version');const version=skill.versions.find(v=>v.version===(selected||skill.versions[0]?.version));if(!version)return Response.json({error:'版本不存在'},{status:404});
 return Response.json(await getAutoReport(slug,version),{headers:{'Cache-Control':'public, max-age=300'}});
 }catch{return Response.json({error:'自动检测暂时未完成，请稍后重试。'},{status:503})}
}
