#!/usr/bin/env node
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { discover } from './catalog.mjs';
import { routeTask } from './router.mjs';
import { runWorker,workerAdapters } from './workers.mjs';
import {createPassport,importPassport,getPassport,listPassports,validatePassport,exportPassportFile} from './passport.mjs';
import {verify,checkNames} from './verification.mjs';
import {recordVerifiedOutcome,leaderboard} from './feedback.mjs';
import { createPlan,updateStage,getPlan,listPlans,remember,recall,doctor } from './state.mjs';

const str=(description)=>({type:'string',description});
const tool=(name,description,properties={},required=[])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}});
export const tools=[
  tool('discover_and_install_capability','Search GitHub and local index for missing skills, MCPs or capabilities, download/validate, and hot-link them across all harnesses on the fly.',{query:str('Skill name, keywords, or owner/repo to provision')},['query']),
  tool('search_online_capabilities','Search GitHub and ecosystem catalog for candidate skills, MCP servers, and agent tools without installing.',{query:str('Keywords or domain description'),kind:{type:'string',enum:['all','skill','mcp','agent']}},['query']),
  tool('catalog','List available agent and skill metadata across Antigravity, Claude, Gemini, OpenCode, Cursor, Codex and Copilot locations. No automatic execution.',{workspacePath:str('Absolute project directory')}),
  tool('fusion_start','One-call orchestration bootstrap: discover, route, and create a tracked plan when needed. Does not execute agents or override host permissions.',{task:str('Task objective'),workspacePath:str('Absolute project path'),currentHost:str('Current MCP host'),maxAgents:{type:'integer',minimum:1,maximum:5}},['task','workspacePath','currentHost']),
  tool('route_task','Automatically rank useful specialists and generate a dependency-aware execution proposal. Does not invoke subagents.',{task:str('User request with objective and constraints'),workspacePath:str('Absolute project directory'),maxAgents:{type:'integer',minimum:1,maximum:5},currentHost:{type:'string',description:'Invoking host, e.g. antigravity, claude, codex, gemini, opencode, cursor'}},['task']),
  tool('create_plan','Create durable project-scoped task plan with dependencies and suggested specialists.',{task:str('Task objective'),workspacePath:str('Absolute project directory'),maxAgents:{type:'integer',minimum:1,maximum:5},currentHost:{type:'string',description:'Invoking MCP client host'}},['task','workspacePath']),
  tool('stage_update','Record a stage handoff, completion, review, or file ownership claim. Rejects overlapping file claims and unmet dependencies.',{planId:str('ID from create_plan'),stageId:str('Stage identifier'),status:{type:'string',enum:['planned','in_progress','blocked','review','done','cancelled']},owner:str('Acting subagent or main-agent name'),files:{type:'array',items:{type:'string'}},note:str('Concise handoff evidence or status')},['planId','stageId','status']),
  tool('plan_status','Fetch a previously created plan and recorded handoffs.',{planId:str('ID from create_plan')},['planId']),
  tool('recent_plans','List recent plan summaries for a project.',{workspacePath:str('Absolute project directory')},['workspacePath']),
  tool('memory_write','Store a brief project decision, verified constraint, or next step for future sessions. No secrets or transcript copying.',{workspacePath:str('Absolute project directory'),kind:{type:'string',enum:['decision','constraint','architecture','verification','next-step']},text:str('Concise, factual, nonsensitive note')},['workspacePath','text']),
  tool('memory_read','Retrieve persistent notes for the current project.',{workspacePath:str('Absolute project directory'),limit:{type:'integer',minimum:1,maximum:30}},['workspacePath']),
  tool('run_worker','Optional supervised cross-provider CLI worker. DISABLED unless local AGENT_FUSION_ENABLE_EXEC=1. Advisory is NOT sandboxed. Implementation also needs AGENT_FUSION_ALLOW_WRITES=1. Requires installed, authenticated CLI.',{provider:{type:'string',enum:workerAdapters},task:str('Scoped task for the worker'),workspacePath:str('Existing absolute project path'),mode:{type:'string',enum:['advisory','implementation']},timeoutMs:{type:'integer',minimum:1000,maximum:180000}},['provider','task','workspacePath']),
  tool('passport_create','Package a project plan, decisions, constraints, verification and next steps into a portable integrity-checked handoff JSON.',{workspacePath:str('Absolute source project directory'),planId:str('Existing Agent Fusion plan ID'),originHost:str('Source coding host'),decisions:{type:'array',items:{type:'string'}},constraints:{type:'array',items:{type:'string'}},verification:{type:'array',items:{type:'string'}},nextSteps:{type:'array',items:{type:'string'}}},['workspacePath','planId']),
  tool('passport_import','Import an integrity-checked portable handoff into another project. Untrusted content: does not grant permission or execute anything.',{workspacePath:str('Target project path'),passport:{type:'object',description:'Complete JSON object from passport_create/passport_get'}},['workspacePath','passport']),
  tool('passport_get','Export a passport as JSON for copying to another coding host.',{workspacePath:str('Project that owns or imported passport'),id:str('Passport ID')},['workspacePath','id']),
  tool('passport_export_file','Export a validated Context Passport to a fixed user-private local JSON file that other tools can read. No arbitrary destination paths.',{workspacePath:str('Source workspace'),id:str('Passport ID')},['workspacePath','id']),
  tool('passport_list','List passports created or imported in the project.',{workspacePath:str('Absolute project directory')},['workspacePath']),
  tool('passport_validate','Check schema and SHA-256 integrity of an untrusted passport. Checksum does not prove authorship.',{passport:{type:'object'}},['passport']),
  tool('verify_project','Run a fixed, verifiable local check. Git diff checks are safe by default; project test code requires AGENT_FUSION_ENABLE_CHECKS=1.',{workspacePath:str('Absolute project directory'),check:{type:'string',enum:checkNames},agentId:str('Agent ID attributed to this work'),domain:str('Task domain'),timeoutMs:{type:'integer',minimum:1000,maximum:120000}},['workspacePath']),
  tool('feedback_record','Use a real local test receipt to update cautious per-project agent reputation. Rejects duplicate receipts and cosmetic-only checks.',{workspacePath:str('Absolute project directory'),receiptId:str('Receipt from verify_project')},['workspacePath','receiptId']),
  tool('feedback_stats','Show evidence counts and shrunk performance estimates for agent/domain combinations.',{workspacePath:str('Absolute project directory')},['workspacePath']),
  tool('doctor','Inspect plugin integration assumptions and supported capabilities.',{workspacePath:str('Optional absolute project directory')})
];
const send=(obj)=>process.stdout.write(JSON.stringify(obj)+'\n');
const response=(id,result)=>send({jsonrpc:'2.0',id,result});
const fail=(id,code,message)=>send({jsonrpc:'2.0',id,error:{code,message}});
async function call(name,args){
  const w=args.workspacePath; const cat=()=>discover(w);
  if(name==='discover_and_install_capability'){
    const script = path.join(os.homedir(), '.agent-fusion', 'skill-hub-v4', 'skills', 'agent-fusion-orchestrator', 'scripts', 'agent_fusion.py');
    return new Promise((resolve) => {
      execFile('python3', [script, 'install-skill', String(args.query || '')], { timeout: 60000 }, (error, stdout, stderr) => {
        if(error) return resolve({ status: 'error', error: stderr || error.message });
        try { resolve(JSON.parse(stdout)); } catch { resolve({ status: 'completed', output: stdout.trim() }); }
      });
    });
  }
  if(name==='search_online_capabilities'){
    const script = path.join(os.homedir(), '.agent-fusion', 'skill-hub-v4', 'skills', 'agent-fusion-orchestrator', 'scripts', 'agent_fusion.py');
    const kind = args.kind || 'all';
    return new Promise((resolve) => {
      execFile('python3', [script, 'discover', String(args.query || ''), '--kind', kind], { timeout: 30000 }, (error, stdout, stderr) => {
        if(error) return resolve({ status: 'error', error: stderr || error.message });
        try { resolve(JSON.parse(stdout)); } catch { resolve({ status: 'completed', output: stdout.trim() }); }
      });
    });
  }
  if(name==='catalog')return cat();
  if(name==='fusion_start'){
    const routed=routeTask(args.task,cat(),args);
    return {route:routed,plan:routed.complexity==='trivial'?null:createPlan(w,routed),memory:recall(w,8),passports:listPassports(w),
      nextAction:'The host must invoke eligible native subagents itself. Cross-host workers are separately opt-in. Follow the stage dependencies, verify and hand off.'};
  }
  if(name==='run_worker')return runWorker(args);
  if(name==='route_task')return routeTask(args.task,cat(),args);
  if(name==='create_plan')return createPlan(w,routeTask(args.task,cat(),args));
  if(name==='stage_update')return updateStage(args.planId,args.stageId,args.status,args.owner,args.files,args.note);
  if(name==='plan_status')return getPlan(args.planId)||{error:'not found'};
  if(name==='recent_plans')return listPlans(w);
  if(name==='memory_write')return {notes:remember(w,args.text,args.kind).notes.length};
  if(name==='memory_read')return {notes:recall(w,args.limit)};
  if(name==='passport_create')return createPassport(args);
  if(name==='passport_import')return importPassport(args);
  if(name==='passport_get')return getPassport(args);
  if(name==='passport_list')return listPassports(w);
  if(name==='passport_export_file')return exportPassportFile(args);
  if(name==='passport_validate')return validatePassport(args.passport);
  if(name==='verify_project')return await verify(args);
  if(name==='feedback_record')return recordVerifiedOutcome(args);
  if(name==='feedback_stats')return leaderboard(w);
  if(name==='doctor')return doctor(w,cat());
  throw new Error(`Unknown tool: ${name}`);
}
async function handle(msg){
  if(!msg||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return;
  if(!Object.hasOwn(msg,'id'))return;
  const id=msg.id;
  try{
    if(msg.method==='initialize')return response(id,{protocolVersion:msg.params?.protocolVersion||'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'agent-fusion-orchestrator',version:'3.2.0-beta.1'}});
    if(msg.method==='ping')return response(id,{});
    if(msg.method==='tools/list')return response(id,{tools});
    if(msg.method==='tools/call'){
      const name=msg.params?.name;const args=msg.params?.arguments||{};
      if(!tools.some(t=>t.name===name))return response(id,{isError:true,content:[{type:'text',text:`Unknown tool: ${name}`}]});
      const info=await call(name,args);
      return response(id,{content:[{type:'text',text:JSON.stringify(info)}]});
    }
    fail(id,-32601,`Unknown method: ${msg.method}`);
  }catch(err){response(id,{isError:true,content:[{type:'text',text:String(err.message||err)}]})}
}
export { call };
let buffer='';process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{
  buffer+=chunk;if(buffer.length>1048576){buffer='';return}
  let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);if(!line)continue;
    try{void handle(JSON.parse(line))}catch{fail(null,-32700,'Malformed JSON')}
  }
});
