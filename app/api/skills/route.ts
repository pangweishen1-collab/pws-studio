import {isOwnerRequest,listSkills,readSkill,skillBucket,type PublishedSkill} from '@/lib/skill-store';

export async function GET(){
  try{return Response.json({skills:await listSkills()});}
  catch{return Response.json({error:'Skill 列表暂时不可用'}, {status:503});}
}

export async function POST(request:Request){
  if(!(await isOwnerRequest(request)))return Response.json({error:'发布密钥无效或尚未配置'}, {status:401});
  const length=Number(request.headers.get('content-length')||0);
  if(length>12*1024*1024)return Response.json({error:'文件不能超过 10 MB'}, {status:413});
  let data:FormData;
  try{data=await request.formData();}catch{return Response.json({error:'上传内容无法读取'}, {status:400});}
  const field=(key:string)=>String(data.get(key)||'').trim();
  const title=field('title'),slug=field('slug').toLowerCase(),summary=field('summary'),category=field('category'),author=field('author')||'庞伟深',version=field('version');
  const tags=field('tags').split(/[,，]/).map(tag=>tag.trim()).filter(Boolean).slice(0,8);
  const markdown=data.get('markdown'),zip=data.get('zip');
  if(!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug)||!title||title.length>80||!summary||summary.length>500||!category||category.length>40||!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(version))return Response.json({error:'请检查名称、英文标识、简介、分类和版本号'}, {status:400});
  if(!(markdown instanceof File)||markdown.size<10||markdown.size>150*1024||!/^skill\.md$/i.test(markdown.name))return Response.json({error:'请上传名为 SKILL.md 的文件（不超过 150 KB）'}, {status:400});
  if(zip instanceof File&&zip.size>0&&(zip.size>10*1024*1024||!zip.name.toLowerCase().endsWith('.zip')))return Response.json({error:'附件需要是 10 MB 以内的 ZIP'}, {status:400});
  const markdownText=await markdown.text();
  if(!markdownText.trim())return Response.json({error:'SKILL.md 不能为空'}, {status:400});
  let zipData:ArrayBuffer|undefined;
  if(zip instanceof File&&zip.size>0){
    zipData=await zip.arrayBuffer();
    const header=new Uint8Array(zipData,0,Math.min(4,zipData.byteLength));
    if(header[0]!==0x50||header[1]!==0x4b||header[2]!==0x03||header[3]!==0x04)return Response.json({error:'ZIP 文件格式无效'}, {status:400});
  }
  const existing=await readSkill(slug);
  if(existing?.versions.some(item=>item.version===version))return Response.json({error:'该版本号已经发布'}, {status:409});
  const bucket=skillBucket(),publishedAt=new Date().toISOString(),base=`skills/${slug}/versions/${encodeURIComponent(version)}`;
  const markdownKey=`${base}/SKILL.md`,zipKey=zip instanceof File&&zip.size>0?`${base}/${slug}-${version}.zip`:undefined;
  await bucket.put(markdownKey,markdownText,{httpMetadata:{contentType:'text/markdown; charset=utf-8'}});
  if(zipKey&&zipData)await bucket.put(zipKey,zipData,{httpMetadata:{contentType:'application/zip'}});
  const skill:PublishedSkill={slug,title,summary,category,tags,author,updatedAt:publishedAt,versions:[{version,publishedAt,markdownKey,zipKey},...(existing?.versions||[])]};
  await bucket.put(`skills/${slug}/current.json`,JSON.stringify(skill),{httpMetadata:{contentType:'application/json'}});
  return Response.json({skill},{status:201});
}
