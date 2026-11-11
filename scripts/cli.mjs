#!/usr/bin/env node
import {discover} from './catalog.mjs';
import {routeTask} from './router.mjs';
import {doctor,listPlans,recall} from './state.mjs';
import {exportPassportFile} from './passport.mjs';
import path from 'node:path';
const [action='doctor',target=process.cwd(),...rest]=process.argv.slice(2);
try{
 const ws=path.resolve(target);
 if(action==='doctor')console.log(JSON.stringify(doctor(ws,discover(ws)),null,2));
 else if(action==='catalog')console.log(JSON.stringify(discover(ws),null,2));
 else if(action==='route')console.log(JSON.stringify(routeTask(rest.join(' '),discover(ws)),null,2));
 else if(action==='plans')console.log(JSON.stringify(listPlans(ws),null,2));
 else if(action==='memory')console.log(JSON.stringify(recall(ws),null,2));
 else if(action==='export')console.log(JSON.stringify(exportPassportFile({workspacePath:ws,id:rest[0]}),null,2));
 else {console.error('Usage: node cli.mjs doctor|catalog|route|plans|memory|export [workspace] [task for route]');process.exitCode=2}
}catch(e){console.error(String(e));process.exitCode=1}
