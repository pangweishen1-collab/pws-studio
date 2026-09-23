import {readSkill,skillBucket} from '@/lib/skill-store';

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  try{
    const skill=await readSkill(slug);
    if(!skill)return Response.json({error:'Skill 不存在'}, {status:404});
    const markdown=await skillBucket().get(skill.versions[0].markdownKey);
    return Response.json({skill,markdown:markdown?await markdown.text():''});
  }catch{return Response.json({error:'Skill 暂时无法读取'}, {status:503});}
}
