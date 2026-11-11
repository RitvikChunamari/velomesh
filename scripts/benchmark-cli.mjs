#!/usr/bin/env node
import path from 'node:path';
import {runBenchmark} from './benchmark.mjs';
const args=process.argv.slice(2);
const value=(flag,otherwise)=>{const index=args.indexOf(flag);return index<0?otherwise:args[index+1]};
if(args.includes('--help')){console.log('Usage: node scripts/benchmark-cli.mjs --mode fixture|live [--provider codex|claude|gemini|opencode] [--trials 1..3] [--out DIR] [--confirm-live]\nLive launches TWO paid/quota-consuming CLI tasks per trial in separate disposable Git worktrees; requires three AGENT_FUSION_* opt-in variables.');process.exit(0)}
try{
 const mode=value('--mode','fixture'),provider=value('--provider','codex'),trials=Number(value('--trials','2'));
 const result=await runBenchmark({mode,provider,trials,outDir:value('--out')?path.resolve(value('--out')):undefined,confirmLive:args.includes('--confirm-live')});
 console.log(JSON.stringify({mode:result.mode,trials:result.trials,summary:result.summary,report:result.jsonFile,markdown:result.mdFile},null,2));
 if(result.rows.some(x=>!x.passed))process.exitCode=1;
}catch(e){console.error('Benchmark error:',String(e.message||e));process.exitCode=1;}
