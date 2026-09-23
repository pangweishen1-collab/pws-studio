import {readSkill,skillBucket} from '@/lib/skill-store';

export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  try{
    const skill=await readSkill(slug);
    if(!skill)return Response.json({error:'Skill 不存在'}, {status:404});
    const selected=new URL(request.url).searchParams.get('version');
    const version=skill.versions.find(item=>item.version===(selected||skill.versions[0].version));
    if(!version)return Response.json({error:'版本不存在'}, {status:404});
    const markdown=await skillBucket().get(version.markdownKey);
    return Response.json({skill,version:version.version,markdown:markdown?await markdown.text():''});
  }catch{return Response.json({error:'Skill 暂时无法读取'}, {status:503});}
}
