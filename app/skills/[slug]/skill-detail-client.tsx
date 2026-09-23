'use client';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {SiteHeader} from '../../site-header';
import {EvaluationReport} from './evaluation-report';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {ArrowLeft,ArrowDownToLine,Check,ChevronDown,ChevronRight,Copy,FileText,Folder,Layers3,ShieldCheck,Gauge,Info,UserRound} from 'lucide-react';
import {skillExamples} from '@/lib/skill-examples';
import {skillOverviews} from '@/lib/skill-overviews';
import {skillIcon} from '@/lib/skill-icons';
import type {PublishedSkill,SkillFile} from '@/lib/skill-store';

type Tab='overview'|'files'|'versions'|'evaluation';
type FileNode={name:string;path:string;children:FileNode[];file?:SkillFile};
const formatSize=(size:number)=>size<1024?`${size} B`:`${(size/1024).toFixed(size<10240?1:0)} KB`;
const visibleMarkdown=(text:string)=>text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/,'');
function highlightOverview(text:string){
 const phrases=['只执行本次授权的步骤','只改名称，保持结构、位置、尺寸、视觉内容、实例关联和导出设置','透明必须是真实alpha','不要用同主题旧素材替代当前图的内容','家园正俯视','10格共用其宽高，仅改变中心位置','保留原图像素尺寸、构图、色彩、柔和度'];
 return phrases.reduce((result,phrase)=>result.replaceAll(phrase,`**${phrase}**`),text);
}
function estimateTokens(text:string){
  const cjk=(text.match(/[\u3400-\u9fff]/g)||[]).length;
  return Math.round((cjk*1.5+(text.length-cjk)/4)/100)*100;
}

function fileTree(files:SkillFile[]){
  const root:FileNode={name:'',path:'',children:[]};
  for(const file of files){
    let current=root,path='';
    for(const [index,name] of file.path.split('/').entries()){
      path=path?`${path}/${name}`:name;
      let node=current.children.find(item=>item.name===name);
      if(!node){node={name,path,children:[]};current.children.push(node)}
      if(index===file.path.split('/').length-1)node.file=file;
      current=node;
    }
  }
  const sort=(node:FileNode)=>{node.children.sort((a,b)=>Number(Boolean(a.file))-Number(Boolean(b.file))||a.name.localeCompare(b.name,'zh-CN'));node.children.forEach(sort)};
  sort(root);
  return root.children;
}

function FileRow({node,depth,expanded,toggle,select}:{node:FileNode;depth:number;expanded:Set<string>;toggle:(path:string)=>void;select:(file:SkillFile)=>void}){
  const folder=!node.file;
  return <>{folder?<button className="skill-tree-row" style={{paddingLeft:16+depth*22}} onClick={()=>toggle(node.path)} aria-expanded={expanded.has(node.path)}>{expanded.has(node.path)?<ChevronDown size={14}/>:<ChevronRight size={14}/>}<Folder size={16}/><span>{node.name}</span></button>:<button className="skill-tree-row" style={{paddingLeft:30+depth*22}} onClick={()=>select(node.file!)}><FileText size={16}/><span>{node.name}</span><small>{formatSize(node.file!.size)}</small></button>}{folder&&expanded.has(node.path)&&node.children.map(child=><FileRow key={child.path} node={child} depth={depth+1} expanded={expanded} toggle={toggle} select={select}/>)}</>;
}

