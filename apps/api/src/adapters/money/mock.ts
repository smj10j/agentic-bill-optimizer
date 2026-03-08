import type { MoneyAdapter, TxResult } from "./interface.js";
import { generateId } from "../../lib/id.js";

/**
 * Mock money adapter — simulates yield and settlement for development/MVP.
 * Returns realistic-looking responses without touching any real money infrastructure.
 *
 * Swap this out with a real implementation (e.g. CircleMoneyAdapter) when ready.
 */
export class MockMoneyAdapter implements MoneyAdapter {
  private readonly FIXED_APY_BASIS_POINTS = 450; // 4.50%

  async getYieldRate(): Promise<number> {
    return this.FIXED_APY_BASIS_POINTS;
  }

  async getYieldBalance(_userId: string): Promise<number> {
    void _userId;
    // In MVP, balance is stored in D1 — this adapter just provides the rate
    // Real adapter would query the stablecoin protocol
    return 0;
  }

  async sweepToYield(_userId: string, amountCents: number): Promise<TxResult> {
    return {
      success: true,
      transactionId: generateId("tx"),
      amountCents,
      description: `Swept $${(amountCents / 100).toFixed(2)} to yield position`,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  async sweepFromYield(_userId: string, amountCents: number): Promise<TxResult> {
    return {
      success: true,
      transactionId: generateId("tx"),
      amountCents,
      description: `Withdrew $${(amountCents / 100).toFixed(2)} from yield position`,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  async settleBill(_userId: string, billId: string, amountCents: number): Promise<TxResult> {
    return {
      success: true,
      transactionId: generateId("tx"),
      amountCents,
      description: `Settled bill ${billId} for $${(amountCents / 100).toFixed(2)}`,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }
}
