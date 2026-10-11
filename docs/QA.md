# Quality assurance

## Automated suite

Verified result: **29 / 29 passed**, with `npm run check` also passing. Browser-downloaded receipt `AG-C442868D` was checked with the offline verifier: `signatureValid: true`, `contentValid: true`. These are synthetic test results, not bank certification.

Run `npm test`. Core, HTTP and provider-contract tests cover:

- Decimal precision, positive amounts, English and Chinese number words.
- Multi-intent transfers and bill payment, explicit source account.
- Two matching Johns, invalid choice rejection, second-action clarification.
- Unsupported partial requests; foreign currency, remainder, conditional and future orders.
- Duplicate bill payment, insufficient funds, plan/day/velocity limits.
- High-value simulated token verification.
- Missing / wrong-key signatures, altered payloads, changed drafts.
- Expired, cancelled, superseded and replayed authorization.
- Policy changes between approval and execution.
- Audit mutation detection and persistence serialization.
- Session key replacement rejection.
- Browser-compatible Web Crypto signature encoding.
- HTTP concurrent replay: exactly one success and one rejection.
- Session isolation, Origin/content-type checks, static file allowlist and CSP.
- Actual provider request schema, independent auditor input, missing key, outage, malformed model output and audio request construction, with mocked network responses.

Provider contract tests do **not** measure live model quality, latency, ASR accuracy or account model access.

## Manual browser acceptance

- Desktop overview and account cards.
- One request → two transactions → review → signed execution → correct balances and paid bill.
- Six security-lab fixtures run through the UI and report 6/6.
- Beneficiary clarification, high-value token, expanded audit details and receipt download.
- Mobile layout and browser console checks.
- Server restart restored the pending plan and balances; the persisted browser key successfully signed a subsequent plan.

## Live evaluation checklist (requires credentials)

Use a labelled dataset spanning English, Mandarin, mixed language, Singapore accents, amount near-homophones, multiple recipients, unsupported intents and adversarial bill text. For each case record expected outcome, parsed fields, clarification correctness, latency and final policy decision. Test an ASR error that both semantic engines receive identically. Do not treat model agreement as proof of correctness.

## Limits of present verification

No real API calls, hardware biometrics, external token, DBS sandbox, microphone recording or public deployment were validated without credentials / services. All shown balances and attack fixtures are synthetic.
