#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import {fixture,live} from './continuity.mjs';
const a=process.argv.slice(2),arg=(key,defaultValue)=>{const idx=a.indexOf(key);return idx>=0?a[idx+1]:defaultValue};
const mode=arg('--mode','fixture');
if(a.includes('--help')){
 console.log('Usage: node scripts/handoff-demo.mjs [--mode fixture | --mode live --provider codex|opencode|claude|gemini --repo /abs/path --passport /abs/passport.json --confirm-live] [--out /abs/report-dir] [--check git-diff-check|node-test|npm-test]');process.exit(0)
}
try{
 const out=arg('--out',undefined);const opts={outDir:out?path.resolve(out):undefined};
 const result=mode==='fixture'?await fixture(opts):mode==='live'?await live({...opts,repo:arg('--repo'),passportFile:arg('--passport'),provider:arg('--provider'),check:arg('--check','git-diff-check'),confirmation:a.includes('--confirm-live')}):null;
 if(!result)throw Error('Invalid --mode');
 console.log(JSON.stringify({status:result.status,mode:result.mode,report:result.jsonFile,markdown:result.mdFile,changedFiles:result.changedFiles,verificationReceiptId:result.verificationReceiptId,error:result.error||null},null,2));
 if(result.status!=='passed')process.exitCode=1;
}catch(e){console.error('Failed:',String(e.message||e));process.exitCode=1}
