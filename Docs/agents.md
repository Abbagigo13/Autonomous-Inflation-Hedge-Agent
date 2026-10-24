# Agent Identity and Capabilities

## Identity

The agent is registered on Celo Mainnet through the ERC-8004 Identity Registry at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`. The registration script uses the agent wallet derived from `AGENT_PRIVATE_KEY`, creates JSON metadata, encodes it as a `data:application/json;base64` URI, and calls `register(string agentURI)`.

The metadata includes the human-readable name, version, chain name, chain ID `42220`, wallet address, capability list, and attribution tag `celo_09b7d0a51f16`. Keeping this metadata self-contained makes it possible to inspect the identity without hosting a separate metadata server for the MVP.

## Capabilities

**Inflation monitoring:** the agent exposes `getInflationRate()` as a replaceable signal boundary. The current implementation returns a deterministic mock value for demonstration.

**Policy evaluation:** `runAgentCycle()` compares the signal to `INFLATION_HEDGE_THRESHOLD` and produces a clear below-threshold or threshold-breached outcome.

**Open-corridor routing:** `executeSwap()` requests a Textile FX RFQ for wARS to USDT on Celo Mainnet using the configured agent wallet as taker.

**Attribution:** the agent encodes the attribution tag to hex and includes it in prepared transaction data, while streaming the representation to the terminal.

**Observability:** Express emits timestamped structured log frames through `/api/logs`; the dashboard renders them as a live execution trail.

## Operating modes

`DRY_RUN=true` is the default and is appropriate for development, judging, and corridor inspection. It executes the policy and RFQ request but does not broadcast. `DRY_RUN=false` enables `ethers.Wallet.sendTransaction` after the response and balance guards pass. The live mode should only be used with an allowlisted provider router and a dedicated funded wallet.

## Delegation roadmap

A future version can expose an authenticated agent-to-agent endpoint where an ERC-8004 identity requests a policy quote, pays for a premium inflation attestation through x402, and receives a signed hedge intent. That future interface should preserve the current capability boundaries: no arbitrary contract targets, no unrestricted token amounts, and explicit attribution on every settlement.
