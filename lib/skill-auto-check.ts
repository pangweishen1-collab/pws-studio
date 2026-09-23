export const ENGINE_VERSION='1.0.0';
export type CheckStatus='pass'|'fail'|'review'|'manual';
export type AutoCheck={id:string;dimension:'T'|'R'|'A'|'C'|'E';label:string;status:CheckStatus;evidence:string[]};
export type AutoReport={engine:string;version:string;generatedAt:string;fingerprint:string;scannedFiles:number;skippedFiles:number;checks:AutoCheck[]};
export function scanSkill(input:{version:string;markdown:string;files:{path:string;size:number}[];texts:Record<string,string>;archiveStatus:'valid'|'missing'|'invalid'|'none';skippedFiles:number;fingerprint:string}):AutoReport{
 const {markdown,files,texts}=input;const checks:AutoCheck[]=[];
 const add=(id:string,dimension:AutoCheck['dimension'],label:string,status:CheckStatus,evidence:string[])=>checks.push({id,dimension,label,status,evidence});
 const risks:{label:string;pattern:RegExp}[]=[{label:'远程脚本直接执行',pattern:/curl[^\n]*\|\s*(?:bash|sh)|wget[^\n]*\|\s*(?:bash|sh)/i},{label:'递归强制删除',pattern:/\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i},{label:'疑似硬编码凭证',pattern:/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{30,})/}];
 const findings:string[]=[];
 for(const [path,text] of Object.entries(texts))for(const [i,line] of text.split('\n').entries())for(const rule of risks)if(rule.pattern.test(line))findings.push(`${path}:${i+1} · ${rule.label}（可能是示例，需审查上下文）`);
 add('risk-patterns','T','敏感操作与凭证模式扫描',findings.length?'review':'pass',findings.length?findings.slice(0,30):['已扫描文本中未命中当前规则；不代表无安全风险。']);
 add('runtime-security','T','实际权限与数据流验证','manual',['需在隔离环境记录实际操作、网络访问和授权范围。']);
 add('archive','R','文件包可读取及安全路径检查',input.archiveStatus==='valid'?'pass':input.archiveStatus==='none'?'review':'fail',[{valid:'ZIP 已解包校验，包含文件数量、路径及大小限制。',missing:'版本记录的 ZIP 对象不存在。',invalid:'ZIP 无法读取或未通过安全限制。',none:'仅 Markdown，无 ZIP；不因此判定 Skill 无效。'}[input.archiveStatus]]);
 const names=new Set(files.map(f=>f.path));const missing:string[]=[];let links=0;
 for(const [path,text] of Object.entries(texts).filter(([p])=>/\.md$/i.test(p))){
  const clean=text.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'');
  for(const m of clean.matchAll(/\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g)){
   let ref=m[1].replace(/^<|>$/g,'').split(/[?#]/)[0];if(!ref||/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(ref))continue;
   try{ref=decodeURIComponent(ref)}catch{};if(/[{}<>]/.test(ref))continue;links++;
   const segments=path.split('/').slice(0,-1);for(const part of ref.split('/')){if(part==='..')segments.pop();else if(part!=='.'&&part)segments.push(part)}
   const target=segments.join('/');if(!names.has(target)&&![...names].some(n=>n.startsWith(target+'/')))missing.push(`${path} → ${ref}`);
  }
 }
 add('links','R','Markdown 本地链接检查',missing.length?'fail':links?'pass':'review',missing.length?missing.slice(0,30):[links?`已核对 ${links} 个相对链接，未发现缺失。`:'未发现可核对的相对链接；外链、动态路径和代码引用不在此检查范围。']);
 const environment=markdown.split('\n').map((line,i)=>({line,i})).filter(({line})=>/依赖|环境|安装|Python|Node\.js|MCP|dependencies|prerequisites|requirements/i.test(line));
 add('environment','A','环境与依赖文档定位','review',environment.length?environment.slice(0,5).map(({i})=>`SKILL.md:${i+1} · 发现环境相关说明，版本和兼容性仍需确认。`):['未识别环境说明，请确认该 Skill 是否需要工具或依赖。']);
 add('compatibility','A','跨环境兼容测试','manual',['尚未在声明的工具、系统和模型中执行测试。']);
 add('entry','C','入口文件',names.has('SKILL.md')&&!!markdown.trim()?'pass':'fail',['检查非空 SKILL.md 入口。']);
 const front=markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
 add('metadata','C','名称与说明字段',front&&/^name:\s*\S+/m.test(front[1])&&/^description:\s*\S+/m.test(front[1])?'pass':'review',['检查 frontmatter 中 name、description 字段是否存在；不替代完整 YAML 语法验证。']);
 add('structure','C','Markdown 标题结构',/^##\s+\S/m.test(markdown)?'pass':'review',['检查是否有二级标题，缺少标题不等于内容不可用。']);
 add('outputs','E','输出与验收文档定位','review',[/输出|交付|验收|expected output|deliverable|acceptance/i.test(markdown)?'文档包含输出或验收说明，实际产物尚待验证。':'未识别明确的输出或验收说明。']);
 add('effectiveness','E','真实任务成功率与消耗','manual',['未执行真实任务，成功率、耗时、Token 消耗和质量分均暂无数据。']);
 if(input.skippedFiles)add('coverage','T','扫描覆盖范围','review',[`${input.skippedFiles} 个二进制、超限或不支持的文件未扫描。`]);
 return {engine:ENGINE_VERSION,version:input.version,generatedAt:new Date().toISOString(),fingerprint:input.fingerprint,scannedFiles:Object.keys(texts).length,skippedFiles:input.skippedFiles,checks};
}
