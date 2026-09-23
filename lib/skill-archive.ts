import JSZip from 'jszip';
import type {SkillFile} from './skill-store';

const previewExtensions=/\.(?:md|txt|json|ya?ml|toml|js|jsx|ts|tsx|py|sh|css|html|xml|csv|sql)$/i;
type SizedEntry={uncompressedSize?:number};

export async function openSkillArchive(data:ArrayBuffer){
  const zip=await JSZip.loadAsync(data);
  const entries=Object.values(zip.files).filter(file=>!file.dir&&!file.name.startsWith('__MACOSX/')&&!file.name.endsWith('.DS_Store'));
  if(entries.length>200)throw new Error('ZIP 文件数量不能超过 200 个');
  let total=0;
  const files:SkillFile[]=entries.map(file=>{
    const raw=file.unsafeOriginalName||file.name;
    if(raw.startsWith('/')||raw.includes('\\')||raw.split('/').includes('..')||file.name.split('/').includes('..'))throw new Error('ZIP 包含不安全的文件路径');
    const size=(file as typeof file&{_data?:SizedEntry})._data?.uncompressedSize;
    if(typeof size!=='number'||size<0||size>20*1024*1024)throw new Error('ZIP 包含过大的文件');
    total+=size;
    return {path:file.name,size,archivePath:file.name,previewable:size<=256*1024&&previewExtensions.test(file.name)};
  });
  if(total>30*1024*1024)throw new Error('ZIP 解压后不能超过 30 MB');
  const firstFolder=files[0]?.path.split('/')[0];
  const prefix=firstFolder?`${firstFolder}/`:'';
  if(prefix&&files.every(file=>file.path.startsWith(prefix)))for(const file of files)file.path=file.path.slice(prefix.length);
  files.sort((a,b)=>a.path.localeCompare(b.path,'zh-CN'));
  return {zip,files};
}
