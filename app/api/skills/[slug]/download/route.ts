import {invalidateSkillCatalog} from '@/lib/skill-store';
import {readSkill,skillBucket} from '@/lib/skill-store';

export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  try{
    const skill=await readSkill(slug);
    if(!skill)return new Response('Not found',{status:404});
    const selected=new URL(request.url).searchParams.get('version');
    const version=skill.versions.find(item=>item.version===(selected||skill.versions[0].version));
    if(!version)return new Response('Version not found',{status:404});
    const useZip=Boolean(version.zipKey)&&new URL(request.url).searchParams.get('format')!=='markdown';
    const bucket=skillBucket();
    const object=await bucket.get(useZip?version.zipKey!:version.markdownKey);
    if(!object)return new Response('File not found',{status:404});
    await bucket.put(`skills/${slug}/downloads/${crypto.randomUUID()}`,new Uint8Array(0));
    invalidateSkillCatalog();
    const filename=useZip?`${slug}-${version.version}.zip`:'SKILL.md';
    return new Response(object.body,{headers:{'Content-Type':useZip?'application/zip':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store'}});
  }catch{return new Response('Download unavailable',{status:503});}
}
