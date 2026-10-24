# Product Requirements Document

## Product

**Name:** Autonomous Inflation Hedge Agent. **Primary user:** a treasury operator, fintech builder, or hackathon judge who needs to understand and protect local-currency exposure without manually choosing an FX route for every policy event.

## Problem

Argentina-linked wFIAT exposure can lose value under inflation. Manual hedging is slow, difficult to audit, and often disconnected from the operator’s onchain treasury. Existing trading dashboards may show prices but do not turn a macro policy into a transparent, attributable agent action.

## Solution

A server-side agent monitors a macro signal, compares it with a documented threshold, requests a Textile FX RFQ on Celo, verifies that the wallet and returned transaction are usable, injects the project attribution tag, and settles wARS into USDT when configured for live execution. A React dashboard displays current public balances, policy state, route status, and a live execution trail.

## Goals

The MVP must make one policy decision deterministic, use the exact Celo Mainnet token and chain configuration, keep secrets off the client, register a machine-readable ERC-8004 identity, and make failures observable. It should be easy to run in dry-run mode before any capital is exposed.

## Non-goals

The MVP does not provide investment advice, guarantee a Textile corridor, implement a production CPI oracle, manage multiple users, custody user funds, or claim a live x402 or Ripio API integration that is not present in the code.

## Functional requirements

1. The backend reads environment configuration and initializes Celo Mainnet RPC connectivity.
2. The inflation service returns a mock value behind a replaceable function boundary.
3. A cycle compares the signal with `INFLATION_HEDGE_THRESHOLD`; below threshold it does not request an RFQ.
4. Above threshold, the cycle sends Textile’s exact RFQ payload and authorization header.
5. The response is validated before any transaction is prepared.
6. The attribution tag is hex-encoded and added to transaction data.
7. Insufficient funds, absent credentials, invalid transaction data, no corridor, and provider errors are readable outcomes.
8. The server exposes SSE logs and a run endpoint.
9. The dashboard reads real wARS and USDT ERC-20 balances using Forno and `balanceOf`.
10. The dashboard provides KPI cards, a Recharts area chart, Smart Insights, skeleton loading, and an auto-scrolling terminal.
11. Identity registration builds a base64 JSON URI and calls ERC-8004 `register(string)`.

## Success metrics

A judge can install the project, start it without secrets, load a complete dashboard, click “Run hedge agent,” see the threshold decision in the terminal, and understand why execution is blocked. With valid credentials and dry-run enabled, the judge can inspect the exact RFQ request and prepared transaction without broadcasting funds.

## User stories

As an operator, I want to see how much USDT is protected so I can understand the hedge posture. As a builder, I want one button to exercise the entire policy path. As a reviewer, I want a live reason for every success, warning, and failure. As an ecosystem participant, I want the agent identity and attribution to be discoverable.

## Future requirements

Replace the mock signal with signed data, persist hedge events, add scheduled execution and alerts, simulate provider transactions, support multiple currencies and policies, and allow other ERC-8004 agents to request protection through an authenticated API.
