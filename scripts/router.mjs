import { DOMAINS } from './catalog.mjs';
import { reputation } from './feedback.mjs';

const STOPS = new Set('the a an and or to from that with for by of on in my our your you i me we this it is are into build create make fix work use need add code project files app system improve please automatically can should them how what'.split(' '));
const tokens = (v) => new Set(String(v).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2&&!STOPS.has(w)));
export function domainSignals(text) {return Object.entries(DOMAINS).filter(([_,re])=>re.test(text)).map(([k])=>k);}
export function isTrivial(prompt) {
  return prompt.length<150 && /^(what|why|how|can|is|does|explain|define|tell me|thanks|hello)\b/i.test(prompt)
    && !/\b(implement|create|build|edit|change|refactor|audit|test|analyze|debug|write|install|integrate)\b/i.test(prompt);
}
export function rank(task,agents,options={}) {
  const keys=tokens(task), domains=domainSignals(task);
  return agents.filter(a=>a.eligible).map(a=>{
    const title=tokens(a.name.replaceAll('-',' ')), desc=tokens(a.description);
    let score=0;const matched=[];
    for(const t of keys) {if(title.has(t))score+=3;else if(desc.has(t))score+=0.7;}
    for(const d of domains) if(DOMAINS[d].test(`${a.name} ${a.description}`)) {score+=4;matched.push(d);}
    if(options.currentHost===a.host)score+=1.25;
    // Only measured verification feedback can alter routing, with strong cold-start shrinkage.
    let learned=null;
    if(options.workspacePath){
      const candidates=(matched.length?matched:domains).map(d=>reputation(options.workspacePath,a.id||`${a.host}:${a.name}`,d));
      if(candidates.length){learned=candidates.sort((a,b)=>b.samples-a.samples||b.adjustment-a.adjustment)[0];score+=learned.adjustment;}
    }
    return {id:a.id||a.name,host:a.host||"antigravity",name:a.name,score:Number(score.toFixed(2)),matchedDomains:matched,description:a.description.slice(0,180),model:a.model,execution:a.execution,learned};
  }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}
const stageTitle={research:'Inspect requirements and existing project state',architecture:'Define integration boundaries and interfaces',design:'Design UI and visual interaction',frontend:'Implement frontend changes',backend:'Implement backend changes',infrastructure:'Configure environment and deployment',performance:'Optimize measurable bottlenecks',security:'Review security and privacy',testing:'Run relevant tests and regression checks',documentation:'Document verified changes'};
export function routeTask(task,catalog,options={}) {
  const prompt=String(task||'').trim().slice(0,12000);
  if(!prompt)throw new Error('task is required');
  const max=Math.max(1,Math.min(5,Number(options.maxAgents)||3));
  const trivial=isTrivial(prompt), domains=domainSignals(prompt), ranked=rank(prompt,catalog.agents,options);
  // A host cannot natively invoke another host's markdown agent definition.
  // Foreign agents remain visible as discovery candidates; execution needs a real adapter.
  const native=options.currentHost?ranked.filter(x=>x.host===options.currentHost):ranked;
  const picks=trivial?[]:native.filter(x=>x.score>=3).slice(0,max);
  const stages=[];
  if(!trivial){
    const cross=domains.length>=2 || prompt.length>300;
    if(cross)stages.push({id:'discover',title:stageTitle.research,domain:'research',dependsOn:[],mode:'read-only'});
    const work=domains.filter(x=>!['research','security','testing','documentation','architecture'].includes(x));
    for(const d of (work.length?work:domains.length?domains:['architecture'])){
      stages.push({id:`work-${d}`,title:stageTitle[d],domain:d,dependsOn:cross?['discover']:[],mode:'implementation'});
    }
    const workIds=stages.filter(x=>x.id.startsWith('work-')).map(x=>x.id);
    if(workIds.length) stages.push({id:'integration',title:'Merge changes and resolve shared interfaces',domain:'architecture',dependsOn:workIds,mode:'integration'});
    for(const d of ['security','testing'])if(domains.includes(d)||cross)stages.push({id:`verify-${d}`,title:stageTitle[d],domain:d,dependsOn:workIds.length?['integration']:[],mode:'read-only'});
    if(!stages.length)stages.push({id:'work',title:'Complete the requested task',domain:'architecture',dependsOn:[],mode:'implementation'});
  }
  for(const stage of stages){
    const matched=picks.filter(a=>a.matchedDomains.includes(stage.domain));
    stage.suggestedAgent=matched[0]?.id||null;
    stage.acceptanceCriteria=stage.mode==='read-only'?'Return evidence-backed findings with relevant paths and verification steps':stage.mode==='integration'?'Integrate changes without conflicts, run checks, and resolve errors':'Complete the scoped deliverable without modifying unrelated files';
  }
  const parallelCandidates=stages.filter(s=>s.mode==='implementation'&&s.dependsOn.length===0);
  const parallelSafe=false; // Never assume concurrent writes are safe before file ownership is established.
  return {
    task:prompt,complexity:trivial?'trivial':domains.length>1?'multi-domain':'focused',domainSignals:domains,
    catalog:{agents:catalog.agents.length,eligible:catalog.agents.filter(a=>a.eligible).length,skills:catalog.skills.length},
    selectedAgents:picks,foreignCandidates:options.currentHost?ranked.filter(x=>x.host!==options.currentHost).slice(0,5):[],stages,
    routing:trivial?'main-only':picks.length?'native-delegation-if-supported':'main-with-skills',
    parallelSafe,
    guidance:'This is a proposal, not an execution record. Native subagent calls work only within their supporting host. Cross-host workers require explicit opt-in and installed authenticated CLIs. Do not parallelize writes without isolation; honor approvals and verify results.'
  };
}
