import {env} from 'cloudflare:workers';
import {cache} from 'react';
import {createAsyncCache} from './async-cache';

export type SkillFile={path:string;size:number;archivePath?:string;previewable:boolean};
export type SkillVersion={version:string;publishedAt:string;markdownKey:string;zipKey?:string;files?:SkillFile[]};
export type PublishedSkill={slug:string;title:string;summary:string;category:string;tags:string[];author:string;updatedAt:string;versions:SkillVersion[];downloadCount?:number;favoriteCount?:number;source?:{repo:string;url:string;stars:number;commit:string;checkedAt:string;license:string}};

type SkillEnv={SKILLS_BUCKET?:R2Bucket;SKILL_UPLOAD_KEY?:string};
const bindings=env as unknown as SkillEnv;

export function skillBucket(){
  if(!bindings.SKILLS_BUCKET)throw new Error('Skill 存储尚未配置');
  return bindings.SKILLS_BUCKET;
}

export const readSkill=cache(async (slug:string)=>{
  if(!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug))return null;
  const object=await skillBucket().get(`skills/${slug}/current.json`);
  if(!object)return null;
  return JSON.parse(await object.text()) as PublishedSkill;
});

const catalogCache=createAsyncCache<PublishedSkill[]>(30_000);
export const invalidateSkillCatalog=()=>catalogCache.invalidate();
export const listSkills=()=>catalogCache.get(loadSkills);
export const listSkillSummaries=async ()=>(await listSkills()).map(skill=>({...skill,versions:skill.versions.map(({files,...version})=>version)}));
async function loadSkills(){
  const bucket=skillBucket();
  let cursor:string|undefined;
  const result:PublishedSkill[]=[];
  do{
    const page=await bucket.list({prefix:'skills/',delimiter:'/',cursor,limit:100});
    const records=await Promise.all(page.delimitedPrefixes.map(async prefix=>{
      const object=await bucket.get(`${prefix}current.json`);
      return object?JSON.parse(await object.text()) as PublishedSkill:null;
    }));
    result.push(...records.filter((item):item is PublishedSkill=>item!==null&&item.slug!=='demo-skill'));
    cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  await Promise.all(result.map(async skill=>{[skill.downloadCount,skill.favoriteCount]=await Promise.all([countSkillDownloads(skill.slug,bucket),countSkillFavorites(skill.slug,bucket)])}));
  return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

export async function countSkillDownloads(slug:string,bucket:R2Bucket){
  let cursor:string|undefined,count=0;
  do{
    const page=await bucket.list({prefix:`skills/${slug}/downloads/`,cursor,limit:1000});
    count+=page.objects.length;
    cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  return count;
}

export async function countSkillFavorites(slug:string,bucket:R2Bucket){
 let cursor:string|undefined,count=0;
 do{const page=await bucket.list({prefix:`skills/${slug}/favorites/`,cursor,limit:1000});count+=page.objects.length;cursor=page.truncated?page.cursor:undefined;}while(cursor);
 return count;
}

export async function isOwnerRequest(request:Request){
  const expected=bindings.SKILL_UPLOAD_KEY;
  const actual=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if(!expected||!actual||actual.length>256)return false;
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(actual)),crypto.subtle.digest('SHA-256',encoder.encode(expected))]);
  const actualHash=new Uint8Array(a),expectedHash=new Uint8Array(b);
  let difference=0;
  for(let index=0;index<actualHash.length;index++)difference|=actualHash[index]^expectedHash[index];
  return difference===0;
}

export type SkillDetailData={skill:PublishedSkill;version:string;markdown:string};
export async function readSkillDetail(slug:string,selected?:string):Promise<SkillDetailData|null>{
 const skill=await readSkill(slug);
 if(!skill)return null;
 const version=skill.versions.find(item=>item.version===(selected||skill.versions[0]?.version));
 if(!version)return null;
 const bucket=skillBucket();
 const [markdown,downloadCount]=await Promise.all([
  bucket.get(version.markdownKey).then(object=>object?object.text():''),
  countSkillDownloads(slug,bucket).catch(()=>undefined),
 ]);
 return {skill:{...skill,downloadCount},version:version.version,markdown};
}
