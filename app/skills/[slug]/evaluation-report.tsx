import {Info,ShieldCheck,RefreshCw,Compass,BookOpen,Target} from 'lucide-react';
import {evaluateSkill} from '@/lib/skill-evaluation';
import type {SkillFile} from '@/lib/skill-store';

export function EvaluationReport({markdown,files,missing,version,hasZip}:{markdown:string;files:SkillFile[];missing:string[];version:string;hasZip:boolean}){
 const icons=[ShieldCheck,RefreshCw,Compass,BookOpen,Target];
 const dimensions=evaluateSkill(markdown,files,missing,hasZip);
 const requirements=[
 '需要核对来源、审查脚本与权限，并记录实际操作是否遵守授权范围。',
 '需要重复执行正常、异常与边界用例，记录成功率、失败原因及恢复情况。',
 '需要明确支持的环境，并在相应工具、输入类型与场景中验证。',
 '需要人工审阅规则是否一致、引用是否正确、步骤是否可执行；结构存在不等于规范合格。',
 '需要用明确验收标准检查真实输出，记录任务完成情况、耗时与消耗。'
 ];
 const facts=[
 {label:'入口文件',result:files.some(f=>f.path==='SKILL.md')?'已找到':'未找到',detail:'当前版本文件清单中的 SKILL.md。'},
 {label:'文件包',result:hasZip?'已提供':'未提供',detail:`清单包含 ${files.length} 个文件。这里只确认文件包记录，不证明可安装或可运行。`},
 {label:'文档相对链接',result:missing.length?'发现缺失':'未发现缺失',detail:missing.length?`识别到 ${missing.length} 个链接目标未包含在文件清单中。`:'仅核对 SKILL.md 中已识别的 Markdown 相对链接；不覆盖动态路径、代码中的引用或外部依赖。'}
 ];
 return <section className="skill-evaluation trace-report">
  <div className="evaluation-note"><span className="evaluation-note-icon"><Info size={20}/></span><div><h2>检查与评测记录</h2><p>当前仅完成文件清单和文档结构检查。尚未运行测试用例，也没有人工审核记录，因此不提供质量分、综合评级或雷达图。</p><small>此前按关键词命中生成的分数已撤回。文字中出现相关规则，不证明规则正确或执行有效。</small></div></div>
  <div className="evaluation-summary" style={{display:'block',padding:22}}><div className="review-result"><h3>v{version} · 待实测</h3><p>五个质量维度均未评测。下方区分可核实事实、文档线索和完成评测所需的验证。</p></div></div>
  <h3 className="evaluation-title">文件检查结果</h3><div className="trace-details">{facts.map(f=><article className="trace-dimension" key={f.label}><div className="trace-heading"><strong>{f.label}</strong><span>{f.result}</span></div><p>{f.detail}</p></article>)}</div>
  <h3 className="evaluation-title">五维评测状态</h3><div className="trace-details">{dimensions.map((d,i)=>{const Icon=icons[i];return <article className="trace-dimension" key={d.key}>
   <div className="trace-heading"><span className="trace-icon" style={{color:d.color,background:d.color+'15'}}><Icon size={21}/></span><strong>{d.key} · {d.en}</strong><span>{d.name}</span><span className="review-status" style={{marginLeft:'auto'}}>未评测</span></div>
   <p>{requirements[i]}</p>
   <details><summary>查看文档线索（未经人工复核）</summary><ul>{d.checks.map(check=><li key={check.label}><span>{check.passed?'已识别线索':'未识别'}</span><div>{check.label}<p>{check.evidence}</p></div></li>)}</ul><p>自动扫描仅用于定位文档。命中不计分；未识别也不判定为缺陷。实测记录须注明版本、环境、用例、预期结果、实际结果及证据。</p></details>
  </article>})}</div>
  {!!missing.length&&<div className="evaluation-missing"><strong>未找到的链接目标</strong><ul>{missing.map(path=><li key={path}>{path}</li>)}</ul></div>}
 </section>
}
