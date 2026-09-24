import {getAutoReport} from '@/lib/skill-auto-report';
import {isOwnerRequest,listSkillSummaries,invalidateSkillCatalog,readSkill,skillBucket,type PublishedSkill,type SkillFile} from '@/lib/skill-store';
import {openSkillArchive} from '@/lib/skill-archive';

export async function GET(){
  try{return Response.json({skills:await listSkillSummaries()},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:'Skill 列表暂时不可用'}, {status:503});}
}

export async function POST(request:Request){
  if(!(await isOwnerRequest(request)))return Response.json({error:'发布密钥无效或尚未配置'}, {status:401});
  const length=Number(request.headers.get('content-length')||0);
  if(length>12*1024*1024)return Response.json({error:'文件不能超过 10 MB'}, {status:413});
  let data:FormData;
  try{data=await request.formData();}catch{return Response.json({error:'上传内容无法读取'}, {status:400});}
  const field=(key:string)=>String(data.get(key)||'').trim();
  const title=field('title'),slug=field('slug').toLowerCase(),summary=field('summary'),category=field('category'),version=field('version');
  const tags=field('tags').split(/[,，]/).map(tag=>tag.trim()).filter(Boolean).slice(0,8);
  const markdown=data.get('markdown'),zip=data.get('zip');
  if(!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug)||!title||title.length>80||!summary||summary.length>500||!category||category.length>40||!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(version))return Response.json({error:'请检查名称、英文标识、简介、分类和版本号'}, {status:400});
  if(markdown instanceof File&&markdown.size>0&&(markdown.size<10||markdown.size>150*1024||!/^skill\.md$/i.test(markdown.name)))return Response.json({error:'SKILL.md 需要是 150 KB 以内的 Markdown 文件'}, {status:400});
  if(zip instanceof File&&zip.size>0&&(zip.size>10*1024*1024||!zip.name.toLowerCase().endsWith('.zip')))return Response.json({error:'附件需要是 10 MB 以内的 ZIP'}, {status:400});
  let markdownText=markdown instanceof File&&markdown.size>0?await markdown.text():'';
  let zipData:ArrayBuffer|undefined;
  let files:SkillFile[]=[];
  if(zip instanceof File&&zip.size>0){
    zipData=await zip.arrayBuffer();
    const header=new Uint8Array(zipData,0,Math.min(4,zipData.byteLength));
    if(header[0]!==0x50||header[1]!==0x4b||header[2]!==0x03||header[3]!==0x04)return Response.json({error:'ZIP 文件格式无效'}, {status:400});
    try{
      const archive=await openSkillArchive(zipData);
      files=archive.files;
      const skillMd=files.filter(file=>/(^|\/)SKILL\.md$/i.test(file.path)).sort((a,b)=>a.path.length-b.path.length)[0];
      if(skillMd){
        if(skillMd.size>150*1024)throw new Error('ZIP 中的 SKILL.md 不能超过 150 KB');
        const archivedMarkdown=await archive.zip.file(skillMd.archivePath!)!.async('string');
        if(markdownText&&markdownText.trim()!==archivedMarkdown.trim())throw new Error('单独上传的 SKILL.md 与 ZIP 中的内容不一致');
        markdownText=archivedMarkdown;
      }else if(markdownText){
        archive.zip.file('SKILL.md',markdownText);
        const repacked=await archive.zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
        zipData=repacked.buffer.slice(repacked.byteOffset,repacked.byteOffset+repacked.byteLength) as ArrayBuffer;
        if(zipData.byteLength>10*1024*1024)throw new Error('补齐 SKILL.md 后的 ZIP 超过 10 MB');
        files.unshift({path:'SKILL.md',size:new TextEncoder().encode(markdownText).byteLength,archivePath:'SKILL.md',previewable:true});
      }
    }catch(error){return Response.json({error:error instanceof Error?error.message:'ZIP 无法读取'}, {status:400});}
  }
  if(!markdownText.trim())return Response.json({error:'请上传 SKILL.md，或上传包含 SKILL.md 的 ZIP'}, {status:400});
  if(!files.length)files=[{path:'SKILL.md',size:new TextEncoder().encode(markdownText).byteLength,previewable:true}];
  const existing=await readSkill(slug);
  if(existing?.versions.some(item=>item.version===version))return Response.json({error:'该版本号已经发布'}, {status:409});
  const author=field('author')||existing?.author||'庞伟深';
  const bucket=skillBucket(),publishedAt=new Date().toISOString(),base=`skills/${slug}/versions/${encodeURIComponent(version)}`;
  const markdownKey=`${base}/SKILL.md`,zipKey=zip instanceof File&&zip.size>0?`${base}/${slug}-${version}.zip`:undefined;
  await bucket.put(markdownKey,markdownText,{httpMetadata:{contentType:'text/markdown; charset=utf-8'}});
  if(zipKey&&zipData)await bucket.put(zipKey,zipData,{httpMetadata:{contentType:'application/zip'}});
  const sourceText=field('source');
  const source=sourceText?JSON.parse(sourceText) as PublishedSkill['source']:existing?.source;
  const skill:PublishedSkill={source,slug,title,summary,category,tags,author,updatedAt:publishedAt,versions:[{version,publishedAt,markdownKey,zipKey,files},...(existing?.versions||[])]};
  await bucket.put(`skills/${slug}/current.json`,JSON.stringify(skill),{httpMetadata:{contentType:'application/json'}});
  invalidateSkillCatalog();
  let evaluationStatus='complete';
  try{await getAutoReport(slug,skill.versions[0])}catch{evaluationStatus='pending'}
  return Response.json({skill,evaluationStatus},{status:201});
}
