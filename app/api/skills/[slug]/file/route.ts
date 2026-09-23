import JSZip from 'jszip';
import {readSkill,skillBucket} from '@/lib/skill-store';

export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,url=new URL(request.url),path=url.searchParams.get('path')||'',selected=url.searchParams.get('version');
  try{
    const skill=await readSkill(slug);
    if(!skill)return new Response('Skill 不存在',{status:404});
    const version=skill.versions.find(item=>item.version===(selected||skill.versions[0].version));
    if(!version)return new Response('版本不存在',{status:404});
    const file=version.files?.find(item=>item.path===path)||(path==='SKILL.md'&&!version.files?{path:'SKILL.md',size:0,previewable:true}:undefined);
    if(!file)return new Response('文件不存在',{status:404});
    if(!file.previewable||file.size>256*1024)return new Response('此文件不支持在线预览',{status:415});
    let content:string;
    if(file.archivePath&&version.zipKey){
      const object=await skillBucket().get(version.zipKey);
      if(!object)return new Response('文件包不存在',{status:404});
      const zip=await JSZip.loadAsync(await object.arrayBuffer());
      const entry=zip.file(file.archivePath);
      if(!entry)return new Response('文件不存在',{status:404});
      content=await entry.async('string');
    }else{
      const object=await skillBucket().get(version.markdownKey);
      if(!object)return new Response('文件不存在',{status:404});
      content=await object.text();
    }
    const filename=file.path.split('/').pop()||'file.txt';
    const headers:Record<string,string>={'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=3600'};
    if(url.searchParams.get('download')==='1')headers['Content-Disposition']=`attachment; filename="download.txt"; filename*=UTF-8''${encodeURIComponent(filename)}`;
    return new Response(content,{headers});
  }catch{return new Response('文件暂时无法读取',{status:503});}
}
