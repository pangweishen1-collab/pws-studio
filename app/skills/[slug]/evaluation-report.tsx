'use client';
import {useEffect,useState} from 'react';
import {Info,ShieldCheck,RefreshCw,Compass,BookOpen,Target} from 'lucide-react';
import type {AutoReport,CheckStatus} from '@/lib/skill-auto-check';
const dimensions=[['T','Trust','可信任度','#50b780'],['R','Reliability','可靠性','#508fed'],['A','Adaptability','适用性','#eea039'],['C','Convention','规范性','#a170dd'],['E','Effectiveness','有效性','#e77b9b']];
const statusLabels:Record<CheckStatus,string>={pass:'检查通过',fail:'发现问题',review:'需复核',manual:'待实测'};
export function EvaluationReport({slug,version}:{slug:string;version:string}){
 const [report,setReport]=useState<AutoReport|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setReport(null);setError('');fetch(`/api/skills/${encodeURIComponent(slug)}/evaluation?version=${encodeURIComponent(version)}`,{signal:controller.signal}).then(async response=>{const data=await response.json() as AutoReport & {error?:string};if(!response.ok)throw new Error(data.error||'检测失败');setReport(data)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[slug,version,attempt]);
 const icons=[ShieldCheck,RefreshCw,Compass,BookOpen,Target];
 return <section className="skill-evaluation trace-report">
 <div className="evaluation-note"><span className="evaluation-note-icon"><Info size={20}/></span><div><h2>五维自动检测报告</h2><p>从可信任度、可靠性、适用性、规范性和有效性整理检查结果。自动校验文件包、文档链接和结构，扫描敏感操作模式，并给出证据位置。</p><small>本报告由规则引擎生成，不是 AI 质量评分。不会执行 Skill 脚本；实际效果与安全性仍需实测。</small></div></div>
 {error?<div role="alert" className="evaluation-summary"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)}>重试检测</button></div>:!report?<p role="status">正在读取并检查当前版本文件，首次检测需要几秒…</p>:<>
 <div className="auto-report-summary"><div><h3>v{report.version} · 自动检测完成</h3><p>扫描 {report.scannedFiles} 个文本文件 · 跳过 {report.skippedFiles} 个文件</p><small>检测时间 {new Date(report.generatedAt).toLocaleString('zh-CN')} · 规则 v{report.engine}</small></div><div className="auto-report-counts">{(['pass','fail','review','manual'] as const).map(status=><div key={status} className={`auto-check-${status}`}><b>{report.checks.filter(c=>c.status===status).length}</b><span>{statusLabels[status]}</span></div>)}</div></div>
 <p className="auto-report-scope">通过数量仅代表自动规则通过项，不换算成质量分。文档线索不证明能力有效；未扫描内容不视为通过。报告对应当前版本，切换版本会读取该版本的检测记录。</p>
 <h3 className="evaluation-title">五维检查详情</h3><div className="trace-details">{dimensions.map(([key,en,name,color],i)=>{const Icon=icons[i];const checks=report.checks.filter(c=>c.dimension===key);return <article className="trace-dimension" key={key}><div className="trace-heading"><span className="trace-icon" style={{color,background:color+'15'}}><Icon size={21}/></span><strong>{key} · {en}</strong><span>{name}</span></div><div className="auto-check-list">{checks.map(check=><div key={check.id} className="auto-check-item"><div><strong>{check.label}</strong><span className={`auto-check-badge auto-check-${check.status}`}>{statusLabels[check.status]}</span></div><ul>{check.evidence.map((e,index)=><li key={index}>{e}</li>)}</ul></div>)}</div></article>})}</div>
 <details className="auto-report-scope"><summary>检测方法与覆盖边界</summary><p>ZIP 限制：最多 200 个文件、单文件 20 MB、解压总量 30 MB。仅扫描支持的文本格式，单文件最多 256 KB、附属文本总量最多 1 MB。Markdown 链接检查排除外链、锚点、模板路径和代码块，不访问外部地址。</p><p>敏感操作规则覆盖远程脚本直接执行、递归强制删除和部分凭证模式。发现位置需人工复核；未命中不构成安全认证。</p><p>报告指纹：<code>{report.fingerprint}</code></p></details>
 </>}
 </section>;
}
