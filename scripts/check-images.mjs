import {readdir} from 'node:fs/promises';
import path from 'node:path';
async function scan(dir){const bad=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())bad.push(...await scan(file));else if(/\.(png|jpe?g|gif|avif|svg)$/i.test(file)&&file!=='public/screenshot.jpeg')bad.push(file);}return bad;}
const bad=await scan('public');if(bad.length){console.error('请先将展示图片压缩为 WebP：\n'+bad.join('\n'));process.exitCode=1;}else console.log('展示图片检查通过：全部为 WebP。');
