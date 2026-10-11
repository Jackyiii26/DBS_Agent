# Six-minute demo script

## Setup

1. Run `npm start`, open localhost. Show the Demo / Live label accurately.
2. Settings → Reset demo. Keep KYC Verified.
3. If demonstrating cloud AI or speech, configure and test credentials before recording. Never show .env or secrets.
4. Prepare English and Mandarin inputs. Use text if microphone access or room acoustics are unreliable, and disclose that limitation.

## 0:00–0:35 · The problem

“Banking tasks are simple. Banking navigation often isn't. A transfer and a bill payment can mean two separate forms. Aegis lets you express the task once — while keeping approval firmly in your hands.”

Show the account overview. Explain all money is synthetic.

## 0:35–1:45 · One request, two payments

Enter: `Send 500 SGD to Mom and pay my electricity bill`.

Show two precise cards: S$500 to Mei Tan, S$128.40 to SP Services, S$628.40 total. Point to the after-payment balance. Nothing has been debited.

“The assistant prepares a plan. It cannot approve or execute it.”

Click Review & authorize. Show the exact summary, then approve the synthetic payment. The signature is verified server-side; balances update and a receipt appears.

## 1:45–2:30 · Ambiguity is a product feature

Enter: `Send 50 SGD to John`.

Show both John Lim (4521) and John Tan (8892). Choose one. Explain the model cannot guess the identity. Cancel rather than completing if time is limited.

Optional Mandarin: `给妈妈转五百新币`. Reset the workspace first if reusing paid bills.

## 2:30–3:50 · Try to break it

Open Security lab, Run all 6 tests. Highlight:

- No signature → rejected, unchanged balance.
- Signed 50 altered to 500 → rejected.
- Valid authorization replay → only one debit.

“These are real checks against isolated synthetic fixtures, not green badges in a static mockup. This is a bounded test suite, not a claim that every possible attack has been solved.”

## 3:50–4:40 · Explain the boundary

Show the architecture row. AI is read-only. User authorizes exact bytes. Gateway checks signature, expiry, plan version, policy and single-use state. Show Audit trail and one ledger record.

If desired, download a receipt and run the offline verifier to show a signature can be checked without the conversational model.

## 4:40–5:20 · Responsible implementation

“Bank APIs, KYC and biometrics are simulated. Cryptographic signing and rejection logic are implemented. In production, the confirmation surface and key registration would be bank-controlled and hardware-bound.”

Distinguish the offline grammar mode from the live model adapter. Do not claim measured ASR/model quality without running live evaluations.

## 5:20–6:00 · Value and next step

Present actual test results and, when collected, user task-completion times. Avoid invented efficiency percentages.

“Aegis makes the conversation flexible and the execution explicit. You say what you want. Every payment follows only the exact plan you approve.”

Include real CodeBuddy/WorkBuddy development evidence when available. It has not yet been produced by this project.
