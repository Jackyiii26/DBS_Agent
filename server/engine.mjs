import { createHash, randomUUID, randomInt, createPublicKey, verify } from 'node:crypto';
import { initialAccounts, initialBills, payees, policy, money } from './catalog.mjs';
import { resolvePayee, auditEvidence, suspicious } from './parser.mjs';
import { extract, validateIndependent, providerConfig } from './provider.mjs';

export const digest = value => createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export class DomainError extends Error { constructor(message,code='REJECTED',status=400){super(message);this.code=code;this.status=status;} }
const reject=(message,code,status)=>{throw new DomainError(message,code,status);};
export class BankSession {
  constructor(saved){
    this.state=saved||{id:randomUUID(),createdAt:Date.now(),accounts:initialAccounts(),bills:initialBills(),kyc:'verified',plans:[],receipts:[],audit:[],publicKey:null};
    if(!saved)this.log('session.created',{message:'Isolated synthetic banking session. No real funds.'});
  }
  log(event,details={}){
    const entry={seq:this.state.audit.length+1,time:new Date().toISOString(),event,details,previousHash:this.state.audit.at(-1)?.hash||'0'.repeat(64)};
    entry.hash=digest(entry);this.state.audit.push(entry);return entry;
  }
  auditIntegrity(){let prev='0'.repeat(64);return this.state.audit.every((e,i)=>{const {hash,...body}=e;const ok=body.seq===i+1&&body.previousHash===prev&&digest(body)===hash;prev=hash;return ok;});}
  snapshot(){
    return {sessionId:this.state.id,accounts:this.state.accounts,bills:this.state.bills,payees,kyc:this.state.kyc,receipts:this.state.receipts,plans:this.state.plans.map(p=>this.publicPlan(p)),audit:this.state.audit,auditIntegrity:this.auditIntegrity(),policy,provider:providerConfig(),keyRegistered:!!this.state.publicKey};
  }
  publicPlan(p){const {challenge,stepCode,raw,...safe}=p;return safe;}
  getPlan(id){return this.state.plans.find(p=>p.id===id)||reject('Transaction plan was not found.','NOT_FOUND',404);}
  registerKey(jwk){
    if(this.state.publicKey){if(digest(this.state.publicKey)===digest(jwk))return;reject('This session already has a signing key. Reset the demo if the browser key was lost.','KEY_EXISTS');}
    if(jwk?.kty!=='EC'||jwk.crv!=='P-256'||jwk.d)reject('A public P-256 key is required.','INVALID_KEY');
    try{createPublicKey({key:jwk,format:'jwk'});}catch{reject('Invalid public key.','INVALID_KEY');}
    this.state.publicKey=jwk;this.log('identity.demo_key_registered',{algorithm:'ECDSA P-256',biometrics:'simulated',message:'Not a real KYC identity binding.'});
  }
  async createPlan(text,source='savings'){
    if(typeof text!=='string'||!text.trim()||text.length>2000)reject('Enter a request between 1 and 2,000 characters.');
    if(!this.state.accounts.some(a=>a.id===source))reject('Unknown source account.');
    for(const p of this.state.plans)if(['ready','clarify','step_up'].includes(p.status)){p.status='superseded';p.challenge=null;this.log('plan.superseded',{planId:p.id});}
    const plan={id:randomUUID(),version:1,text:text.trim(),source,createdAt:new Date().toISOString(),status:'parsing',actions:[],questions:[],decisions:{},checks:[],findings:[],mode:providerConfig().mode,stepVerified:false};
    this.state.plans.push(plan);this.log('input.received',{planId:plan.id,text:plan.text,source,currency:'SGD'});
    try{
      if(suspicious(text)){
        plan.status='blocked';plan.findings=['Instruction override detected. Transaction authorization cannot be bypassed.'];this.log('input.blocked',{planId:plan.id,findings:plan.findings});return this.publicPlan(plan);
      }
      const result=await extract(plan.text,source,this.state.bills);
      plan.raw=result;
      if(result.unsupported||result.question||!Array.isArray(result.actions)||!result.actions.length||result.actions.length>policy.maxActions){plan.status='needs_input';plan.findings=[result.question||'The request cannot be safely compiled. Please rephrase.'];this.log('parser.needs_input',{planId:plan.id,findings:plan.findings});return this.publicPlan(plan);}
      this.log('draft.compiled',{planId:plan.id,mode:plan.mode,actions:result.actions});
      await this.resolve(plan);
    }catch(error){plan.status='blocked';plan.findings=[error.message];this.log('pipeline.failed',{planId:plan.id,message:error.message});}
    return this.publicPlan(plan);
  }
  async resolve(plan){
    plan.actions=[];plan.questions=[];plan.findings=[];plan.checks=[];
    for(const [i,raw] of plan.raw.actions.entries()){
      if(!['transfer','bill'].includes(raw.type)||!Number.isSafeInteger(raw.amount)||raw.amount<=0||!['savings','joint'].includes(raw.source)||typeof raw.recipient!=='string'||typeof raw.evidence!=='string'){
        plan.findings.push(`Action ${i+1}: invalid transaction fields.`);continue;
      }
      if(raw.type==='transfer'){
        const candidates=resolvePayee(raw.recipient);
        const chosen=candidates.find(p=>p.id===plan.decisions[i])||(candidates.length===1?candidates[0]:null);
        if(!candidates.length){plan.findings.push(`No saved beneficiary matches “${raw.recipient}”. Adding beneficiaries is outside this demo.`);continue;}
        if(!chosen){plan.questions.push({index:i,prompt:`Which ${raw.recipient} did you mean?`,choices:candidates});continue;}
        plan.actions.push({...raw,recipient:chosen.id,originalRecipient:raw.recipient,name:chosen.name,number:chosen.number,bank:chosen.bank,currency:'SGD'});
      }else{
        const bill=this.state.bills.find(b=>b.id===raw.recipient);
        if(!bill){plan.findings.push('Unknown bill.');continue;}
        plan.actions.push({...raw,name:bill.name,number:bill.number,bank:'Biller',currency:'SGD'});
      }
    }
    if(plan.findings.length){plan.status='blocked';this.log('draft.blocked',{planId:plan.id,findings:plan.findings});return;}
    if(plan.questions.length){plan.status='clarify';this.log('clarification.required',{planId:plan.id,questions:plan.questions.map(q=>q.prompt)});return;}
    const lexical=auditEvidence(plan.text,plan.actions,this.state.bills,plan.source,plan.decisions);
    // Live language coverage is audited by the independent model. Structural, catalog and financial rules always apply.
    const independent=await validateIndependent(plan.text,plan.actions,{selectedSource:plan.source,currency:'SGD',clarifications:plan.decisions,payees,bills:this.state.bills});
    const findings=plan.mode==='demo'?lexical:independent;
    plan.checks.push({name:plan.mode==='demo'?'Independent evidence rules':'Independent validation model',status:findings.length?'fail':'pass',detail:findings.length?findings.join(' '):'Beneficiary, amount, source and scope checked against the request.'});
    this.log('validation.completed',{planId:plan.id,engine:plan.mode==='demo'?'lexical-evidence-rules':providerConfig().validatorModel,findings,lexicalObservations:lexical});
    if(findings.length){plan.findings=findings;plan.status='blocked';return;}
    plan.validatedHash=digest(plan.actions);
    const risks=this.risks(plan);
    plan.checks.push({name:'Identity & transaction policy',status:risks.length?'fail':'pass',detail:risks.length?risks.join(' '):'KYC verified · sufficient balance · limits checked.'});
    plan.total=plan.actions.reduce((sum,a)=>sum+a.amount,0);
    plan.projection=this.state.accounts.map(a=>({...a,after:a.balance-plan.actions.filter(x=>x.source===a.id).reduce((sum,x)=>sum+x.amount,0)}));
    if(risks.length){plan.status='blocked';plan.findings=risks;}
    else {plan.status=plan.total>policy.stepUp?'step_up':'ready';plan.checks.push({name:'User authorization',status:'pending',detail:'No funds move until you review and sign the exact plan.'});}
    this.log('policy.evaluated',{planId:plan.id,status:plan.status,findings:risks,total:plan.total});
  }
  async clarify(id,index,payeeId){
    const p=this.getPlan(id);if(p.status!=='clarify')reject('This plan is no longer awaiting clarification.');
    const q=p.questions.find(q=>q.index===index);if(!q||!q.choices.some(c=>c.id===payeeId))reject('Select one of the offered beneficiaries.');
    p.decisions[index]=payeeId;p.version++;this.log('clarification.answered',{planId:id,index,payeeId});await this.resolve(p);return this.publicPlan(p);
  }
  risks(p){
    const out=[];if(this.state.kyc!=='verified')out.push('KYC is pending. Identity verification must complete before payment.');
    if(!p.actions.length||p.actions.length>policy.maxActions)out.push('Invalid number of transactions.');
    const total=p.actions.reduce((s,a)=>s+a.amount,0);
    if(total>policy.batchLimit)out.push(`Plan exceeds the ${money(policy.batchLimit)} demo limit.`);
    for(const account of this.state.accounts){const debit=p.actions.filter(a=>a.source===account.id).reduce((s,a)=>s+a.amount,0);if(debit>account.balance)out.push(`Insufficient funds in ${account.name}.`);}
    for(const a of p.actions){
      if(a.currency!=='SGD'||!Number.isSafeInteger(a.amount)||a.amount<=0||!this.state.accounts.some(x=>x.id===a.source))out.push('Invalid money or account fields.');
      if(a.type==='transfer'&&!payees.some(x=>x.id===a.recipient))out.push('Unregistered beneficiary.');
      if(a.type==='bill'){const b=this.state.bills.find(b=>b.id===a.recipient);if(!b||b.paid||b.amount!==a.amount)out.push('Bill is already paid or its amount changed.');}
      if(!['transfer','bill'].includes(a.type))out.push('Unsupported transaction type.');
    }
    const billIds=p.actions.filter(a=>a.type==='bill').map(a=>a.recipient);if(new Set(billIds).size!==billIds.length)out.push('The same bill cannot be paid twice in one plan.');
    const day=new Date().toISOString().slice(0,10);
    const daily=this.state.receipts.filter(r=>r.time.startsWith(day)).reduce((s,r)=>s+r.total,0);if(daily+total>policy.dailyLimit)out.push('Daily transaction value limit exceeded.');
    const recent=this.state.receipts.filter(r=>Date.now()-Date.parse(r.time)<policy.velocityWindowMs).reduce((s,r)=>s+r.actions.length,0);if(recent+p.actions.length>policy.velocityCount)out.push('Velocity limit: at most five transactions per minute. Please wait.');
    return [...new Set(out)];
  }
  stepUp(id,code){
    const p=this.getPlan(id);if(p.status!=='step_up')reject('This plan does not need secondary verification.');
    if(!code){p.stepCode={code:String(randomInt(100000,1000000)),expires:Date.now()+120000,attempts:0};this.log('step_up.demo_issued',{planId:id});return {demoCode:p.stepCode.code,message:'Simulated external token. This is not a real out-of-band channel.'};}
    if(!p.stepCode||p.stepCode.expires<Date.now()||p.stepCode.attempts>=3)reject('Token expired or locked. Request a new demo token.');
    p.stepCode.attempts++;if(p.stepCode.code!==code)reject('Incorrect token.');
    p.stepVerified=true;p.status='ready';p.stepCode=null;this.log('step_up.demo_verified',{planId:id});return this.publicPlan(p);
  }
  challenge(id){
    const p=this.getPlan(id);if(p.status!=='ready')reject('Only a validated, ready plan can be authorized.','NOT_READY');
    if(!this.state.publicKey)reject('Register this browser’s demo signing key first.','NO_KEY');
    if(digest(p.actions)!==p.validatedHash)reject('Plan changed after validation.','DRAFT_CHANGED');
    const risk=this.risks(p);if(risk.length)reject(risk.join(' '),'POLICY');
    const payload={domain:'AEGIS_DCTA_DEMO_V1',sessionId:this.state.id,planId:p.id,version:p.version,nonce:randomUUID(),expiresAt:Date.now()+policy.approvalTtlMs,actions:p.actions,total:p.total};
    p.challenge=JSON.stringify(payload);this.log('authorization.challenge_issued',{planId:id,hash:digest(p.challenge),expiresAt:payload.expiresAt});
    return {payload:p.challenge,expiresAt:payload.expiresAt};
  }
  execute(id,payload,signature){
    const p=this.getPlan(id);
    try{
      if(p.status==='executed')reject('This authorization was already used. No duplicate debit.','REPLAY',409);
      if(p.status!=='ready')reject('Plan is not ready for execution.','NOT_READY');
      if(!p.challenge||payload!==p.challenge)reject('Authorization does not match the exact issued transaction.','PAYLOAD_MISMATCH');
      const signed=JSON.parse(payload);
      if(signed.expiresAt<Date.now())reject('Authorization expired. Review and authorize again.','EXPIRED');
      if(signed.sessionId!==this.state.id||signed.planId!==id||signed.version!==p.version||digest(signed.actions)!==digest(p.actions)||digest(p.actions)!==p.validatedHash)reject('Transaction changed after validation.','DRAFT_CHANGED');
      let valid=false;
      try{valid=verify('sha256',Buffer.from(payload),{key:createPublicKey({key:this.state.publicKey,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(signature||'','base64'));}catch{}
      if(!valid)reject('A valid signature from the registered browser key is required.','INVALID_SIGNATURE',403);
      const risk=this.risks(p);if(risk.length)reject(risk.join(' '),'POLICY');
      if(p.total>policy.stepUp&&!p.stepVerified)reject('Secondary verification is required.','STEP_UP');
      // All checks precede any ledger mutation; synchronous commit is atomic in this single-process demo.
      for(const a of p.actions){this.state.accounts.find(x=>x.id===a.source).balance-=a.amount;if(a.type==='bill')this.state.bills.find(x=>x.id===a.recipient).paid=true;}
      p.status='executed';p.challenge=null;
      const authCheck=p.checks?.find(c=>c.name==='User authorization');if(authCheck){authCheck.status='pass';authCheck.detail='Exact plan signed; signature verified; authorization consumed once.';}
      const receipt={id:`AG-${randomUUID().slice(0,8).toUpperCase()}`,planId:id,time:new Date().toISOString(),total:p.total,actions:structuredClone(p.actions),authorizationHash:digest(payload),authorizationPayload:payload,publicKey:this.state.publicKey,signature,balances:this.state.accounts.map(a=>({id:a.id,balance:a.balance}))};
      this.state.receipts.unshift(receipt);this.log('ledger.committed',{receiptId:receipt.id,planId:id,total:p.total,authorizationHash:receipt.authorizationHash,authorizationPayload:payload,publicKey:this.state.publicKey,signature});return receipt;
    }catch(error){this.log('gateway.rejected',{planId:id,code:error.code||'INVALID_REQUEST',reason:error.message});throw error;}
  }
  cancel(id){const p=this.getPlan(id);if(p.status==='executed')reject('An executed payment cannot be cancelled.');p.status='cancelled';p.challenge=null;this.log('plan.cancelled',{planId:id});return this.publicPlan(p);}
  setKyc(value){if(!['verified','pending'].includes(value))reject('Invalid demo KYC state.');this.state.kyc=value;this.log('identity.demo_status_changed',{kyc:value});}
}
