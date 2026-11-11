import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_ITEMS=400;
const EXCLUDE=new Set(['agent-fusion','unified-orchestrator','master-orchestrator']);
export const DOMAINS={
  frontend:/frontend|front.end|react|vue|svelte|next.?js|css|html|component|layout|\bui\b|interface|website|tailwind/i,
  design:/design|\bux\b|figma|typograph|animat|gsap|motion|visual|accessibil|a11y/i,
  backend:/backend|back.end|server|\bapi\b|graphql|auth|database|postgres|\bsql\b|endpoint/i,
  security:/security|vulnerab|audit|permission|privacy|threat|secret|owasp/i,
  testing:/\btest\b|testing|\bqa\b|verif|playwright|vitest|jest|bug|debug|regression/i,
  performance:/performance|optimi|speed|latency|profil|bundle|memory|web.vitals/i,
  research:/research|investigat|compare|explore|analys|document|codebase/i,
  infrastructure:/deploy|devops|docker|kubernetes|infrastructure|ci\/cd|cloud|hosting/i,
  architecture:/architect|refactor|system.design|migration|scalab|structure/i,
  documentation:/documentation|readme|technical.writ|guide|explain/i
};
export function parseFrontmatter(src){
  const m=String(src).match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|\s*$)/);if(!m)return {};
  const out={},lines=m[1].split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const match=lines[i].match(/^([\w-]+)\s*:\s*(.*?)\s*$/);if(!match)continue;
    let v=match[2];if(/^[>|][+-]?$/.test(v)){
      const parts=[];while(i+1<lines.length&&(/^\s+/.test(lines[i+1])||lines[i+1]==='')){const p=lines[++i].trim();if(p)parts.push(p)}v=parts.join(' ');
    }
    if(v.startsWith('[')&&v.endsWith(']'))out[match[1]]=v.slice(1,-1).split(',').map(x=>x.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
    else if(v==='true'||v==='false')out[match[1]]=v==='true';
    else out[match[1]]=v.replace(/^(['"])([\s\S]*)\1$/,'$2');
  }
  return out;
}
function addFolder(base,kind,host,scope,out,{suffix='.md'}={}){
  if(out.length>=MAX_ITEMS)return;
  try{
    if(!fs.statSync(base).isDirectory())return;
    for(const e of fs.readdirSync(base,{withFileTypes:true})){
      if(out.length>=MAX_ITEMS)break;
      if(e.name.startsWith('.')||e.isSymbolicLink())continue;
      const p=path.join(base,e.name);
      if(kind==='skill'&&e.isDirectory()&&fs.existsSync(path.join(p,'SKILL.md')))out.push({path:path.join(p,'SKILL.md'),host,scope});
      if(kind==='agent'&&e.isFile()&&e.name.endsWith(suffix))out.push({path:p,host,scope});
      if(kind==='agent'&&e.isDirectory()&&fs.existsSync(path.join(p,'agent.md')))out.push({path:path.join(p,'agent.md'),host,scope});
    }
  }catch{/* absent or inaccessible */}
}
function pluginFolders(root,kind,scope,out){
  try{for(const e of fs.readdirSync(root,{withFileTypes:true})){
    if(e.name==='agent-fusion'||!e.isDirectory()||e.isSymbolicLink())continue;
    addFolder(path.join(root,e.name,kind==='agent'?'agents':'skills'),kind,'antigravity',`${scope}-plugin`,out);
  }}catch{}
}
function roots(workspacePath,kind){
  const home=os.homedir();const ws=typeof workspacePath==='string'&&path.isAbsolute(workspacePath)?path.resolve(workspacePath):null;
  const out=[];
  const put=(host,scope,root,{suffix}={})=>{if(root)addFolder(root,kind,host,scope,out,{suffix});};
  const add=(host,global,project)=>{put(host,'workspace',ws&&path.join(ws,project));put(host,'global',path.join(home,global));};
  add('antigravity',`.gemini/config/${kind==='agent'?'agents':'skills'}`,`.agents/${kind==='agent'?'agents':'skills'}`);
  if(ws)pluginFolders(path.join(ws,'.agents','plugins'),kind,'workspace',out);
  pluginFolders(path.join(home,'.gemini/config/plugins'),kind,'global',out);
  add('claude',`.claude/${kind==='agent'?'agents':'skills'}`,`.claude/${kind==='agent'?'agents':'skills'}`);
  add('gemini',`.gemini/${kind==='agent'?'agents':'skills'}`,`.gemini/${kind==='agent'?'agents':'skills'}`);
  add('opencode',`.config/opencode/${kind==='agent'?'agents':'skills'}`,`.opencode/${kind==='agent'?'agents':'skills'}`);
  add('cursor',`.cursor/${kind==='agent'?'agents':'skills'}`,`.cursor/${kind==='agent'?'agents':'skills'}`);
  if(kind==='agent')put('copilot','workspace',ws&&path.join(ws,'.github','agents'),{suffix:'.agent.md'});
  if(kind==='skill'){
    put('portable','global',path.join(home,'.agents','skills'));
    put('portable','workspace',ws&&path.join(ws,'.agents','skills'));
    put('copilot','workspace',ws&&path.join(ws,'.github','skills'));
    put('codex','global',path.join(home,'.codex','skills'));
  }
  return out;
}
function meta(file){try{const s=fs.lstatSync(file);if(!s.isFile()||s.size>65536)return {};return parseFrontmatter(fs.readFileSync(file,'utf8'))}catch{return {}}}
const ident=(s)=>/^[a-z0-9][a-z0-9-]{0,63}$/.test(s);
export function discover(workspacePath){
  const agents=[],skills=[],seenA=new Set(),seenS=new Set();
  for(const f of roots(workspacePath,'agent')){
    const m=meta(f.path),fallback=path.basename(f.path)==='agent.md'?path.basename(path.dirname(f.path)):path.basename(f.path).replace(/\.agent\.md$|\.md$/,'');
    const name=String(m.name||fallback).trim().toLowerCase();
    const key=`${f.host}:${name}`;if(!ident(name)||EXCLUDE.has(name)||seenA.has(key))continue;seenA.add(key);
    agents.push({id:key,host:f.host,name,description:String(m.description||'').replace(/[\r\n\t\x00-\x1f]/g,' ').slice(0,700),
      eligible:m.subagent!==false&&m.mode!=='primary',model:String(m.model||'inherit').slice(0,80),scope:f.scope,
      execution:f.host==='antigravity'?'native-only':'requires-host-or-worker-adapter',source:f.path});
  }
  for(const f of roots(workspacePath,'skill')){
    const m=meta(f.path);const name=String(m.name||path.basename(path.dirname(f.path))).trim().toLowerCase();const key=`${f.host}:${name}`;
    if(!ident(name)||seenS.has(key))continue;seenS.add(key);
    skills.push({id:key,name,host:f.host,scope:f.scope,description:String(m.description||'').slice(0,400)});
  }
  return {agents,skills,hosts:[...new Set([...agents.map(a=>a.host),...skills.map(s=>s.host)])].sort()};
}
