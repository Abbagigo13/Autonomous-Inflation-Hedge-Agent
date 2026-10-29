# Security

## Secret handling

`AGENT_PRIVATE_KEY` and `TEXTILE_API_KEY` are backend-only environment variables. They are not referenced by the frontend, not returned by any endpoint, and not committed to Git. `.env.example` contains placeholders only. Never paste or screenshot the real `.env` file anywhere. If a key may have been exposed, move the funds to a new wallet and rotate the Textile key. In deployment, use the platform's secret store, and keep request headers and raw environment values out of logs.

## Wallet boundary

The private key is loaded only by `ethers.Wallet` inside the Node process. The browser never signs a transaction and never receives the key. The public wallet address is safe to display. Use a dedicated low-balance agent wallet that holds only the capital and gas the policy needs.

## Inflation data

The signal comes from INDEC's public series through datos.gob.ar. It is treated as untrusted input. The agent calculates year-over-year inflation from raw index values, requires 13 consecutive months, rejects data older than 120 days and values outside a plausible range, and stops the run instead of substituting a default. This feed is not signed, so a compromised or spoofed response is a residual risk; a signed source would remove it.

## Quote and transaction safety

What is implemented: the quote's destination must be a valid address and its calldata valid hex; the wallet must hold enough CELO for gas; the attribution tag must be present or the agent refuses to send; the token approval is for exactly the sell amount (never unlimited) and is sent only to an address the quote explicitly names as the approval target; in live mode the agent refuses to send a swap when the quote does not name an approval target; `DRY_RUN=true` is the default.

What is not implemented, and should be added before holding meaningful funds: an allowlist of approved router addresses, an upper limit beyond `HEDGE_SELL_AMOUNT`, and a simulation of the swap before it is sent.

The attribution bytes are appended to the calldata. Not every contract accepts extra trailing bytes. The ERC-8004 registration path estimates gas before sending, so a rejection costs nothing. For the swap, confirm with the first live transaction and stop if it is rejected. After a live swap the agent reads the transaction back from the chain and logs whether the tag is present.

## API safety

`POST /api/run-agent` has an in-process lock but no authentication. The server accepts browser requests only from `localhost` and `127.0.0.1` origins, which is appropriate for local use. Before exposing it publicly, add operator authentication, rate limiting and an audit log. Anyone who can reach the port from a non-browser client could still trigger a run, so do not expose port 3000 to a network.

## Live logs and history

Logs are plain-text events without secrets. Quote responses are logged only as field names, not values. `data/history.json` stores run metadata and transaction hashes, no secrets. If user-controlled strings are ever logged, escape them to avoid terminal injection.

## Identity and supply chain

Check the ERC-8004 registry address against an authoritative source before registering. The registration script checks the registry first and will not register twice without `--force`. Pin the Node version, review lockfile changes, run `npm audit` as an extra check, and deploy from a clean checkpoint. Do not force-push over a known-good main branch before a demo.

## Incident response

If a key leaks, stop the service, rotate the Textile credential, move the remaining funds to a new wallet, and inspect logs and chain activity. If a quote returns unexpected calldata, keep dry-run enabled and report it to the provider with the quote ID. If the RPC is unreliable, fail closed rather than retrying a transaction blindly.
