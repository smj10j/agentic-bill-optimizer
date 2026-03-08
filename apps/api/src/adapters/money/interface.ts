/**
 * Money interface — abstraction over programmable money infrastructure.
 *
 * MVP implementation: MockMoneyAdapter (fixed yield rate, in-memory simulation)
 * Future: Circle USDC, or other stablecoin settlement layer
 *
 * Callers never import a concrete implementation — they receive a MoneyAdapter instance
 * injected by the Worker entry point.
 */

export type TxResult = {
  success: boolean;
  transactionId: string;
  amountCents: number;
  description: string;
  timestamp: number;
};

export interface MoneyAdapter {
  /** Current APY as basis points (e.g. 450 = 4.50%) */
  getYieldRate(): Promise<number>;

  /** Get user's current yield position balance in cents */
  getYieldBalance(userId: string): Promise<number>;

  /** Move funds from checking into yield position */
  sweepToYield(userId: string, amountCents: number): Promise<TxResult>;

  /** Move funds from yield position back to checking */
  sweepFromYield(userId: string, amountCents: number): Promise<TxResult>;

  /** Settle a bill payment */
  settleBill(userId: string, billId: string, amountCents: number): Promise<TxResult>;
}
