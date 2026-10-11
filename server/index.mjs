import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { BankSession, DomainError, digest } from './engine.mjs';
import { transcribe } from './provider.mjs';
import { runLab } from './lab.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(existsSync(resolve(root,'.env')))for(const line of readFileSync(resolve(root,'.env'),'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&process.env[m[1]]===undefined)process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const dataDir=resolve(root,process.env.DATA_DIR||'data');mkdirSync(dataDir,{recursive:true});
const sessions=new Map(),queues=new Map();
const fileFor=id=>resolve(dataDir,`${id}.json`);
function persist(session){const path=fileFor(session.state.id);writeFileSync(path+'.tmp',JSON.stringify(session.state,null,2));renameSync(path+'.tmp',path);}
function sessionFor(req,res){
  const id=req.headers.cookie?.match(/(?:^|;\s*)aegis_session=([0-9a-f-]{36})(?:;|$)/)?.[1];
  if(id&&sessions.has(id))return sessions.get(id);
  if(id&&existsSync(fileFor(id))){const s=new BankSession(JSON.parse(readFileSync(fileFor(id),'utf8')));if(!s.auditIntegrity())throw new DomainError('Session audit failed integrity checks. Reset the demo.','AUDIT_INTEGRITY',409);sessions.set(id,s);return s;}
  const session=new BankSession();sessions.set(session.state.id,session);res.setHeader('Set-Cookie',`aegis_session=${session.state.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);return session;
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req,limit=32768){const buffers=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new DomainError('Request is too large.','TOO_LARGE',413);buffers.push(chunk);}return Buffer.concat(buffers);}
const assets={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css','/dbs-theme.css':'dbs-theme.css','/dbs-logo.svg':'dbs-logo.svg','/favicon.svg':'favicon.svg'};
export function createServer(){return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Permissions-Policy','camera=(), microphone=(self), geolocation=()');
  try{
    const host=req.headers.host||'';
    if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))throw new DomainError('Use the localhost preview address.','INVALID_HOST',403);
    const path=new URL(req.url,`http://${host}`).pathname;
    if(req.method==='GET'&&path==='/api/health')return json(res,200,{ok:true,name:'Aegis DCTA'});
    if(req.method==='GET'&&assets[path]){const ext=extname(assets[path]);res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[ext],'Cache-Control':'no-cache'});return res.end(readFileSync(resolve(root,'public',assets[path])));}
    if(!path.startsWith('/api/'))return json(res,404,{error:'Not found'});
    if(req.method==='POST'){
      if(req.headers.origin!==`http://${host}`)throw new DomainError('Same-origin browser requests are required.','ORIGIN',403);
      if(path!=='/api/transcribe'&&!req.headers['content-type']?.startsWith('application/json'))throw new DomainError('JSON is required.','CONTENT_TYPE',415);
    }
    if(path==='/api/reset'&&req.method==='POST'){
      // Creates a new sandbox; previous audit files remain intact.
      const s=new BankSession();sessions.set(s.state.id,s);persist(s);res.setHeader('Set-Cookie',`aegis_session=${s.state.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);return json(res,200,s.snapshot());
    }
    const s=sessionFor(req,res);
    if(req.method==='GET'&&path==='/api/state')return json(res,200,s.snapshot());
    if(req.method==='GET'&&path==='/api/audit')return json(res,200,{sessionId:s.state.id,integrity:s.auditIntegrity(),head:s.state.audit.at(-1)?.hash,entries:s.state.audit});
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
    const bytes=await body(req,path==='/api/transcribe'?8*1024*1024:32768);
    let b={};if(path!=='/api/transcribe'){try{b=JSON.parse(bytes.toString()||'{}');}catch{throw new DomainError('Invalid JSON.');}if(!b||Array.isArray(b)||typeof b!=='object')throw new DomainError('JSON object required.');}
    const previous=queues.get(s.state.id)||Promise.resolve();
    const task=previous.catch(()=>{}).then(async()=>{
      try{
        if(path==='/api/key'){s.registerKey(b.publicKey);return {ok:true};}
        if(path==='/api/plan')return await s.createPlan(b.text,b.source);
        if(path==='/api/clarify')return await s.clarify(b.planId,b.index,b.payeeId);
        if(path==='/api/challenge')return s.challenge(b.planId);
        if(path==='/api/execute')return s.execute(b.planId,b.payload,b.signature);
        if(path==='/api/cancel')return s.cancel(b.planId);
        if(path==='/api/step-up')return s.stepUp(b.planId,b.code);
        if(path==='/api/kyc'){s.setKyc(b.value);return {ok:true};}
        if(path==='/api/lab'){const result=runLab();s.log('lab.completed',{results:result});return result;}
        if(path==='/api/transcribe'){
          const mime=req.headers['content-type']?.split(';')[0];if(!['audio/webm','audio/mp4','audio/ogg'].includes(mime))throw new DomainError('Unsupported recording format.');
          const text=await transcribe(bytes,mime);
          const audioId=randomUUID();writeFileSync(resolve(dataDir,`${audioId}.audio`),bytes);
          s.log('audio.transcribed',{audioId,audioHash:digest(bytes),mime,bytes:bytes.length,text});return {text};
        }
        throw new DomainError('Unknown endpoint.','NOT_FOUND',404);
      }finally{persist(s);}
    });queues.set(s.state.id,task);try{const result=await task;json(res,200,result);}finally{if(queues.get(s.state.id)===task)queues.delete(s.state.id);}
  }catch(error){if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'Service unavailable. Please retry; no transaction was approved.',code:error.code||'SERVER_ERROR'});else res.end();if(!error.status)console.error(error.message);}
});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);const server=createServer();
  server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Aegis DCTA ready at http://localhost:${port} — synthetic funds only`));
}
