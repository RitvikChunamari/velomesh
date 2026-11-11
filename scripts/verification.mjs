import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {dataDir,projectKey} from './state.mjs';

const checks={
  'git-diff-check':{command:'git',args:['diff','--check'],safe:true,qualifying:false},
  'git-staged-diff-check':{command:'git',args:['diff','--cached','--check'],safe:true,qualifying:false},
  'node-test':{command:process.execPath,args:['--test'],safe:false,qualifying:true},
  'npm-test':{command:'npm',args:['test'],safe:false,qualifying:true},
};
export const checkNames=Object.keys(checks);
export function receipt(id){
  if(!/^rcpt_[a-f0-9]{24}$/.test(id||''))throw new Error('Invalid receipt ID');
  try{return JSON.parse(fs.readFileSync(path.join(dataDir(),'receipts',id+'.json'),'utf8'))}catch{return null}
}
export async function verify({workspacePath,check='git-diff-check',agentId='',domain='',timeoutMs=60000}={}){
  const spec=checks[check];if(!spec)throw new Error('Unsupported check');
  if(!spec.safe&&process.env.AGENT_FUSION_ENABLE_CHECKS!=='1')throw new Error('Running project test code requires AGENT_FUSION_ENABLE_CHECKS=1');
  if(!path.isAbsolute(workspacePath||'')||!fs.statSync(workspacePath,{throwIfNoEntry:false})?.isDirectory())throw new Error('Existing absolute workspace path required');
  const timeout=Math.min(120000,Math.max(1000,Number(timeoutMs)||60000));
  const started=Date.now();const output=await new Promise((resolve,reject)=>{
    const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='NODE_TEST_CONTEXT'));
    const p=spawn(spec.command,spec.args,{cwd:workspacePath,env:cleanEnv,stdio:['ignore','pipe','pipe'],shell:false});
    let stdout='',stderr='',timedOut=false,truncated=false;
    const t=setTimeout(()=>{timedOut=true;p.kill('SIGTERM');setTimeout(()=>p.kill('SIGKILL'),1000).unref()},timeout);t.unref();
    const add=(k,b)=>{const v=String(b);if((stdout+stderr).length>24000){truncated=true;p.kill('SIGTERM');return}if(k==='out')stdout+=v;else stderr+=v};
    p.stdout.on('data',b=>add('out',b));p.stderr.on('data',b=>add('err',b));
    p.on('error',e=>{clearTimeout(t);reject(e)});
    p.on('close',(code)=>{clearTimeout(t);resolve({exitCode:code,passed:code===0&&!timedOut&&!truncated,stdout:stdout.slice(-6000),stderr:stderr.slice(-6000),timedOut,truncated})});
  });
  const info={id:'rcpt_'+crypto.randomBytes(12).toString('hex'),workspace:projectKey(workspacePath),check,qualifying:spec.qualifying,
    agentId:String(agentId).slice(0,100),domain:String(domain).slice(0,40),at:new Date().toISOString(),durationMs:Date.now()-started,...output};
  const dest=path.join(dataDir(),'receipts');fs.mkdirSync(dest,{recursive:true,mode:0o700});fs.writeFileSync(path.join(dest,info.id+'.json'),JSON.stringify(info,null,2)+'\n',{mode:0o600,flag:'wx'});
  return {...info,warning:'A passing command is evidence for that check only, not proof the whole task is correct.'};
}
