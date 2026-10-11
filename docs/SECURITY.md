# Security and honest limitations

This is a local synthetic-money prototype. It does not claim production bank security, legal non-repudiation, exhaustive attack resistance, or real biometric verification.

| Threat | Implemented boundary | Residual risk / production work |
|---|---|---|
| AI invents beneficiary | Saved-payee resolver; ambiguous aliases need explicit selection | Real beneficiary onboarding must be independently authorized |
| AI changes amount | Independent auditing; exact amount displayed; payload signature | Two model calls can share a mistake; user may approve wrong details |
| ASR hears 500 instead of 50 | Editable transcript, exact-value review | Two downstream engines share ASR input; add calibrated ASR confidence and replay audio |
| Prompt injection | Untrusted input isolation, known-pattern guard, no write tools | Pattern filtering is incomplete; safety relies on authorization boundary |
| Unsigned execution | Public-key verification at sole ledger write endpoint | Same-origin scripts are trusted in this demo |
| Payload alteration | Exact issued bytes + validated action hash | Compromised application server remains in trust boundary |
| Replay | Executed state, replaced challenge, session/version binding | Distributed deployment requires transactional durable idempotency |
| Late policy changes | KYC/balance/limits rechecked at execution | Real-time bank state and settlement failures need integration |
| Cross-site requests | Origin validation, SameSite cookie, JSON content type | Real authenticated API security requires more than local session cookies |
| XSS | Escaped interpolations, static assets, CSP with no inline script | A malicious trusted same-origin script could invoke signing; use hardware/native confirmation |
| Audit alteration | Hash chain on session load and export | No external anchoring; truncation or a full rewrite cannot be reliably detected |
| Large request | Text 2,000 chars; JSON 32 KB; audio 8 MB | Per-IP/account API spend/rate limits needed for public hosting |
| Data durability | JSON temp-file rename; session serialization | No fsync, multi-process lock or crash-atomic database commit; local demo only |

## Explicit simulations

- KYC status can be toggled in Settings for demonstration. It is not identity verification.
- Public key is self-registered by a synthetic browser session, not bound to a bank identity.
- “Simulate approval & sign” is a click followed by a real cryptographic signature; it is not Face ID.
- High-value token is displayed in the same UI, clearly labelled simulated. Do not describe it as genuine out-of-band authentication.
- No actual bank API, funds, externally verified account number or settlement network is used.

## Data handling

Use synthetic names and amounts. Server-only secrets come from `.env`, excluded by `.gitignore`. Requests sent to a configured AI provider contain user text, candidate actions and minimal synthetic catalog context; `store:false` is requested for Responses. This is not a claim about every aspect of provider retention.

Successful cloud speech recordings are stored locally with their MIME type and hash in the audit. Browser Web Speech fallback may send audio to the browser vendor and does not expose original audio for local audit; the UI identifies this fallback. Data retention, encryption at rest, access governance and deletion need a production design.

## Lab scope

Six deterministic fixtures test real gateway/evidence code. They are neither penetration testing nor a model benchmark. A `6/6` result demonstrates only these six expected behaviors. See automated tests for additional boundary cases.
