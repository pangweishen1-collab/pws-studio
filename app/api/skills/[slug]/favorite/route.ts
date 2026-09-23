import {readSkill,skillBucket,countSkillFavorites} from '@/lib/skill-store';
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 try{
  const {slug}=await params;
  if(!await readSkill(slug))return new Response('Not found',{status:404});
  const {visitorId,saved}=await request.json() as {visitorId:string;saved:boolean};
  if(typeof visitorId!=='string'||!/^[a-f0-9-]{36}$/.test(visitorId)||typeof saved!=='boolean')return new Response('Invalid request',{status:400});
  const bucket=skillBucket(),key=`skills/${slug}/favorites/${visitorId}`;
  if(saved)await bucket.put(key,new Uint8Array(0));else await bucket.delete(key);
  return Response.json({count:await countSkillFavorites(slug,bucket)},{headers:{'Cache-Control':'no-store'}});
 }catch{return new Response('Unavailable',{status:503});}
}
