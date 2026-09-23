'use client';
import {useEffect,useMemo,useState} from 'react';
import ReactMarkdown from 'react-markdown';
import {ArrowLeft,ArrowDownToLine,Check,ChevronDown,ChevronRight,Copy,FileText,Folder,Layers3,ShieldCheck} from 'lucide-react';
import type {PublishedSkill,SkillFile} from '@/lib/skill-store';

type Tab='overview'|'files'|'versions';
type FileNode={name:string;path:string;children:FileNode[];file?:SkillFile};
const formatSize=(size:number)=>size<1024?`${size} B`:`${(size/1024).toFixed(size<10240?1:0)} KB`;
const visibleMarkdown=(text:string)=>text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/,'');

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
  const download=`/api/skills/${slug}/download?version=${encodeURIComponent(version)}`;
  const installUrl=typeof window==='undefined'?'':`${location.origin}${download}`;
  const skillMdPath=files.find(file=>/(^|\/)SKILL\.md$/i.test(file.path))?.path||'SKILL.md';
  const contentUrl=typeof window==='undefined'?'':`${location.origin}/api/skills/${slug}/file?path=${encodeURIComponent(skillMdPath)}&version=${encodeURIComponent(version)}`;
  const prompt=skill?`请先查看 ${contentUrl} ，确认内容和权限，再从 ${installUrl} 下载并安装 @pws/${skill.slug}。`:'';
  async function copy(){try{await navigator.clipboard.writeText(prompt);setCopied(true);setTimeout(()=>setCopied(false),2200)}catch{}}
  async function changeVersion(next:string){if(next===version)return;setSwitching(true);try{const response=await fetch(`/api/skills/${encodeURIComponent(slug)}?version=${encodeURIComponent(next)}`);const data=await response.json() as {error?:string;markdown:string};if(!response.ok)throw new Error(data.error||'版本加载失败');setVersion(next);setMarkdown(data.markdown);setSelectedFile(null);setTab('overview');history.replaceState(null,'',`${location.pathname}?version=${encodeURIComponent(next)}`)}catch(e){setError(e instanceof Error?e.message:'版本加载失败')}finally{setSwitching(false)}}
  function toggle(path:string){setExpanded(previous=>{const next=new Set(previous);if(next.has(path))next.delete(path);else next.add(path);return next})}
  return <div className="skill-page"><header className="skill-topbar"><a className="skill-brand" href="/#skills"><span className="skill-brand-symbol">PWS</span><span>庞伟深 <small>Skill Library</small></span></a><nav><a href="/#skills">实用 Skills</a><a href="/#super-tools">超级工具</a><a href="/experience">经验沉淀</a></nav><a className="skill-publish-link" href="/skills/upload">＋ 发布 Skill</a></header>
    <main className="skill-container"><a className="skill-back" href="/#skills"><ArrowLeft size={16}/> 返回 Skills</a>
    {error?<div className="skill-error"><h1>暂时无法打开这个 Skill</h1><p>{error}</p><a href="/#skills">返回资源库</a></div>:!skill||!record?<div className="skill-loading">正在加载 Skill…</div>:<>
      <section className="skill-intro"><span className="skill-icon"><Layers3 size={26}/></span><div><div className="skill-kicker">PWS SKILL COLLECTION</div><h1>{skill.title}</h1><p className="skill-handle">@pws/{skill.slug}</p><div className="skill-trust"><span><ShieldCheck size={15}/> 作者发布</span><span>v{record.version}</span><span>{files.length} 个文件</span><span>更新于 {new Date(record.publishedAt).toLocaleDateString('zh-CN')}</span></div></div></section>
      <p className="skill-summary">{skill.summary}</p><div className="skill-tags"><span>{skill.category}</span>{skill.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
      <div className="skill-layout"><div className="skill-primary"><div className="skill-tabs" role="tablist" aria-label="Skill 内容">{([['overview','概述'],['files','文件'],['versions','版本历史']] as const).map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>{setTab(id);setSelectedFile(null)}}>{label}</button>)}</div>
        {tab==='overview'&&<article className="skill-markdown"><ReactMarkdown>{visibleMarkdown(markdown)}</ReactMarkdown></article>}
        {tab==='files'&&<div className="skill-file-browser">{selectedFile?<><div className="skill-browser-heading"><button onClick={()=>setSelectedFile(null)}><ArrowLeft size={15}/> 返回文件树</button><strong>{selectedFile.path}</strong><small>{formatSize(selectedFile.size)}</small>{selectedFile.previewable&&<a href={`/api/skills/${slug}/file?version=${encodeURIComponent(version)}&path=${encodeURIComponent(selectedFile.path)}&download=1`}>下载文件</a>}</div>{!selectedFile.previewable?<div className="skill-file-message">此文件暂不支持在线预览。请下载 ZIP 文件包查看。</div>:fileError?<div className="skill-file-message">{fileError}</div>:!fileText?<div className="skill-file-message">正在加载文件内容…</div>:selectedFile.path.toLowerCase().endsWith('.md')?<article className="skill-markdown skill-file-preview"><ReactMarkdown>{selectedFile.path.toLowerCase().endsWith('skill.md')?visibleMarkdown(fileText):fileText}</ReactMarkdown></article>:<pre className="skill-code-preview">{fileText}</pre>}</>:<><div className="skill-browser-heading"><span>共 {files.length} 个文件</span><span>v{record.version}</span></div><div className="skill-tree" role="tree">{tree.map(node=><FileRow key={node.path} node={node} depth={0} expanded={expanded} toggle={toggle} select={setSelectedFile}/>)}</div></>}</div>}
        {tab==='versions'&&<div className="skill-version-list">{skill.versions.map(item=><div key={item.version}><span className="skill-version-dot"/><div><strong>v{item.version}</strong>{item.version===version&&<em>正在查看</em>}<small>{new Date(item.publishedAt).toLocaleString('zh-CN')} · {item.files?.length||1} 个文件</small></div><button disabled={switching} onClick={()=>changeVersion(item.version)}>{item.version===version?'当前版本':'查看版本'}</button><a href={`/api/skills/${skill.slug}/download?version=${encodeURIComponent(item.version)}`}>下载</a></div>)}</div>}
      </div><aside className="skill-aside"><div className="skill-aside-card"><span className="skill-aside-label">QUICK INSTALL</span><h2>交给你的 AI Agent</h2><p>复制提示词，先检查 Skill 内容，再下载安装。</p><div className="skill-prompt">{prompt}</div><button onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'已复制':'复制安装提示词'}</button><a className="skill-download" href={download}><ArrowDownToLine size={17}/> 下载 {record.zipKey?'ZIP 文件包':'SKILL.md'}</a></div><div className="skill-author"><span>发布信息</span><strong>{skill.author}</strong><small>当前查看 v{record.version} · {files.length} 个文件</small><small>文件由作者提供，使用前请检查内容与权限。</small></div></aside></div>
    </>}</main></div>;
}
