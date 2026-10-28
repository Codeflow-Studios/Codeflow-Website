import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {randomBytes} from 'node:crypto';
import {createErpProxy} from './admin-erp-proxy.mjs';

async function fixture(t,overrides={}) {
  const key=randomBytes(32).toString('hex'),id=randomBytes(32).toString('hex'),received=[];
  const sessions=new Map([[id,{expires:Date.now()+60000}]]);
  const backend=createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{received.push({path:req.url,headers:req.headers,body});res.writeHead(200,{'content-security-policy':"default-src 'self'",'set-cookie':'unsafe=1','x-codeflow-erp-key':'must-not-leak','cache-control':'public'}).end('private ERP fixture');});});
  await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
  const env={ADMIN_ORIGIN:'https://admin.example.test',FLOWERP_UPSTREAM:`http://127.0.0.1:${backend.address().port}`,FLOWERP_GATEWAY_KEY:key,...overrides};
  const proxy=createErpProxy({env,sessions}),front=createServer(proxy.handle);
  await new Promise(resolve=>front.listen(0,'127.0.0.1',resolve));
  t.after(()=>{front.closeAllConnections();front.close();backend.closeAllConnections();backend.close();});
  const call=(path='/admin/erp',options={})=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:front.address().port,path,method:options.method||'GET',headers:{host:'admin.example.test',cookie:`__Host-codeflow_admin=${id}`,...options.headers}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end(options.body);});
  return {call,received,sessions,id,key};
}
test('ERP pages, assets and API require a live admin session',async t=>{
  const f=await fixture(t);
  for(const path of ['/admin/erp','/admin/erp/_next/static/a.js','/admin/erp/api/session'])assert.equal((await f.call(path,{headers:{cookie:''}})).status,403);
  f.sessions.get(f.id).expires=Date.now()-1;assert.equal((await f.call()).status,403);assert.equal(f.received.length,0);
});
test('ERP preserves path and query, replaces spoofed headers, and never forwards login cookies',async t=>{
  const f=await fixture(t),r=await f.call('/admin/erp/projects?new=1',{headers:{'x-codeflow-erp-key':'forged','x-forwarded-host':'evil.test',authorization:'Bearer client','x-workspace-id':'other',cookie:`__Host-codeflow_admin=${f.id}; flow_session=forged`}});
  assert.equal(r.status,200);const received=f.received[0];assert.equal(received.path,'/admin/erp/projects?new=1');assert.equal(received.headers['x-codeflow-erp-key'],f.key);assert.equal(received.headers['x-forwarded-host'],'admin.example.test');
  for(const name of ['cookie','authorization','x-workspace-id'])assert.equal(received.headers[name],undefined);
  assert.equal(r.headers['x-codeflow-erp-key'],undefined);assert.equal(r.headers['set-cookie'],undefined);assert.match(r.headers['cache-control'],/no-store/);assert.equal(r.headers['content-security-policy'],"default-src 'self'");assert.ok(!r.body.includes(f.key));
});
test('ERP mutations require exact origin and retain the request body',async t=>{
  const f=await fixture(t);
  assert.equal((await f.call('/admin/erp/api/resources/projects',{method:'POST'})).status,403);
  assert.equal((await f.call('/admin/erp/api/resources/projects',{method:'POST',headers:{origin:'https://evil.test'}})).status,403);
  assert.equal((await f.call('/admin/erp/api/resources/projects',{method:'POST',headers:{origin:'https://admin.example.test'},body:'{"name":"fixture"}'})).status,200);
  assert.equal(f.received.length,1);assert.equal(f.received[0].body,'{"name":"fixture"}');
});
test('ERP rejects spoofed hosts, cross-site reads and paths outside its prefix',async t=>{
  const f=await fixture(t);
  for(const headers of [{host:'evil.test'},{origin:'https://evil.test'},{'sec-fetch-site':'cross-site'}])assert.equal((await f.call(undefined,{headers})).status,403);
  assert.equal((await f.call('/admin/erp-other')).status,404);assert.equal(f.received.length,0);
});
test('ERP missing config and public upstreams fail closed',async t=>{
  for(const overrides of [{FLOWERP_GATEWAY_KEY:undefined},{FLOWERP_UPSTREAM:'https://example.com'},{FLOWERP_UPSTREAM:'http://example.com'},{FLOWERP_UPSTREAM:undefined}]){
    const f=await fixture(t,overrides);assert.equal((await f.call()).status,503);assert.equal(f.received.length,0);
  }
});
