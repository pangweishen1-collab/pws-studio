import {env} from 'cloudflare:workers';

export type SkillVersion={version:string;publishedAt:string;markdownKey:string;zipKey?:string};
export type PublishedSkill={slug:string;title:string;summary:string;category:string;tags:string[];author:string;updatedAt:string;versions:SkillVersion[]};

type SkillEnv={SKILLS_BUCKET?:R2Bucket;SKILL_UPLOAD_KEY?:string};
const bindings=env as unknown as SkillEnv;

export function skillBucket(){
  if(!bindings.SKILLS_BUCKET)throw new Error('Skill 存储尚未配置');
  return bindings.SKILLS_BUCKET;
}

export async function readSkill(slug:string){
  if(!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug))return null;
  const object=await skillBucket().get(`skills/${slug}/current.json`);
  if(!object)return null;
  return JSON.parse(await object.text()) as PublishedSkill;
}

export async function listSkills(){
  const bucket=skillBucket();
  let cursor:string|undefined;
  const result:PublishedSkill[]=[];
  do{
    const page=await bucket.list({prefix:'skills/',delimiter:'/',cursor,limit:100});
    const records=await Promise.all(page.delimitedPrefixes.map(async prefix=>{
      const object=await bucket.get(`${prefix}current.json`);
      return object?JSON.parse(await object.text()) as PublishedSkill:null;
    }));
    result.push(...records.filter((item):item is PublishedSkill=>item!==null));
    cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

export async function isOwnerRequest(request:Request){
  const expected=bindings.SKILL_UPLOAD_KEY;
  const actual=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if(!expected||!actual||actual.length>256)return false;
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(actual)),crypto.subtle.digest('SHA-256',encoder.encode(expected))]);
  return new Uint8Array(a).every((byte,index)=>byte===new Uint8Array(b)[index]);
}
