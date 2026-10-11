# Submission draft — complete missing evidence before submitting

## Project title

Aegis

## Short blurb (8 words)

Conversational banking with you in control of payments.

## Overview

Aegis is a Direct Conversational Transaction Agent for the DBS banking challenge, Scenario 1: Voice-Enabled Payment and Transaction. It helps retail banking customers prepare SGD transfers and bill payments through one English or Mandarin request, while keeping financial execution behind an explicit user authorization boundary.

## User problem

A customer who wants to transfer money to a family member and settle a utility bill typically repeats navigation and form-filling across separate flows. Natural language reduces this friction but can introduce ambiguous beneficiaries, incorrectly recognized amounts and prompt-injection risks. Aegis combines a concise conversation with precise review and deterministic execution.

The pain-point source is the supplied DBS challenge statement. User interviews have not yet been conducted; do not represent the assumed personas as validated customer research.

## Solution

A read-only compiler converts the request to a structured draft. Saved beneficiary metadata resolves known names; ambiguous matches require explicit clarification. An independent auditor checks the draft against the original input. Deterministic rules enforce KYC status, balances, bill amounts and transaction limits. A separate confirmation overlay shows the exact plan, which is signed with a browser P-256 key. The gateway accepts only the exact issued and signed payload, rejects replay and expiration, and checks policy again before updating the synthetic ledger.

The interface includes receipts, a hash-chained audit trail and a security lab that attempts six concrete attacks on isolated fixtures.

## AI usage

Live mode uses separate structured-output model calls for drafting and validation, with no financial write tools. Prompts explicitly separate untrusted transaction data from system behavior and require missing information to be surfaced. Model and voice endpoints are configurable. Offline mode is a labelled grammar-based fallback for reproducible demos, not a claim of actual LLM inference.

## Business value / metrics

Implemented indicators: number of transactions handled per request, correctness of beneficiary clarification, unauthorized gateway acceptance in the specified tests, replay debit count and audit reconstruction.

Before submission, add measured task-completion time versus a baseline form, successful-task rate across a disclosed input set, median/p95 live model latency, and ASR error rates for realistic accents. No unmeasured efficiency or accuracy percentages are asserted here.

## Scope and originality

Original local prototype with synthetic banking data. No real banking integration. KYC, biometric approval and secondary token are explicitly simulated. Core signatures, authorization binding, policy enforcement and gateway rejection are implemented. Aegis is not affiliated with or endorsed by DBS.

## Required evidence not yet supplied

- Actual CodeBuddy or WorkBuddy usage with at least three clear development screenshots / applicable recording.
- Team information and eligibility confirmation.
- Final 16:9 cover image; screenshot can be used as a starting point.
- Optional 5–8 minute demo video.
- Optional live link (current deliverable is localhost only).
- Final verification against any newer track handbook or organizer instructions.

Do not fabricate screenshots, interviews, results, provider usage or deployment claims.
