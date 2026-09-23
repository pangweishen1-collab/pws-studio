type Check={label:string;passed:boolean;evidence:string};
export function evaluateSkill(markdown:string,files:{path:string}[],missing:string[],hasZip:boolean){
 const match=(label:string,pattern:RegExp):Check=>{
  const line=markdown.split('\n').find(line=>pattern.test(line));
  return {label,passed:!!line,evidence:line?line.trim().slice(0,260):'当前 SKILL.md 未识别到对应说明，需要人工复核；不等于实际不具备该能力。'};
 };
 const fact=(label:string,passed:boolean,evidence:string):Check=>({label,passed,evidence});
 const dimensions=[
 {key:'T',en:'Trust',name:'可信任度',color:'#50b780',checks:[
 match('说明限制或操作边界',/授权|权限|禁止|不可|只读|不得|\b(permission|must not|do not|never|only|scope)\b/i),
 match('说明保护、原创或安全要求',/保护|隐私|原创|安全|保留|\b(protect|privacy|original|copyright|safety|preserve)\b/i),
 fact('包含作者来源或文档元信息',/^---\s*\n[\s\S]*?\n---/.test(markdown),/^---/.test(markdown)?'SKILL.md 包含前置元信息；这不是作者身份认证。':'未找到前置元信息。')
 ]},
 {key:'R',en:'Reliability',name:'可靠性',color:'#508fed',checks:[
 fact('提供 ZIP 文件包',hasZip,hasZip?'当前版本具有 ZIP 下载文件；不代表依赖已安装。':'当前版本没有 ZIP 文件包。'),
 fact('已识别的相对链接文件齐全',missing.length===0,missing.length?missing.join('、'):'已识别的 Markdown 相对链接未发现缺失；不覆盖动态路径、外部工具与脚本运行依赖。'),
 match('说明验证或检查步骤',/验证|校验|核对|检查|\b(verify|verification|validate|validation|check|test|review)\b/i)
 ]},
 {key:'A',en:'Adaptability',name:'适用性',color:'#eea039',checks:[
 match('说明工具或运行环境',/工具|环境|依赖|\b(tool|tools|environment|dependencies|MCP|Python|p5|CSS|font|fonts)\b/i),
 match('说明输入或需求',/输入|用户|上传|参考|\b(input|user|reference|requirements|brief|theme)\b/i),
 match('说明使用场景或范围',/范围|适用|场景|\b(when to|use when|use this|scope|purpose|overview)\b/i)
 ]},
 {key:'C',en:'Convention',name:'规范性',color:'#a170dd',checks:[
 fact('包含 SKILL.md',files.some(f=>f.path==='SKILL.md'),'根据当前版本文件清单检查入口文件。'),
 fact('具有分级标题',/^##\s+.+/m.test(markdown),'检查 Markdown 二级标题。'),
 fact('具有列表或结构化步骤',/^\s*(?:[-*]|\d+\.)\s+/m.test(markdown),'检查 Markdown 列表或编号步骤。')
 ]},
 {key:'E',en:'Effectiveness',name:'有效性',color:'#e77b9b',checks:[
 match('说明预期成果',/输出|交付|生成|导出|\b(output|deliver|deliverable|create|generate|apply)\b/i),
 match('说明执行方法',/流程|步骤|制作|处理|\b(workflow|step|process|instructions|implement|how to)\b/i),
 match('说明结果要求或验收约束',/要求|检查|校验|清晰|一致|\b(quality|consistent|consistency|readability|verify|must|ensure|check)\b/i)
 ]}
 ];
 return dimensions;
}
