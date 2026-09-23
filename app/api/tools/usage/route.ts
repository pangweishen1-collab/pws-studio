import {catalog} from '@/lib/catalog';
import {skillBucket} from '@/lib/skill-store';

const tools=catalog.filter(item=>item.source==='个人工具');
async function countUses(id:string){
  const bucket=skillBucket();
  let count=0,cursor:string|undefined;
  do{
    const page=await bucket.list({prefix:`tool-usage/${id}/`,cursor,limit:1000});
    count+=page.objects.length;
    cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  return count;
}
export async function GET(){
  try{
    const counts=Object.fromEntries(await Promise.all(tools.map(async tool=>[tool.id,await countUses(tool.id)])));
    return Response.json({counts},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'统计暂不可用'},{status:503});}
}
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
  try{
    const {id,eventId}=await request.json() as {id:string;eventId:string};
    if(!tools.some(tool=>tool.id===id)||typeof eventId!=='string'||!/^[a-f0-9-]{36}$/.test(eventId))return new Response('Invalid event',{status:400});
    await skillBucket().put(`tool-usage/${id}/${eventId}`,new Uint8Array(0));
    return Response.json({count:await countUses(id)},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'记录失败'},{status:503});}
}
