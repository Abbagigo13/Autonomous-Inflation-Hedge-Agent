export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
] as const;

export const ERC8004_ABI = [
  "function register(string agentURI) returns (uint256 agentId)"
] as const;
