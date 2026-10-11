import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'aegis-tests-'));process.env.AI_MODE='demo';
const {createServer}=await import('../server/index.mjs');
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
test.after(()=>{server.close();rmSync(process.env.DATA_DIR,{recursive:true,force:true});});
test('HTTP boundary: session isolation, origin validation, signed execution and concurrent replay',async()=>{
  const first=await fetch(base+'/api/state');const cookie=first.headers.get('set-cookie').split(';')[0];const before=await first.json();
  const get=async()=>{const r=await fetch(base+'/api/state',{headers:{Cookie:cookie}});return r.json();};
  const post=async(path,b,origin=base)=>fetch(base+'/api/'+path,{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(b)});
  assert.equal((await post('plan',{text:'Send 50 to Mom',source:'savings'},'https://evil.example')).status,403);
  assert.equal((await fetch(base+'/api/plan',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'text/plain'},body:'{}'})).status,415);
  const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  const publicKey=await webcrypto.subtle.exportKey('jwk',pair.publicKey);assert.equal((await post('key',{publicKey})).status,200);
  const p=await (await post('plan',{text:'Send 50 to Mom',source:'savings'})).json();assert.equal(p.status,'ready');
  const c=await (await post('challenge',{planId:p.id})).json();
  const signature=Buffer.from(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(c.payload))).toString('base64');
  const results=await Promise.all([post('execute',{planId:p.id,payload:c.payload,signature}),post('execute',{planId:p.id,payload:c.payload,signature})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const after=await get();assert.equal(after.accounts[0].balance,before.accounts[0].balance-5000);assert.equal(after.receipts.length,1);
  const other=await (await fetch(base+'/api/state')).json();assert.notEqual(other.sessionId,before.sessionId);assert.equal(other.receipts.length,0);
  const leaked=JSON.stringify(after);assert.ok(!leaked.includes('privateKey'));assert.ok(!leaked.includes('OPENAI_API_KEY'));
  assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/../server/index.mjs')).status,404);
});
test('static page has security headers and working assets',async()=>{
  const response=await fetch(base);assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);assert.match(await response.text(),/DBS digibank/);
  for(const path of ['/app.js','/styles.css','/favicon.svg'])assert.equal((await fetch(base+path)).status,200);
});

