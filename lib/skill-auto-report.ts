import {openSkillArchive} from './skill-archive';
import {skillBucket,type SkillVersion,type SkillFile} from './skill-store';
import {scanSkill,ENGINE_VERSION,type AutoReport} from './skill-auto-check';
export async function getAutoReport(slug:string,version:SkillVersion):Promise<AutoReport>{
 const bucket=skillBucket(),key=`skills/${slug}/reports/${encodeURIComponent(version.version)}/${ENGINE_VERSION}.json`;
 const cached=await bucket.get(key);if(cached)return JSON.parse(await cached.text());
 const [md,zip]=await Promise.all([bucket.get(version.markdownKey),version.zipKey?bucket.get(version.zipKey):null]);
 if(!md)throw new Error('入口文件不存在');
 const markdown=await md.text();let files:SkillFile[]=version.files||[{path:'SKILL.md',size:markdown.length,previewable:true}],texts:Record<string,string>={'SKILL.md':markdown},skippedFiles=0,archiveStatus:'valid'|'missing'|'invalid'|'none'=version.zipKey?'missing':'none';
 if(zip){try{const archive=await openSkillArchive(await zip.arrayBuffer());files=archive.files;let budget=0;for(const file of files){if(file.path==='SKILL.md')continue;if(!file.previewable||budget+file.size>1024*1024){skippedFiles++;continue}const entry=archive.zip.file(file.archivePath||file.path);if(entry){texts[file.path]=await entry.async('string');budget+=file.size}else skippedFiles++}archiveStatus='valid'}catch{archiveStatus='invalid';skippedFiles=Math.max(0,files.length-1)}}
 const bytes=new TextEncoder().encode(JSON.stringify({md:md.etag,zip:zip?.etag,version:version.version,engine:ENGINE_VERSION}));
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const report=scanSkill({version:version.version,markdown,files,texts,archiveStatus,skippedFiles,fingerprint});
 await bucket.put(key,JSON.stringify(report),{httpMetadata:{contentType:'application/json'}});return report;
}
