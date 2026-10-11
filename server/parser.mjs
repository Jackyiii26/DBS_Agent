import { payees } from './catalog.mjs';

const wordValues = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
export function parseAmount(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase().replace(/,/g, '');
  if (/^\d+(?:\.\d{1,2})?$/.test(s)) {
    const [whole, fraction = ''] = s.split('.');
    const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  if (/^[零一二两三四五六七八九十百千万]+$/.test(s)) {
    const digits = {零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
    let total=0, section=0, n=0;
    for (const c of s) { if (c in digits) n=digits[c]; else { const unit={十:10,百:100,千:1000,万:10000}[c]; if(unit===10000){total+=(section+n)*unit;section=0;}else section+=(n||1)*unit; n=0; } }
    return (total+section+n)*100 || null;
  }
  const tokens=s.replace(/-/g,' ').split(/\s+/); let sum=0, group=0;
  for(const token of tokens){ if(token in wordValues)group+=wordValues[token];else if(token==='hundred')group=(group||1)*100;else if(token==='thousand'||token==='grand'){sum+=(group||1)*1000;group=0;}else if(token!=='and'&&token!=='a')return null; }
  return (sum+group)>0 ? (sum+group)*100 : null;
}
export const suspicious = text => /ignore (all |previous |the )*instructions|bypass|system prompt|override (the )?(security|rules)|跳过.*(验证|授权)|忽略.*(指令|规则)|无需.*(确认|授权)/i.test(text);
export const schema = {
  type:'object', additionalProperties:false, required:['actions','question','unsupported'],
  properties:{
    actions:{type:'array',items:{type:'object',additionalProperties:false,required:['type','recipient','amount','source','evidence'],properties:{type:{type:'string',enum:['transfer','bill']},recipient:{type:'string'},amount:{type:['integer','null']},source:{type:'string',enum:['savings','joint']},evidence:{type:'string'}}}},
    question:{type:['string','null']},unsupported:{type:'boolean'},
  },
};

// Narrow grammar for an honest, offline demo. Unsupported text never silently disappears.
export function parseDemo(text, source, bills) {
  if (suspicious(text)) return { actions:[], question:'This request attempts to bypass authorization. Please restate only the intended transaction.', unsupported:true };
  if (/\b(USD|EUR|GBP|CNY|RMB|HKD)\b|美元|人民币|港币|欧元|美金|英镑|日元|日币|澳元|马币|港元|加元|美元/i.test(text)) return {actions:[],question:'This prototype supports SGD domestic transactions only. No exchange rate is assumed.',unsupported:true};
  if (/\b(invest|shares?|stocks?|buy|bitcoin|crypto|tomorrow|schedule|every week|if|unless)\b|股票|投资|比特币|明天|定时|每周|如果|除非/i.test(text)) return {actions:[],question:'Investments, scheduled and conditional orders are outside this prototype. Please request an immediate transfer or bill payment.',unsupported:true};
  const parts=text.trim().replace(/[.!。！]+$/g,'').split(/\s*(?:;|；|，|,\s*(?=[a-z])|\band then\b|\bthen\b|\band\s+(?=pay|send|transfer|move)|然后|再(?=交|付|转)|并(?:且)?(?=交|付|转))\s*/i).filter(Boolean);
  if(parts.length>5)return {actions:[],question:'Please limit a plan to five transactions.',unsupported:true};
  const actions=[];
  for(const original of parts){
    let clause=original.replace(/^please\s+/i,'').replace(/^请/,'');
    const account=/joint|联名/i.test(clause)?'joint':/savings|储蓄/i.test(clause)?'savings':source;
    clause=clause.replace(/\s*from (?:my |the )?(?:savings|joint)(?: account)?/ig,'').replace(/从(?:我的)?(?:储蓄|联名)(?:账户)?/g,'').trim();
    const bill=bills.find(b=>b.aliases.some(a=>clause.toLowerCase().includes(a)));
    if(bill && /^(pay|settle|交|缴|付|支付)/i.test(clause)){
      const extra=clause.replace(/^(pay|settle|支付|缴纳|交|缴|付)\s*/i,'').replace(/\b(my|the|this|bill|for|outstanding|full|sgd|dollars)\b/ig,'').replace(/(?:这张|我的|账单|新币|新加坡元|元)/g,'');
      let rest=extra;for(const alias of bill.aliases)rest=rest.replace(new RegExp(alias,'ig'),'');
      rest=rest.trim();
      if(rest && parseAmount(rest)!==bill.amount)return {actions:[],question:'Please pay the exact outstanding bill amount, or restate the request without extra instructions.',unsupported:true};
      actions.push({type:'bill',recipient:bill.id,amount:bill.amount,source:account,evidence:original});continue;
    }
    let recipient='',amountText='';
    const en=clause.match(/^(?:send|transfer|move)\s+(?:SGD\s*|S\$\s*|\$\s*)?(.+?)\s+(?:SGD\s+|dollars?\s+)?to\s+(?:my\s+)?(.+)$/i);
    const zh=clause.match(/^(?:给|向)(.+?)(?:转账|转|汇)(.+?)(?:新加坡元|新币|元|块)?$/) || clause.match(/^(?:转账|转)(.+?)(?:新加坡元|新币|元|块)?给(.+)$/);
    if(en){amountText=en[1].replace(/\s+(SGD|dollars?)$/i,'');recipient=en[2];}
    else if(zh){if(/^(给|向)/.test(clause)){recipient=zh[1];amountText=zh[2];}else{amountText=zh[1];recipient=zh[2];}}
    else return {actions:[],question:'Try “Send 50 SGD to John” or “给妈妈转500新币，然后交电费”. Demo mode uses a limited grammar; live mode supports broader language.',unsupported:true};
    const amount=parseAmount(amountText);
    if(!amount) return {actions:[],question:'Please specify one exact positive amount with at most two decimal places. I will not interpret “the rest” or guess an amount.',unsupported:true};
    actions.push({type:'transfer',recipient:recipient.trim(),amount,source:account,evidence:original});
  }
  return {actions,question:null,unsupported:!actions.length};
}

export function resolvePayee(name){
  const key=name.toLowerCase().trim();
  const exact=payees.find(p=>p.id===key || p.name.toLowerCase()===key);
  return exact ? [exact] : payees.filter(p=>p.aliases.includes(key));
}

// Separate lexical evidence checker; not a second call to the draft parser.
export function auditEvidence(text, actions, bills, source, decisions={}) {
  const findings=[];
  for(const [i,a] of actions.entries()){
    if(!text.includes(a.evidence) || !a.evidence.trim()){findings.push(`Action ${i+1}: missing original transcript evidence.`);continue;}
    if(a.source!==source && !(a.source==='joint'?/joint|联名/i:/savings|储蓄/i).test(a.evidence))findings.push(`Action ${i+1}: source account is not supported by the input.`);
    if(a.type==='bill'){
      const bill=bills.find(b=>b.id===a.recipient);
      if(!bill || a.amount!==bill.amount || !bill.aliases.some(alias=>a.evidence.toLowerCase().includes(alias)))findings.push(`Action ${i+1}: bill metadata mismatch.`);
    }else{
      const p=payees.find(p=>p.id===a.recipient);
      if(!p || (!p.aliases.some(alias=>a.evidence.toLowerCase().includes(alias)) && !a.evidence.toLowerCase().includes(p.name.toLowerCase())))findings.push(`Action ${i+1}: beneficiary differs from the transcript.`);
      if(p && resolvePayee(a.originalRecipient||a.recipient).length>1 && decisions[i]!==p.id)findings.push(`Action ${i+1}: beneficiary requires clarification.`);
      const numbers=[...a.evidence.replace(/,/g,'').matchAll(/\d+(?:\.\d+)?/g)].map(m=>parseAmount(m[0]));
      const chinese=[...a.evidence.matchAll(/[零一二两三四五六七八九十百千万]+/g)].map(m=>parseAmount(m[0]));
      const english=[...a.evidence.toLowerCase().matchAll(/\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|grand|and)[ -]*)+/g)].map(m=>parseAmount(m[0].trim()));
      if(![...numbers,...chinese,...english].includes(a.amount))findings.push(`Action ${i+1}: amount is not supported by the transcript.`);
    }
  }
  return findings;
}
