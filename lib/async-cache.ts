/** Short-lived per-worker cache. Concurrent misses share one operation; failures never stick. */
export function createAsyncCache<T>(ttlMs:number,now:()=>number=Date.now){
 let value:T|undefined,expires=0,pending:Promise<T>|undefined,generation=0;
 return {
  get(load:()=>Promise<T>):Promise<T>{
   if(value!==undefined&&now()<expires)return Promise.resolve(value);
   if(pending)return pending;
   const current=generation;
   const task=Promise.resolve().then(load).then(result=>{if(generation===current){value=result;expires=now()+ttlMs}return result}).finally(()=>{if(pending===task)pending=undefined});
   pending=task;return task;
  },
  invalidate(){generation++;value=undefined;expires=0;pending=undefined},
 };
}
