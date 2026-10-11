import test from 'node:test';
import assert from 'node:assert/strict';
import { extract, validateIndependent, transcribe } from '../server/provider.mjs';
import { BankSession } from '../server/engine.mjs';
import { initialBills } from '../server/catalog.mjs';
const originalFetch=globalThis.fetch;
test.afterEach(()=>{globalThis.fetch=originalFetch;delete process.env.OPENAI_API_KEY;delete process.env.AI_MODE;delete process.env.OPENAI_BASE_URL;});
const response=output=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}),{status:200});
test('live mode uses strict structured responses and does not expose an execution tool',async()=>{
  process.env.AI_MODE='live';process.env.OPENAI_API_KEY='test-key-not-a-secret';let request;
  globalThis.fetch=async(url,options)=>{request={url:String(url),body:JSON.parse(options.body)};return response({actions:[],question:'Clarify',unsupported:true});};
  await extract('send money','savings',initialBills());assert.match(request.url,/\/responses$/);assert.equal(request.body.store,false);assert.equal(request.body.text.format.strict,true);assert.equal(request.body.tools,undefined);assert.match(request.body.instructions,/READ-ONLY/);
});
test('independent live auditor receives raw input and rejects altered amounts',async()=>{
  process.env.AI_MODE='live';process.env.OPENAI_API_KEY='test-key';let input;
  globalThis.fetch=async(url,options)=>{input=JSON.parse(JSON.parse(options.body).input);return response({valid:false,findings:['Amount is 500, but the user requested 50.']});};
  const findings=await validateIndependent('Send 50 to Mom',[{amount:50000}],{});assert.equal(input.transcript,'Send 50 to Mom');assert.equal(findings.length,1);
});
test('model outage fails closed without silently switching to demo',async()=>{
  process.env.AI_MODE='live';process.env.OPENAI_API_KEY='test-key';globalThis.fetch=async()=>new Response('{}',{status:429});
  const bank=new BankSession();const plan=await bank.createPlan('Send 50 SGD to Mom');assert.equal(plan.status,'blocked');assert.match(plan.findings[0],/429/);assert.equal(bank.state.receipts.length,0);
});
test('missing key fails closed in live mode',async()=>{
  process.env.AI_MODE='live';globalThis.fetch=()=>{throw new Error('Should not call network');};
  const plan=await new BankSession().createPlan('Send 50 SGD to Mom');assert.equal(plan.status,'blocked');assert.match(plan.findings[0],/OPENAI_API_KEY/);
});
test('malformed model amounts fail validation',async()=>{
  process.env.AI_MODE='live';process.env.OPENAI_API_KEY='test-key';globalThis.fetch=async()=>response({actions:[{type:'transfer',recipient:'Mom',amount:50.001,source:'savings',evidence:'Send 50 to Mom'}],question:null,unsupported:false});
  const plan=await new BankSession().createPlan('Send 50 to Mom');assert.equal(plan.status,'blocked');assert.match(plan.findings[0],/invalid transaction/);
});
test('live pipeline calls independent validator and freezes its discrepancy',async()=>{
  process.env.AI_MODE='live';process.env.OPENAI_API_KEY='test-key';let calls=0;
  globalThis.fetch=async()=>++calls===1?response({actions:[{type:'transfer',recipient:'Mom',amount:50000,source:'savings',evidence:'Send 50 to Mom'}],question:null,unsupported:false}):response({valid:false,findings:['Amount mismatch']});
  const plan=await new BankSession().createPlan('Send 50 to Mom');assert.equal(calls,2);assert.equal(plan.status,'blocked');assert.deepEqual(plan.findings,['Amount mismatch']);
});
test('audio adapter sends recording to transcription endpoint, preserves returned text',async()=>{
  process.env.OPENAI_API_KEY='test-key';let request;
  globalThis.fetch=async(url,options)=>{request={url:String(url),form:options.body};return new Response(JSON.stringify({text:'给妈妈转五百新币'}));};
  assert.equal(await transcribe(Buffer.from('fake-audio'),'audio/webm'),'给妈妈转五百新币');assert.match(request.url,/audio\/transcriptions$/);assert.equal(request.form.get('file').type,'audio/webm');assert.equal(request.form.get('model'),'gpt-transcribe');
});
