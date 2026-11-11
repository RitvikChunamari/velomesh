import fs from 'node:fs';
import path from 'node:path';
import {dataDir,projectKey} from './state.mjs';
import {receipt} from './verification.mjs';
const folder = ws=>path.join(dataDir(),'feedback',projectKey(ws));
export function recordVerifiedOutcome({workspacePath,receiptId}={}){
  const r=receipt(receiptId);
  if(!r)throw new Error('Verification receipt not found');
  if(r.workspace!==projectKey(workspacePath))throw new Error('Receipt is for a different project');
  if(!r.qualifying)throw new Error('This check cannot establish task quality. Use a gated real test run.');
  if(!r.agentId||!r.domain)throw new Error('Receipt needs agentId and task domain to inform routing');
  const dir=folder(workspacePath);fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const target=path.join(dir,r.id+'.json');
  const o={receiptId:r.id,agentId:r.agentId,domain:r.domain,success:r.passed,verifiedAt:r.at,check:r.check};
  try{fs.writeFileSync(target,JSON.stringify(o)+'\n',{flag:'wx',mode:0o600})}catch(e){if(e.code==='EEXIST')throw new Error('Receipt already used for routing feedback');throw e}
  return {recorded:true,...o,caveat:'Local test evidence is not a causal attribution or a complete quality evaluation.'};
}
export function observations(workspacePath){
  let names=[];try{names=fs.readdirSync(folder(workspacePath)).filter(x=>/^rcpt_[a-f0-9]{24}\.json$/.test(x)).slice(-500)}catch{return []}
  return names.flatMap(x=>{try{return [JSON.parse(fs.readFileSync(path.join(folder(workspacePath),x),'utf8'))]}catch{return []}});
}
export function reputation(workspacePath,agentId,domain){
  const samples=observations(workspacePath).filter(x=>x.agentId===agentId&&x.domain===domain);
  const wins=samples.filter(x=>x.success).length,losses=samples.length-wins;
  const posterior=(wins+1)/(samples.length+2);
  const confidence=Math.min(1,samples.length/8);
  const adjustment=Math.round(100*(posterior-.5)*confidence*3)/100;
  return {samples:samples.length,wins,losses,posterior:Math.round(100*posterior)/100,adjustment,source:'locally recorded test receipts; statistical prior Beta(1,1)'};
}
export function leaderboard(workspacePath){
  const unique=new Map();for(const o of observations(workspacePath)){const key=o.agentId+'::'+o.domain;unique.set(key,[o.agentId,o.domain])}
  return [...unique.values()].map(([id,domain])=>({agentId:id,domain,...reputation(workspacePath,id,domain)})).sort((a,b)=>b.samples-a.samples);
}
