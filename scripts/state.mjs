import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const dataDir=()=>{const shared=path.join(os.homedir(),'.agent-fusion','data');const legacy=path.join(os.homedir(),'.gemini','config','agent-fusion-data');return path.resolve(process.env.AGENT_FUSION_DATA_DIR||(fs.existsSync(shared)?shared:fs.existsSync(legacy)?legacy:shared))};
const PRIVATE_MODE=0o700;
const mk=(dir)=>{fs.mkdirSync(dir,{recursive:true,mode:PRIVATE_MODE});try{fs.chmodSync(dir,PRIVATE_MODE)}catch{}};
const safe=(x)=>String(x||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,90);
const id=(prefix)=>`${prefix}_${crypto.randomUUID().replaceAll('-','').slice(0,16)}`;
const file=(kind,scope)=>path.join(dataDir(),kind,`${safe(scope)}.json`);
const read=(f,fallback)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return fallback}};
function atomicWrite(f,data){
  mk(path.dirname(f));const temp=`${f}.${process.pid}.${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});
  fs.renameSync(temp,f);try{fs.chmodSync(f,0o600)}catch{}
}
function transact(f,fallback,fn){
  const lock=f+'.lock';mk(path.dirname(f));
  let acquired=false;
  for(let i=0;i<30;i++){
    try{fs.mkdirSync(lock);acquired=true;break}catch(e){
      if(e.code!=='EEXIST')throw e;
      try{if(Date.now()-fs.statSync(lock).mtimeMs>15000)fs.rmdirSync(lock)}catch{}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25);
    }
  }
  if(!acquired)throw new Error('Local coordination state is busy; retry');
  try{const current=read(f,fallback);const next=fn(current);atomicWrite(f,next);return next}
  finally{try{fs.rmdirSync(lock)}catch{}}
}
export function projectKey(workspacePath){
  if(typeof workspacePath!=='string'||!path.isAbsolute(workspacePath))throw new Error('absolute workspacePath is required');
  return crypto.createHash('sha256').update(path.resolve(workspacePath)).digest('hex').slice(0,24);
}
const states=['planned','in_progress','blocked','review','done','cancelled'];
export function createPlan(workspacePath,route){
  const project=projectKey(workspacePath);const planId=id('plan');const now=new Date().toISOString();
  const plan={id:planId,project,workspacePath:path.resolve(workspacePath),createdAt:now,updatedAt:now,
    objective:route.task.slice(0,5000),state:'planned',stages:route.stages.map(s=>({...s,status:'planned',owner:null,files:[],notes:[]})),events:[]};
  transact(file('plans',planId),null,()=>plan);
  // Indexed by project for retrieval, not secrets or transcripts.
  transact(file('index',project),{plans:[]},v=>({plans:[planId,...v.plans].slice(0,25)}));
  return plan;
}
export function getPlan(planId){if(!/^plan_[a-f0-9]{16}$/.test(String(planId)))throw new Error('invalid planId');return read(file('plans',planId),null)};
export function listPlans(workspacePath){const k=projectKey(workspacePath);const index=read(file('index',k),{plans:[]});return index.plans.map(id=>getPlan(id)).filter(Boolean).map(p=>({id:p.id,state:p.state,objective:p.objective.slice(0,160),updatedAt:p.updatedAt,stages:p.stages.map(s=>({id:s.id,status:s.status,owner:s.owner}))}));}
function safeFileNames(files){
  if(!Array.isArray(files))return [];
  return files.slice(0,60).map(x=>String(x).replaceAll('\\','/')).filter(x=>x&&!x.startsWith('/')&&!x.split('/').includes('..')&&!x.includes('\x00')).map(x=>path.posix.normalize(x));
}
export function updateStage(planId,stageId,status,owner='',files=[],note=''){
  if(!states.includes(status))throw new Error('invalid status');
  const filename=file('plans',planId);if(!getPlan(planId))throw new Error('unknown plan');
  const result=transact(filename,null,p=>{
    if(!p)throw new Error('unknown plan');
    const s=p.stages.find(x=>x.id===stageId);if(!s)throw new Error('unknown stage');
    const claimed=safeFileNames(files);
    if(status==='in_progress'){
      const blockers=s.dependsOn.filter(dep=>p.stages.find(x=>x.id===dep)?.status!=='done');
      if(blockers.length)throw new Error(`stage blocked by unfinished dependencies: ${blockers.join(', ')}`);
      for(const other of p.stages) {
        if(other.id===s.id||other.status!=='in_progress')continue;
        const overlap=claimed.filter(x=>other.files.includes(x));
        if(overlap.length)throw new Error(`file ownership conflict with ${other.id}: ${overlap.join(', ')}`);
      }
    }
    s.status=status;s.owner=String(owner).slice(0,80);if(claimed.length)s.files=claimed;
    if(note){s.notes.push({at:new Date().toISOString(),text:String(note).slice(0,1200)});s.notes=s.notes.slice(-8)}
    const done=p.stages.every(x=>x.status==='done'||x.status==='cancelled');
    p.state=done?'done':p.stages.some(x=>x.status==='in_progress')?'in_progress':'planned';
    p.updatedAt=new Date().toISOString();p.events.push({time:p.updatedAt,stage:stageId,status,owner:s.owner});p.events=p.events.slice(-100);
    return p;
  });
  return {id:result.id,state:result.state,stage:result.stages.find(x=>x.id===stageId)};
}
function redact(s){return String(s).replace(/(sk-[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{10,})/g,'[REDACTED]');}
export function remember(workspacePath,text,kind='decision'){
  const allowed=['decision','constraint','architecture','verification','next-step'];if(!allowed.includes(kind))throw new Error('invalid note type');
  const body=redact(String(text||'').trim()).slice(0,1500);if(!body)throw new Error('empty note');
  if(/(password\s*[:=]|private.key|authorization\s*:\s*bearer)/i.test(body))throw new Error('looks like secret material: cannot store');
  const k=projectKey(workspacePath);return transact(file('memory',k),{notes:[]},m=>{
    m.notes.push({id:id('note'),kind,text:body,at:new Date().toISOString()});m.notes=m.notes.slice(-60);return m;
  });
}
export function recall(workspacePath,limit=12){return read(file('memory',projectKey(workspacePath)),{notes:[]}).notes.slice(-Math.max(1,Math.min(30,limit)));}
export function doctor(workspacePath,catalog){
  const p=workspacePath&&path.isAbsolute(workspacePath)?workspacePath:null;
  const warnings=[];
  if(!p)warnings.push('Pass an absolute workspace path to discover project-local agents.');
  if(catalog.agents.filter(x=>x.eligible).length===0)warnings.push('No eligible custom subagents found; the main agent will work directly.');
  if(process.env.PLUGIN_DATA&&!process.env.AGENT_FUSION_DATA_DIR)warnings.push('Ignoring host-specific PLUGIN_DATA: shared cross-host data lives under ~/.agent-fusion/data (or legacy folder).');
  return {version:'3.2.0-beta.1',platform:process.platform,node:process.version,storage:dataDir(),agents:catalog.agents.length,eligible:catalog.agents.filter(x=>x.eligible).length,skills:catalog.skills.length,warnings,execution:'MCP can propose plans. Optional cross-host CLI workers require explicit local opt-in; native host controls its own subagents.'};
}