export default function SkillDetailClient({slug}:{slug:string}){
  const [skill,setSkill]=useState<PublishedSkill|null>(null),[markdown,setMarkdown]=useState(''),[error,setError]=useState(''),[tab,setTab]=useState<Tab>('overview'),[copied,setCopied]=useState(false),[version,setVersion]=useState(''),[selectedFile,setSelectedFile]=useState<SkillFile|null>(null),[fileText,setFileText]=useState(''),[fileError,setFileError]=useState(''),[expanded,setExpanded]=useState<Set<string>>(new Set()),[switching,setSwitching]=useState(false);
  useEffect(()=>{let alive=true;const requested=new URLSearchParams(location.search).get('version');const url=`/api/skills/${encodeURIComponent(slug)}${requested?`?version=${encodeURIComponent(requested)}`:''}`;fetch(url).then(async response=>{const data=await response.json() as {error?:string;skill:PublishedSkill;version:string;markdown:string};if(!response.ok)throw new Error(data.error||'加载失败');if(alive){setSkill(data.skill);setVersion(data.version);setMarkdown(data.markdown)}}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[slug]);
  useEffect(()=>{if(!selectedFile||!version)return;let alive=true;setFileText('');setFileError('');fetch(`/api/skills/${encodeURIComponent(slug)}/file?version=${encodeURIComponent(version)}&path=${encodeURIComponent(selectedFile.path)}`).then(async response=>{const text=await response.text();if(!response.ok)throw new Error(text);if(alive)setFileText(text)}).catch(e=>{if(alive)setFileError(e.message)});return()=>{alive=false}},[slug,version,selectedFile]);
  const record=skill?.versions.find(item=>item.version===version)||skill?.versions[0];
  const files=useMemo(()=>record?.files?.length?record.files:[{path:'SKILL.md',size:new TextEncoder().encode(markdown).length,previewable:true}], [record,markdown]);
  const tree=useMemo(()=>fileTree(files),[files]);
  const missingReferences=useMemo(()=>{const available=new Set(files.map(file=>file.path));return [...new Set([...markdown.matchAll(/\]\(([^)]+)\)/g)].map(match=>match[1].split(/[?#]/)[0]).filter(path=>path&&!/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(path)&&!available.has(path)))];},[files,markdown]);
  const tokenEstimate=useMemo(()=>estimateTokens(markdown),[markdown]);
  const download=`/api/skills/${slug}/download?version=${encodeURIComponent(version)}`;
  const packageName=record?.zipKey?`${slug}-${version}.zip`:'SKILL.md';
  const prompt=skill?`我已附上「${skill.title}」v${version} 的 ${packageName}。请先阅读 SKILL.md，检查引用文件是否齐全以及脚本需要的权限。若当前环境支持 Skill 安装，请按该环境的规范安装完整文件夹，保留原有目录结构；安装时不要运行脚本。完成后告诉我安装位置、缺失文件或依赖，以及如何调用。`:'';
  const markdownComponents={a:({href,children}:{href?:string;children?:ReactNode})=>{
    const path=href?.split(/[?#]/)[0]||'';
    if(path&&!/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(path)){
      const file=files.find(item=>item.path===path);
      return file?<button type="button" className="skill-markdown-link" onClick={()=>{setSelectedFile(file);setTab('files')}}>{children}</button>:<span className="skill-markdown-missing" title="此版本未附带该文件">{children}</span>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  }};
  async function copy(){try{await navigator.clipboard.writeText(prompt);setCopied(true);setTimeout(()=>setCopied(false),2200)}catch{}}
  async function changeVersion(next:string){if(next===version)return;setSwitching(true);try{const response=await fetch(`/api/skills/${encodeURIComponent(slug)}?version=${encodeURIComponent(next)}`);const data=await response.json() as {error?:string;markdown:string};if(!response.ok)throw new Error(data.error||'版本加载失败');setVersion(next);setMarkdown(data.markdown);setSelectedFile(null);setTab('overview');history.replaceState(null,'',`${location.pathname}?version=${encodeURIComponent(next)}`)}catch(e){setError(e instanceof Error?e.message:'版本加载失败')}finally{setSwitching(false)}}
  function toggle(path:string){setExpanded(previous=>{const next=new Set(previous);if(next.has(path))next.delete(path);else next.add(path);return next})}
  return <div className="skill-page"><SiteHeader isSkills/>
    <main className="skill-container page-width"><a className="skill-back" href="/#skills"><ArrowLeft size={16}/> 返回 Skills</a>
    {error?<div className="skill-error"><h1>暂时无法打开这个 Skill</h1><p>{error}</p><a href="/#skills">返回资源库</a></div>:!skill||!record?<div className="skill-loading">正在加载 Skill…</div>:<>
      {skill.source&&<div className="skill-source-info">开源收录 · <a href={skill.source.url} target="_blank" rel="noopener noreferrer">{skill.source.repo} ↗</a> · GitHub ★ {skill.source.stars.toLocaleString()}（仓库星标） · {skill.source.license} · 核验 {skill.source.checkedAt.slice(0,10)}</div>}<section className="skill-intro"><span className="skill-icon">{skillIcon(skill.slug)?<img src={skillIcon(skill.slug)!} alt="" width={70} height={70}/>:<Layers3 size={26}/>}</span><div><h1>{skill.title}</h1><p className="skill-handle">@pws/{skill.slug}</p><div className="skill-trust"><span><ShieldCheck size={15}/> 文件可查看</span><span>v{record.version}</span><span>{files.length} 个文件</span><span>更新于 {new Date(record.publishedAt).toLocaleDateString('zh-CN')}</span></div></div></section>
      <p className="skill-summary">{skill.summary}</p><div className="skill-tags"><span>{skill.category}</span>{skill.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
      <div className="skill-layout"><div className="skill-primary"><div className="skill-tabs" role="tablist" aria-label="Skill 内容">{([['overview','概述'],['files','文件'],['versions','版本历史'],['evaluation','评测报告']] as const).map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>{setTab(id);setSelectedFile(null)}}>{label}</button>)}</div>
        {tab==='overview'&&<article className="skill-markdown skill-overview">{skillExamples[slug]&&<section className="skill-examples" aria-label="案例展示"><h2>案例展示</h2><div className="skill-example-gallery">{skillExamples[slug].map(example=><figure key={example.src}><a href={example.src} target="_blank" rel="noopener noreferrer" aria-label={`查看大图：${example.title}`}><img src={example.src} alt={example.title} width={example.width} height={example.height} loading="lazy" decoding="async"/></a><figcaption><b>{example.title}</b><span>{example.description}</span><a href={example.src} target="_blank" rel="noopener noreferrer">查看大图 ↗</a></figcaption></figure>)}</div></section>}{skillOverviews[slug]&&<p className="overview-language-note">中文概述 · 根据原始文档整理，完整规则与命令请查看「文件」中的 SKILL.md。</p>}<ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{skillOverviews[slug]||highlightOverview(visibleMarkdown(markdown))}</ReactMarkdown></article>}
        {tab==='files'&&<div className="skill-file-browser">{selectedFile?<><div className="skill-browser-heading"><button onClick={()=>setSelectedFile(null)}><ArrowLeft size={15}/> 返回文件树</button><strong>{selectedFile.path}</strong><small>{formatSize(selectedFile.size)}</small>{selectedFile.previewable&&<a href={`/api/skills/${slug}/file?version=${encodeURIComponent(version)}&path=${encodeURIComponent(selectedFile.path)}&download=1`}>下载文件</a>}</div>{!selectedFile.previewable?<div className="skill-file-message">此文件暂不支持在线预览。请下载 ZIP 文件包查看。</div>:fileError?<div className="skill-file-message">{fileError}</div>:!fileText?<div className="skill-file-message">正在加载文件内容…</div>:selectedFile.path.toLowerCase().endsWith('.md')?<article className="skill-markdown skill-file-preview"><ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{selectedFile.path.toLowerCase().endsWith('skill.md')?visibleMarkdown(fileText):fileText}</ReactMarkdown></article>:<pre className="skill-code-preview">{fileText}</pre>}</>:<><div className="skill-browser-heading"><span>共 {files.length} 个文件</span><span>v{record.version}</span></div><div className="skill-tree" role="tree">{tree.map(node=><FileRow key={node.path} node={node} depth={0} expanded={expanded} toggle={toggle} select={setSelectedFile}/>)}</div></>}</div>}
        {tab==='versions'&&<section className="version-history"><h2>版本列表 <span>{skill.versions.length} 个版本</span></h2><div className="version-timeline">{skill.versions.map((item,index)=><article className="version-release" key={item.version}><span className={`release-dot ${index===0?'latest':''}`}/><div className="release-heading"><strong>v{item.version}</strong>{index===0&&<span className="release-badge">最新</span>}<time>{new Date(item.publishedAt).toLocaleDateString('zh-CN')}</time><a aria-label={`下载 v${item.version}`} title="下载此版本" href={`/api/skills/${skill.slug}/download?version=${encodeURIComponent(item.version)}`}><ArrowDownToLine size={17}/></a></div><div className="release-description"><p>{item.files?.length||1} 个文件 · {item.zipKey?'包含 ZIP 文件包':'SKILL.md'}</p><button disabled={switching||item.version===version} onClick={()=>changeVersion(item.version)}>{item.version===version?'正在查看此版本':'查看此版本'}<ChevronRight size={14}/></button></div></article>)}</div></section>}
        {tab==='evaluation'&&<EvaluationReport markdown={markdown} files={files} missing={missingReferences} version={record.version} hasZip={Boolean(record.zipKey)}/>}
      </div><aside className="skill-aside"><div className="skill-aside-card"><div className="skill-agent-marks" aria-hidden="true"><span><FileText size={16}/></span><span><Layers3 size={17}/></span><span><ShieldCheck size={17}/></span></div><h2>将提示词交给你的 AI Agent</h2><p>先下载文件包，发送给 Agent，再复制安装提示词。安装前请检查文件内容与所需权限。</p>{missingReferences.length>0&&<p className="skill-missing-files">此版本有 {missingReferences.length} 个引用文件未附带，部分流程可能无法执行。详情见评测报告。</p>}<button onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'已复制':'复制安装提示词'}</button></div><a className="skill-download" href={download}><ArrowDownToLine size={17}/> 下载 {record.zipKey?'ZIP 文件包':'SKILL.md'}</a><div className="skill-metrics"><div><Gauge size={18}/><strong>约 {tokenEstimate.toLocaleString()} tokens</strong><span>SKILL.md 预估消耗</span></div><div><ArrowDownToLine size={18}/><strong>{skill.downloadCount===undefined?'—':skill.downloadCount.toLocaleString()}</strong><span>次下载</span></div><div><FileText size={18}/><strong>{files.length}</strong><span>个文件</span></div><div><UserRound size={18}/><strong>{skill.author}</strong><span>作者</span></div><p>Token 数按当前版本文本长度粗估；实际消耗取决于模型、加载方式与上下文。</p></div></aside></div>
    </>}</main></div>;
}
