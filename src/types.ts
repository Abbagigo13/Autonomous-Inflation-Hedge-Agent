export type AgentLogger = (message: string, level?: LogLevel) => void;
export type LogLevel = "info" | "success" | "warning" | "error";

export interface LogEvent {
  id: string;
  timestamp: string;
  message: string;
  level: LogLevel;
}

export interface RfqQuote {
  transaction?: {
    to: string;
    data?: string;
    value?: string | number;
    gas?: string | number;
    gasLimit?: string | number;
    [key: string]: unknown;
  };
  tx?: RfqQuote["transaction"];
  data?: {
    transaction?: RfqQuote["transaction"];
    tx?: RfqQuote["transaction"];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CycleResult {
  inflationRate: number;
  hedgeTriggered: boolean;
  executed: boolean;
  txHash?: string;
  reason?: string;
}
