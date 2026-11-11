#!/usr/bin/env node
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const home=os.homedir(),base=path.join(home,'.local','share','agent-fusion'),backup=path.join(home,'.agent-fusion','backups');
const args=process.argv.slice(2);const clients=['antigravity','claude','codex','gemini','cursor','opencode','vscode'];
const requested=args.includes('--all')?clients:args.includes('--client')?[args[args.indexOf('--client')+1]]:['antigravity'];
const dry=args.includes('--dry-run'),uninstall=args.includes('--uninstall');
if(args.includes('--help')||requested.some(x=>!clients.includes(x))){console.log('Usage: node scripts/install.mjs [--all | --client antigravity|claude|codex|gemini|cursor|opencode|vscode] [--dry-run] [--uninstall]');process.exit(args.includes('--help')?0:2)}
const node=process.execPath;let warnings=[];const stamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
function log(s){console.log(`${dry?'[DRY RUN] ':''}${s}`)}
function snapshot(target){if(!fs.existsSync(target))return;if(fs.lstatSync(target).isSymbolicLink())throw new Error(`Refusing symlink: ${target}`);if(dry)return;fs.mkdirSync(backup,{recursive:true,mode:0o700});const dest=path.join(backup,`${stamp}-${path.basename(target)}-${Math.random().toString(16).slice(2,8)}`);fs.cpSync(target,dest,{recursive:true});log(`Backup: ${dest}`)}
function writeJson(file,apply){if(uninstall&&!fs.existsSync(file))return;let value={};if(fs.existsSync(file)){if(fs.lstatSync(file).isSymbolicLink())throw new Error(`Refusing symlink: ${file}`);try{value=JSON.parse(fs.readFileSync(file,'utf8'))}catch{warnings.push(`Skipped ${file}: invalid JSON/JSONC; configure manually.`);return}}const next=apply(value);if(next===null)return;log(`Update: ${file}`);if(dry)return;snapshot(file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n',{mode:0o600});}
function copySource(){if(uninstall)return;if(source===base)return;log(`Install core: ${base}`);if(dry)return;snapshot(base);fs.mkdirSync(path.dirname(base),{recursive:true});fs.rmSync(base,{recursive:true,force:true});fs.cpSync(source,base,{recursive:true,filter:(p)=>!p.split(path.sep).some(s=>s==='.git'||s==='node_modules'||s==='dist'||s==='tests')});}
function configEntry(){return {command:node,args:[path.join(base,'scripts','mcp-server.mjs')]}}
function attachJson(file,container,key,entry){writeJson(file,obj=>{if(!obj||Array.isArray(obj)||typeof obj!=='object')throw new Error(`Unsupported config root at ${file}`);obj[container]??={};if(!obj[container]||Array.isArray(obj[container])||typeof obj[container]!=='object')throw new Error(`Invalid ${container} in ${file}`);if(uninstall){if(!obj[container][key])return null;delete obj[container][key]}else obj[container][key]=entry;return obj})}
function appPlugin(){const dest=path.join(home,'.gemini','config','plugins','agent-fusion');log(`${uninstall?'Remove':'Install'} Antigravity global plugin: ${dest}`);if(dry)return;
  if(fs.existsSync(dest))snapshot(dest);
  if(uninstall){if(fs.existsSync(path.join(dest,'plugin.json'))){const old=JSON.parse(fs.readFileSync(path.join(dest,'plugin.json')));if(old.name!=='agent-fusion')throw new Error('Refusing to delete another plugin');fs.rmSync(dest,{recursive:true,force:true})}return}
  const pluginSrc=fs.existsSync(path.join(base,'plugin'))?path.join(base,'plugin'):base;
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(pluginSrc,dest,{recursive:true});if(pluginSrc!==base)fs.cpSync(path.join(base,'scripts'),path.join(dest,'scripts'),{recursive:true});
  const mcp=JSON.parse(fs.readFileSync(path.join(dest,'mcp_config.json')));mcp.mcpServers.orchestrator=configEntry();mcp.mcpServers.orchestrator.args=[path.join(dest,'scripts','mcp-server.mjs')];fs.writeFileSync(path.join(dest,'mcp_config.json'),JSON.stringify(mcp,null,2)+'\n');
  const hooks=JSON.parse(fs.readFileSync(path.join(dest,'hooks.json')));const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
  for(const [v,mode] of [['agent-fusion-session-discovery','session'],['agent-fusion-preinvoke','invocation']]){const h=hooks[v],kind=mode==='session'?'SessionStart':'PreInvocation';h[kind][0].command=`${quote(node)} ${quote(path.join(dest,'scripts','hooks.mjs'))} ${mode}`;}
  fs.writeFileSync(path.join(dest,'hooks.json'),JSON.stringify(hooks,null,2)+'\n');}
function commandClient(client){const executable=client==='claude'?'claude':'codex';const cargs=client==='claude'?['mcp',uninstall?'remove':'add',...(uninstall?[]:['--scope','user']),'agent-fusion',...(uninstall?['--scope','user']:['--',node,path.join(base,'scripts','mcp-server.mjs')])]:['mcp',uninstall?'remove':'add','agent-fusion',...(uninstall?[]:['--',node,path.join(base,'scripts','mcp-server.mjs')])];log(`Run ${executable} ${cargs.map(x=>x.includes(' ')?JSON.stringify(x):x).join(' ')}`);if(dry)return;const r=spawnSync(executable,cargs,{encoding:'utf8',timeout:20000});if(r.error){warnings.push(`${client} CLI unavailable: ${r.error.message}. Configure its MCP client manually.`);return}if(r.status!==0)warnings.push(`${client} CLI setup failed: ${(r.stderr||r.stdout||'unknown error').slice(0,300)}`)}
try{
 copySource();
 for(const c of requested){
  if(c==='antigravity')appPlugin();
  if(c==='cursor')attachJson(path.join(home,'.cursor','mcp.json'),'mcpServers','agent-fusion',configEntry());
  if(c==='gemini')attachJson(path.join(home,'.gemini','settings.json'),'mcpServers','agent-fusion',configEntry());
  if(c==='vscode')attachJson(process.platform==='darwin'?path.join(home,'Library','Application Support','Code','User','mcp.json'):process.platform==='win32'?path.join(process.env.APPDATA||path.join(home,'AppData','Roaming'),'Code','User','mcp.json'):path.join(home,'.config','Code','User','mcp.json'),'servers','agent-fusion',{type:'stdio',...configEntry()});
  if(c==='claude'||c==='codex')commandClient(c);
  if(c==='opencode'){
   const config=path.join(home,'.config','opencode','opencode.json');const jsonc=path.join(home,'.config','opencode','opencode.jsonc');
   if(fs.existsSync(jsonc)){warnings.push(`Skipped OpenCode automatic config: ${jsonc} exists. See docs/INSTALL.md for V1/V2 example to avoid conflicting configs.`);continue}
   writeJson(config,obj=>{obj.mcp??={};const v2=!!obj.mcp.servers||Object.keys(obj.mcp).length===0;const entry={type:'local',command:[node,path.join(base,'scripts','mcp-server.mjs')]};if(v2){obj.mcp.servers??={};if(uninstall)delete obj.mcp.servers['agent-fusion'];else obj.mcp.servers['agent-fusion']=entry}else{if(uninstall)delete obj.mcp['agent-fusion'];else obj.mcp['agent-fusion']=entry}return obj});
  }
 }
 if(uninstall)warnings.push(`Core retained at ${base}; remove manually after verifying no other host uses it.`);
 log(`Completed for ${requested.join(', ')}.`);warnings.forEach(w=>console.warn('WARNING:',w));
}catch(e){console.error('ERROR:',e.message);process.exitCode=1}
