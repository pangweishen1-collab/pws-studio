import {readSkillDetail,isOwnerRequest,readSkill,skillBucket} from '@/lib/skill-store';

export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  try{
    const selected=new URL(request.url).searchParams.get('version')||undefined;
    const detail=await readSkillDetail(slug,selected);
    if(!detail)return Response.json({error:'Skill 或版本不存在'}, {status:404});
    return Response.json(detail,{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Skill 暂时无法读取'}, {status:503});}
}

export async function PATCH(request:Request,{params}:{params:Promise<{slug:string}>}){
  if(!(await isOwnerRequest(request)))return Response.json({error:'发布密钥无效'}, {status:401});
  const {slug}=await params;
  try{
    const data=await request.json() as {author?:unknown;category?:unknown};
    const skill=await readSkill(slug);
    if(!skill)return Response.json({error:'Skill 不存在'}, {status:404});
    const updated={...skill};
    if(data.author!==undefined){if(typeof data.author!=='string'||!data.author.trim()||data.author.length>80)return new Response('Invalid author',{status:400});updated.author=data.author.trim()}
    if(data.category!==undefined){if(typeof data.category!=='string'||!data.category.trim()||data.category.length>40)return new Response('Invalid category',{status:400});updated.category=data.category.trim()}
    await skillBucket().put(`skills/${slug}/current.json`,JSON.stringify(updated),{httpMetadata:{contentType:'application/json'}});
    return Response.json({skill:updated});
  }catch{return Response.json({error:'作者信息更新失败'}, {status:503});}
}
