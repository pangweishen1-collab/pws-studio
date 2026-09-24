const base=process.argv[2]||'https://pws-studio.pangweishen1.workers.dev';
async function get(path){const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response;}
const list=await (await get('/api/skills')).json();
if(!Array.isArray(list.skills)||!list.skills.length)throw new Error('Skill catalog is empty');
const slug=list.skills[0].slug;
const [home,detail]=await Promise.all([get('/').then(r=>r.text()),get(`/skills/${slug}`).then(r=>r.text()),get('/experience'),get('/brand/pws-studio-integrated.webp'),get('/api/tools/usage')]);
if(!home.includes('PWS STUDIO')||!home.includes(list.skills[0].title))throw new Error('Home server-rendered catalog is missing');
if(!detail.includes(list.skills[0].title)||detail.includes('正在加载 Skill…'))throw new Error('Detail initial content is missing');
console.log(`PASS ${base}: ${list.skills.length} Skills, server-rendered home/detail, routes, image and usage API`);
