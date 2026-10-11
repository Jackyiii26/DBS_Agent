import { readFileSync } from 'node:fs';
import { createPublicKey, verify } from 'node:crypto';
import { digest } from '../server/engine.mjs';
const path=process.argv[2];if(!path){console.error('Usage: node scripts/verify-receipt.mjs <downloaded-receipt.json>');process.exit(1);}
try{
  const r=JSON.parse(readFileSync(path,'utf8'));const payload=JSON.parse(r.authorizationPayload);
  const signatureValid=verify('sha256',Buffer.from(r.authorizationPayload),{key:createPublicKey({key:r.publicKey,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(r.signature,'base64'));
  const contentValid=digest(r.authorizationPayload)===r.authorizationHash&&digest(payload.actions)===digest(r.actions)&&payload.total===r.total&&payload.planId===r.planId;
  console.log(JSON.stringify({receiptId:r.id,signatureValid,contentValid,notice:'Verifies mathematical consistency with the included public key, not a bank identity or real biometric authorization.'},null,2));
  if(!signatureValid||!contentValid)process.exitCode=1;
}catch(e){console.error('Receipt verification failed:',e.message);process.exitCode=1;}
