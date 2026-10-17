const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('./app.js');
const seed = JSON.parse(fs.readFileSync(__dirname + '/seed.json', 'utf8'));
const state = (tab, extra = {}) => ({tab, repo:'all', status:'all', priority:'all', batch:'all', ci:'all', origin:'all', sort:'priority', q:'', starred:false, ...extra});
const response = value => ({ok:true, status:200, json:async()=>value});
const item = (n, extra={}) => ({number:n, repository_url:'https://api.github.com/repos/example/project', html_url:`https://github.com/example/project/issues/${n}`, title:`Issue ${n}`, state:'open', user:{login:'other'}, labels:[], updated_at:'2026-10-17T00:00:00Z', ...extra});

test('snapshot counts use separate PR, candidate and Issue units', () => {
  assert.deepEqual([seed.prs.length,seed.candidates.length,seed.issues.length],[151,29,61]);
  assert.deepEqual(['open','merged','closed'].map(s=>seed.prs.filter(r=>r.state===s).length),[50,35,66]);
  assert.deepEqual(['open','closed'].map(s=>seed.issues.filter(r=>r.state===s).length),[52,9]);
  assert.equal(seed.issues.filter(r=>r.mine).length,6);
  assert.equal(seed.candidates.filter(r=>r.batch==='new').length,3);
  for(const list of [seed.prs,seed.candidates,seed.issues])assert.equal(new Set(list.map(r=>r.id)).size,list.length);
  assert.ok(!seed.issues.some(r=>r.repo==='vllm-project/vllm-ascend'&&r.number===18376));
});
test('candidate source priorities survive filtering and sorting', () => {
  const rows=M.filterRows(seed,state('pending'));
  assert.equal(rows[0].priority,'P0');
  for(let i=1;i<rows.length;i++)assert.ok(M.priorities[rows[i-1].priority]<=M.priorities[rows[i].priority]);
  const p0=M.filterRows(seed,state('pending',{repo:'vllm-project/vllm-ascend',priority:'P0'}));
  assert.deepEqual(p0.map(r=>r.number).sort((a,b)=>a-b),[17532,17932,18129,18518,18754]);
  assert.equal(M.filterRows(seed,state('pending',{batch:'new'})).length,3);
  assert.ok(M.filterRows(seed,state('pending',{remote:'yes'})).every(r=>r.relatedPRs.length||r.ownPRs.length));
  assert.ok(M.filterRows(seed,state('pending',{remote:'no'})).every(r=>!r.relatedPRs.length&&!r.ownPRs.length));
  assert.equal(M.filterRows(seed,state('pending',{own:'yes'})).length+M.filterRows(seed,state('pending',{own:'no'})).length,29);
});
test('repository, lifecycle, CI, origin, search and stars intersect without mutating records', () => {
  const original=JSON.stringify(seed), row=seed.prs.find(r=>r.state==='open');
  assert.equal(M.filterRows(seed,state('prs',{repo:row.repo,status:row.state,q:String(row.number),starred:true}),{[row.id]:{star:true}}).length,1);
  assert.ok(M.filterRows(seed,state('prs',{ci:'failure'})).every(r=>r.ci==='failure'));
  assert.equal(M.filterRows(seed,state('issues',{origin:'mine'})).length,6);
  assert.equal(M.filterRows(seed,state('issues',{q:'nonexistent-unique-term'})).length,0);
  assert.equal(JSON.stringify(seed),original);
});
test('Issue input and API metadata reject PRs, foreign origins and malformed identifiers', () => {
  assert.deepEqual(M.parseIssueURL('https://github.com/example/project/issues/12'),{repo:'example/project',number:12});
  for(const url of ['https://github.com/example/project/pull/12','https://evil.test/example/project/issues/12','javascript:alert(1)','https://github.com/example/project/issues/0'])assert.throws(()=>M.parseIssueURL(url));
  assert.equal(M.safeLink('javascript:alert(1)'),null);
  assert.equal(M.safeLink('https://evil.test'),null);
  assert.throws(()=>M.normalizeIssue(item(1,{pull_request:{}})),/invalidIssue/);
  for(const x of [item(-1),item(1,{state:'merged'}),item(1,{html_url:'https://github.com/other/repo/issues/1'})])assert.throws(()=>M.normalizeIssue(x));
  assert.equal(M.normalizeIssue(item(1,{user:{login:'Liuchenbing-2026'}}),{},seed.account).mine,true);
});
test('stale cache cannot reopen a newer closed Issue and tracking flags survive', () => {
  const fresh={id:'x',state:'closed',checkedAt:'2026-10-17T01:00:00Z',mine:false};
  const stale={id:'x',state:'open',checkedAt:'2026-10-16T01:00:00Z',tracked:true};
  assert.deepEqual(M.mergeById([fresh],[stale]),[{...stale,...fresh,mine:false,tracked:true}]);
});
test('CSV quotes multiline cells and neutralizes formulas, without exporting private notes', () => {
  assert.equal(M.csvCell('  =1+1'),'"\'  =1+1"');
  assert.equal(M.csvCell('line\n"quote"'),'"line\n""quote"""');
  const csv=M.makeCSV([{repo:'x',id:'x',title:'hello',url:'https://github.com',note:'PRIVATE'}],'en');
  assert.ok(csv.startsWith('\ufeff'));assert.ok(!csv.includes('PRIVATE'));
});
test('API transport only sends GET without browser credentials and rejects other origins', async () => {
  let called=false;
  await M.request('/repos/example/project',async(url,options)=>{called=true;assert.equal(new URL(url).origin,'https://api.github.com');assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.ok(!options.headers.Authorization);return response({});});
  assert.ok(called);
  await assert.rejects(M.request('https://evil.test/',()=>assert.fail()),/origin/);
  await assert.rejects(M.request('/x',async()=>({ok:false,status:403})),/rateLimit/);
});
test('search reads every page and rejects incomplete or duplicate results', async () => {
  const items=Array.from({length:101},(_,i)=>item(i+1));let calls=0;
  const rows=await M.readSearch('is:issue',async(url)=>{calls++;const page=Number(new URL(url).searchParams.get('page'));return response({total_count:101,incomplete_results:false,items:items.slice((page-1)*100,page*100)});});
  assert.equal(rows.length,101);assert.equal(calls,2);
  await assert.rejects(M.readSearch('x',async()=>response({total_count:1,incomplete_results:true,items:[item(1)]})),/Incomplete/);
  await assert.rejects(M.readSearch('x',async()=>response({total_count:2,items:[item(1),item(1)]})),/pagination/);
});
test('PR refresh distinguishes merged from closed and preserves dated CI snapshots', async () => {
  const prs=[1,2,3].map(n=>item(n,{html_url:`https://github.com/example/project/pull/${n}`,state:n===1?'open':'closed',pull_request:{merged_at:n===3?'2026-10-17T00:00:00Z':null}}));
  const old=[{url:prs[0].html_url,ci:'failure',ciAsOf:'old-snapshot',review:'review_required'}];
  const rows=await M.refreshPRs(old,seed.account,async()=>response({total_count:3,items:prs}));
  assert.deepEqual(rows.map(r=>r.state),['open','closed','merged']);
  assert.equal(rows[0].ciAsOf,'old-snapshot');assert.equal(rows[1].ci,'unknown');
  const before=JSON.stringify(old);
  await assert.rejects(M.refreshPRs(old,seed.account,async()=>({ok:false,status:503})),/503/);
  assert.equal(JSON.stringify(old),before);
});
test('partial Issue refresh preserves failures and does not rewrite candidate acceptance', async () => {
  const a=M.normalizeIssue(item(1),{tracked:true},seed.account),b=M.normalizeIssue(item(2),{tracked:true},seed.account);
  const original=JSON.stringify(seed.candidates);
  const result=await M.refreshIssuePage([a,b],[a,b],seed.account,async(url)=>url.endsWith('/1')?response(item(1,{state:'closed'})):{ok:false,status:500},false);
  assert.equal(result.updated,1);assert.equal(result.errors.length,1);
  assert.equal(result.records.find(r=>r.number===1).state,'closed');
  assert.equal(result.records.find(r=>r.number===2).state,'open');
  assert.equal(JSON.stringify(seed.candidates),original);
});
test('HTML uses local assets, native dialogs, accessible table headers and safe text insertion', () => {
  const html=fs.readFileSync(__dirname+'/index.html','utf8'),js=fs.readFileSync(__dirname+'/app.js','utf8');
  for(const name of ['app.js','style.css'])assert.ok(html.includes('./'+name));
  assert.ok(html.includes('aria-labelledby="detail-title"'));
  assert.ok(js.includes("scope:'col'"));assert.ok(!js.includes('innerHTML'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
  assert.ok(!html.includes('cdn.'));
});

// This exercises controller events with a small DOM harness, not browser layout.
test('controller boots, changes modules/language, filters, pages and saves local notes/stars', async () => {
  const vm=require('node:vm'), html=fs.readFileSync(__dirname+'/index.html','utf8');
  class Element {
    constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.value='';this.dataset={};this.open=false;}
    set textContent(v){this.children=[];this.text=String(v??'');}
    get textContent(){return (this.text||'')+this.children.map(x=>typeof x==='string'?x:x.textContent).join('');}
    append(...c){this.children.push(...c);}
    replaceChildren(...c){this.text='';this.children=[...c];}
    setAttribute(k,v){this.attrs[k]=v;}
    addEventListener(k,v){(this.listeners[k]||=[]).push(v);}
    async fire(k){for(const f of this.listeners[k]||[])await f({target:this,preventDefault(){}});}
    showModal(){this.open=true;}
    close(){this.open=false;}
    querySelector(){return submit;}
    remove(){}
    click(){return this.fire('click');}
  }
  const ids=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element()]));
  const special=Object.fromEntries(['.skip','.filters','.table-wrap'].map(x=>[x,new Element()]));
  const localized=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>{const e=new Element();e.dataset.i18n=m[1];return e;});
  const submit=new Element('button'),storage=new Map();
  const document={getElementById:id=>{assert.ok(ids[id],id+' must exist');return ids[id];},createElement:t=>new Element(t),createTextNode:t=>String(t),querySelector:s=>special[s],querySelectorAll:()=>localized,documentElement:{},body:new Element('body')};
  const location={href:'https://liuchenbing-2026.github.io/omnivoice-pr-reports/code-maintenance/?tab=pending&lang=zh'};
  const context={document,location,history:{replaceState(_a,_b,u){location.href=String(u);}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},URL,URLSearchParams,Intl,Blob,setTimeout,clearTimeout,AbortController,fetch:async()=>response(structuredClone(seed))};
  vm.runInNewContext(fs.readFileSync(__dirname+'/app.js','utf8'),context);
  await new Promise(setImmediate);
  assert.equal(ids.rows.children.length,20);assert.match(ids.count.textContent,/29/);
  ids.batch.value='new';await ids.batch.fire('change');assert.equal(ids.rows.children.length,3);
  await ids.reset.fire('click');await ids.next.fire('click');assert.equal(ids.rows.children.length,9);
  const candidate=ids.rows.children[0];await candidate.children[5].children[0].children[0].fire('click');
  assert.equal(ids.detail.open,true);ids.note.value='local-only draft';
  await ids['lang-en'].fire('click');assert.equal(document.documentElement.lang,'en');assert.equal(ids.note.value,'local-only draft');
  await ids['save-note'].fire('click');assert.match(ids['note-message'].textContent,/saved/);
  await ids['detail-star'].fire('click');await ids['close-detail'].fire('click');
  ids.starred.checked=true;await ids.starred.fire('change');assert.equal(ids.rows.children.length,1);
  assert.ok([...storage.values()].some(x=>x.includes('local-only draft')));
  await ids.modules.children[0].fire('click');assert.match(ids.count.textContent,/151/);assert.equal(ids.rows.children.length,20);
  await ids.modules.children[2].fire('click');assert.match(ids.count.textContent,/61/);
  ids.origin.value='mine';await ids.origin.fire('change');assert.equal(ids.rows.children.length,6);
  ids.search.value='unmatchable-term';await ids.search.fire('input');assert.equal(ids.empty.hidden,false);assert.equal(ids.rows.children.length,0);
  assert.equal(new URL(location.href).searchParams.get('q'),'unmatchable-term');
});
