import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {dataDir,projectKey} from './state.mjs';

// Fixed argument vectors only. Never interpolate user-supplied shell commands.
const ADAPTERS={
  claude:{command:'claude',args:(prompt)=>['-p',prompt]},
  codex:{command:'codex',args:(prompt,mode)=>['exec','--json','--sandbox',mode==='implementation'?'workspace-write':'read-only',prompt]},
  gemini:{command:'gemini',args:(prompt)=>['-p',prompt]},
  opencode:{command:'opencode',args:(prompt)=>['run',prompt]}
};
export const workerAdapters=Object.keys(ADAPTERS);
function quota(workspacePath){
  const max=Math.max(1,Math.min(100,Number(process.env.AGENT_FUSION_MAX_WORKER_CALLS_PER_DAY)||5));
  const dir=path.join(dataDir(),'quotas',projectKey(workspacePath));
  const day=new Date().toISOString().slice(0,10);
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const dest=path.join(dir,day+'.json'),lock=dest+'.lock';let acquired=false;
  for(let i=0;i<40;i++){
    try{fs.mkdirSync(lock);acquired=true;break}catch(e){if(e.code!=='EEXIST')throw e;
      try{if(Date.now()-fs.statSync(lock).mtimeMs>15000)fs.rmdirSync(lock)}catch{}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25);
    }
  }
  if(!acquired)throw new Error('Worker quota ledger is busy; retry');
  try{
    let count=0;try{count=JSON.parse(fs.readFileSync(dest,'utf8')).attempts||0}catch{}
    if(count>=max)throw new Error(`Daily worker attempt budget exhausted (${max}). No provider calls were made.`);
    const tmp=dest+'.'+crypto.randomBytes(4).toString('hex')+'.tmp';fs.writeFileSync(tmp,JSON.stringify({date:day,attempts:count+1})+'\n',{mode:0o600,flag:'wx'});fs.renameSync(tmp,dest);
    return {day,attempts:count+1,limit:max};
  }finally{fs.rmdirSync(lock)}
}
function isolatedWorktree(workspacePath){
  const cmd=(args)=>spawnSync('git',args,{cwd:workspacePath,encoding:'utf8',timeout:15000});
  const status=cmd(['status','--porcelain']);if(status.status!==0)throw new Error('Implementation mode requires a Git workspace with commits');
  if(status.stdout.trim())throw new Error('Workspace has uncommitted changes; commit or stash before isolated worker execution');
  const branch='fusion/'+crypto.randomBytes(6).toString('hex');
  const folder=path.join(dataDir(),'worktrees',branch.split('/')[1]);
  fs.mkdirSync(path.dirname(folder),{recursive:true,mode:0o700});
  const result=cmd(['worktree','add','-b',branch,folder,'HEAD']);
  if(result.status!==0)throw new Error(`Could not create isolated worktree: ${result.stderr.trim().slice(0,350)}`);
  return {branch,path:folder,warning:'Review changes and manually merge the worktree branch; Agent Fusion never merges it automatically.'};
}
export async function runWorker({provider,task,workspacePath,timeoutMs=90000,mode='advisory'}={}){
  if(process.env.AGENT_FUSION_ENABLE_EXEC!=='1')throw new Error('Worker execution is disabled. Set AGENT_FUSION_ENABLE_EXEC=1 only after reviewing execution risks.');
  const adapter=ADAPTERS[provider];if(!adapter)throw new Error(`Unknown provider. Supported: ${workerAdapters.join(', ')}`);
  if(typeof workspacePath!=='string'||!path.isAbsolute(workspacePath)||!fs.statSync(workspacePath,{throwIfNoEntry:false})?.isDirectory())throw new Error('Existing absolute workspacePath required');
  if(typeof task!=='string'||!task.trim()||task.length>12000)throw new Error('task must be 1..12000 characters');
  if(!['advisory','implementation'].includes(mode))throw new Error('mode must be advisory or implementation');
  if(mode==='implementation'&&process.env.AGENT_FUSION_ALLOW_WRITES!=='1')throw new Error('Implementation workers disabled; AGENT_FUSION_ALLOW_WRITES=1 required.');
  const timeout=Math.max(1000,Math.min(180000,Number(timeoutMs)||90000));
  // Isolate implementation workers from the user's active worktree. This is Git isolation, NOT OS sandboxing.
  let worktree=null,cwd=workspacePath;
  if(mode==='implementation'){worktree=isolatedWorktree(workspacePath);cwd=worktree.path}
  const usage=quota(workspacePath);
  const directive=mode==='advisory'?'Provide analysis only. Do not edit files, run destructive commands, or change repository state.':'Implement only the scoped change in this isolated Git worktree. Do not alter the main workspace or merge branches. Respect provider approval policies.';
  const prompt=`${directive}\n\nTask:\n${task}`;
  const parseUsage=(text)=>{
    if(provider!=='codex')return {inputTokens:null,outputTokens:null,cachedInputTokens:null,source:'not exposed'};
    let latest=null;for(const line of text.split('\n')){try{const x=JSON.parse(line);if(x.type==='turn.completed'&&x.usage)latest=x.usage}catch{}}
    const n=x=>Number.isFinite(Number(x))?Number(x):null;
    return latest?{inputTokens:n(latest.input_tokens),outputTokens:n(latest.output_tokens),cachedInputTokens:n(latest.cached_input_tokens),source:'codex JSONL turn.completed'}:{inputTokens:null,outputTokens:null,cachedInputTokens:null,source:'Codex usage event unavailable'};
  };
  return await new Promise((resolve,reject)=>{
    const child=spawn(adapter.command,adapter.args(prompt,mode),{cwd,shell:false,stdio:['ignore','pipe','pipe'],env:process.env});
    let stdout='',stderr='',size=0,timedOut=false,tooLarge=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),1500).unref()},timeout);timer.unref();
    const append=(part,isError)=>{const data=String(part);size+=Buffer.byteLength(data);if(size>128000){tooLarge=true;child.kill('SIGTERM');return}if(isError)stderr=(stderr+data).slice(-16000);else stdout=(stdout+data).slice(-48000)};
    child.stdout.on('data',b=>append(b,false));child.stderr.on('data',b=>append(b,true));
    child.on('error',e=>{clearTimeout(timer);reject(new Error(`Could not start ${provider}: ${e.message}${worktree?' (isolated worktree retained for inspection)':''}`))});
    child.on('close',(code,signal)=>{clearTimeout(timer);resolve({provider,mode,exitCode:code,signal,timedOut,tooLarge,stdout,stderr,success:code===0&&!timedOut&&!tooLarge,
      quota:usage,worktree,usage:parseUsage(stdout),warning:'Native CLI permissions apply. Advisory mode is not an OS sandbox. Isolated Git worktrees do not isolate network access or system files. Provider usage may incur costs.'})});
  });
}
