# Security

## Secret handling

`AGENT_PRIVATE_KEY` and `TEXTILE_API_KEY` are backend-only environment variables. They are not referenced by Vite code, not returned from `/api/config`, and not committed to Git. `.env.example` contains placeholders only. In deployment, use the platform’s secret store or an encrypted runtime environment, rotate the Textile key independently, and restrict server logs so request headers and raw environment values never appear.

## Wallet boundary

The private key is loaded only by `ethers.Wallet` inside the Node process. The browser never signs a transaction and never receives a serialized private key. The public wallet address is safe to display, but it must be verified against the key during deployment. Use a dedicated low-balance agent wallet with only the capital and gas needed for the policy.

## RFQ and transaction safety

The agent sends the exact required Textile fields, but provider response data is untrusted input. Before live execution, validate the returned `to` address against an allowlist or approved Textile router, validate the chain ID and token route, enforce a maximum sell amount, inspect `value` and gas, and simulate the transaction on a fork or provider simulation endpoint. The MVP checks for a destination, valid hex calldata, and sufficient native balance; it intentionally defaults to `DRY_RUN=true`.

The attribution bytes are appended to provider calldata because that is the requested hackathon behavior. Not every contract accepts arbitrary trailing bytes, so production deployment must confirm the corridor’s calldata decoder or use a provider-supported metadata field. If suffix bytes are unsupported, do not broadcast.

## API safety

The run endpoint has a simple in-process execution lock but is not an authenticated production control plane. Put it behind an operator identity, network allowlist, rate limit, CSRF protection where relevant, and an audit log before exposing it publicly. CORS is permissive for local development and should be narrowed to the dashboard origin in production.

## SSE and logs

Logs are plain text events with no secrets. Keep messages bounded, avoid copying provider headers or full sensitive response bodies, cap the in-memory buffer, and set no-cache headers for SSE. If user-controlled strings are later logged, escape or structure them as JSON fields to avoid terminal injection.

## Identity and supply chain

Review the ERC-8004 registry address and ABI against an authoritative deployment source before registration. Pin Node and package manager versions, review lockfile changes, run `npm audit` as a supplementary check, and deploy from a clean checkpoint. Never force-push or overwrite a known-good main branch during a hackathon demo.

## Incident response

If a key leaks, stop the service, revoke/rotate the Textile credential, transfer or freeze remaining funds, and inspect logs and chain activity. If a provider returns unexpected calldata, keep dry-run enabled, capture the quote ID without broadcasting, and open a corridor issue with the provider. If the RPC is unreliable, fail closed rather than retrying a transaction blindly.
