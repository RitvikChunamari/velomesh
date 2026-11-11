#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

const CLIS={codex:'Codex CLI',opencode:'OpenCode CLI',claude:'Claude Code CLI',gemini:'Gemini CLI'};
function locate(name,envPath=process.env.PATH||''){
 const suffixes=process.platform==='win32'?['.exe','.cmd','.bat','']:[''];
 for(const part of envPath.split(path.delimiter))for(const suffix of suffixes){const full=path.join(part||'.',name+suffix);try{fs.accessSync(full,fs.constants.X_OK);return full}catch{}}
 return null;
}
function probe(command){const found=locate(command);if(!found)return {available:false,path:null,version:null};
 const p=spawnSync(found,['--version'],{encoding:'utf8',timeout:5000,stdio:['ignore','pipe','pipe']});
 return {available:true,path:found,version:p.status===0?String(p.stdout||p.stderr||'').trim().slice(0,120):null,versionProbe:p.status===0?'passed':'unavailable'};
}
export function preflight({home=os.homedir(),repo=null}={}){
 const cli=Object.fromEntries(Object.entries(CLIS).map(([key])=>[key,probe(key)]));
 const plugin=path.join(home,'.gemini','config','plugins','agent-fusion');
 const hasPlugin=fs.existsSync(path.join(plugin,'plugin.json'));
 const project=repo?path.resolve(repo):null;
 const git=project&&fs.existsSync(project)?spawnSync('git',['rev-parse','--is-inside-work-tree'],{cwd:project,encoding:'utf8',timeout:5000}):null;
 const installed={antigravityPlugin:hasPlugin,antigravityMcpConfig:fs.existsSync(path.join(plugin,'mcp_config.json')),sharedCore:fs.existsSync(path.join(home,'.local','share','agent-fusion','scripts','mcp-server.mjs'))};
 const report={schema:'agent-fusion/preflight/v1',platform:process.platform,node:process.version,git:probe('git'),cli,installed,repo:project?{gitRepository:git?.status===0&&git.stdout.trim()==='true',exists:fs.existsSync(project)}:null,permissions:{workerExecutionEnabled:process.env.AGENT_FUSION_ENABLE_EXEC==='1',worktreeWritesEnabled:process.env.AGENT_FUSION_ALLOW_WRITES==='1',projectTestsEnabled:process.env.AGENT_FUSION_ENABLE_CHECKS==='1'},warnings:['CLI presence and --version do not verify authentication or model permissions.','An installed plugin file does not prove Antigravity loaded its MCP tools.','Git worktree isolation does not restrict the agent from accessing network or other filesystem paths.']};
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const args=process.argv.slice(2),idx=args.indexOf('--repo'),repo=idx===-1?null:args[idx+1];
 console.log(JSON.stringify(preflight({repo}),null,2));
}
