import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
config.name='pws-studio';config.workers_dev=true;
config.r2_buckets=[{binding:'SKILLS_BUCKET',bucket_name:'pws-studio-skills'}];
await writeFile('dist/server/wrangler.production.json',JSON.stringify(config,null,2));
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','dist/server/wrangler.production.json'],{stdio:'inherit'});
process.exit(result.status??1);
