# Product Requirements Document

## Product

**Name:** Autonomous Inflation Hedge Agent. **Primary user:** a treasury operator, fintech builder, or hackathon judge who needs to understand and protect local-currency exposure without manually choosing an FX route for every policy event.

## Problem

Argentina-linked wFIAT exposure can lose value under inflation. Manual hedging is slow, difficult to audit, and often disconnected from the operator's onchain treasury. Existing trading dashboards may show prices but do not turn a macro policy into a transparent, attributable agent action.

## Solution

A server-side agent reads Argentina's official inflation data, compares year-over-year inflation with a documented threshold, requests a Textile FX RFQ on Celo, verifies that the wallet and returned transaction are usable, attaches the project attribution tag, and swaps wARS into USDT when configured for live execution. A React dashboard displays current public balances, the latest inflation signal, run history, and a live execution trail.

## Goals

The MVP must make one policy decision deterministic, use real and validated inflation data, use the exact Celo Mainnet token and chain configuration, keep secrets off the client, register a machine-readable ERC-8004 identity, tag every transaction it builds, and make failures observable. It should be easy to run in dry-run mode before any capital is exposed.

## Non-goals

The MVP does not provide investment advice, guarantee a Textile corridor, use a signed oracle (it reads INDEC's public API), manage multiple users, custody user funds, run on a schedule, or claim a live x402 or Ripio API integration that is not present in the code.

## Functional requirements

1. The backend reads environment configuration and initializes Celo Mainnet RPC connectivity.
2. The inflation service reads INDEC's national consumer price index from datos.gob.ar, calculates year-over-year inflation, and fails closed on missing, stale or implausible data.
3. A cycle compares the signal with `INFLATION_HEDGE_THRESHOLD` (default 30, year over year); below threshold it does not request an RFQ.
4. At or above threshold, the cycle sends Textile's RFQ payload with the authorization header.
5. The response is validated before any transaction is prepared.
6. The attribution tag is hex-encoded and added to every transaction the agent builds (swap, approval, registration), and sends are refused without it.
7. Insufficient funds, absent credentials, invalid transaction data, a rejected quote, an unknown approval target and provider errors are readable outcomes with a recorded reason.
8. The server exposes live logs over SSE, a run endpoint that returns when the cycle finishes (HTTP 409 if a cycle is already running), and read endpoints for history, treasury, identity and routes.
9. Every run is saved and shown on the Hedge history page.
10. The dashboard has five pages (Overview, Hedge history, Execution routes, Treasury, Identity) that show real data or state clearly that a value is unknown.
11. Identity registration builds a base64 JSON URI, calls ERC-8004 `register(string)`, and refuses to register twice by accident.

## Success metrics

A judge can install the project, start it, load the dashboard, click "Run hedge agent", and see the real inflation reading, the threshold decision, and the quote outcome in the terminal. With valid credentials and dry-run enabled, the judge can inspect the quote request and the prepared tagged transaction without broadcasting funds. A completed live swap with a verified on-chain tag is the final success criterion and is pending wallet funding.

## User stories

As an operator, I want to see how much USDT is protected so I can understand the hedge posture. As a builder, I want one button to exercise the entire policy path. As a reviewer, I want a live reason for every success, warning, and failure. As an ecosystem participant, I want the agent identity and attribution to be discoverable.

## Future requirements

Scheduled execution with alerts for low gas and failed quotes, operator authentication for the run endpoint, transaction simulation before live sends, additional currencies (wBRL, wMXN, wCOP) each with its own official inflation source, non-custodial user vaults and a MiniPay mini app after security review, and routing hedged USDT into yield protocols.
