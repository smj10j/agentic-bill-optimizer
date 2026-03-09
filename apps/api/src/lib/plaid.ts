/**
 * Plaid HTTP client — no Node.js SDK, raw fetch calls for Cloudflare Workers.
 * Implements the subset of Plaid API needed for account linking.
 * API reference: https://plaid.com/docs/api/
 */

export type PlaidEnv = "sandbox" | "development" | "production";

const PLAID_BASE: Record<PlaidEnv, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

const PLAID_VERSION = "2020-09-14";

async function plaidPost<T>(
  clientId: string,
  secret: string,
  env: PlaidEnv,
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${PLAID_BASE[env]}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Plaid-Version": PLAID_VERSION,
    },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `Plaid ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { error_message?: string; error_code?: string };
      message = parsed.error_message ?? parsed.error_code ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ─── Link Token ───────────────────────────────────────────────────────────────

export type CreateLinkTokenResponse = {
  link_token: string;
  expiration: string;
  request_id: string;
};

export async function createLinkToken(
  clientId: string,
  secret: string,
  env: PlaidEnv,
  userId: string
): Promise<CreateLinkTokenResponse> {
  return plaidPost<CreateLinkTokenResponse>(clientId, secret, env, "/link/token/create", {
    user: { client_user_id: userId },
    client_name: "Orbit",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en",
  });
}

// ─── Exchange Public Token ────────────────────────────────────────────────────

export type ExchangeTokenResponse = {
  access_token: string;
  item_id: string;
  request_id: string;
};

export async function exchangePublicToken(
  clientId: string,
  secret: string,
  env: PlaidEnv,
  publicToken: string
): Promise<ExchangeTokenResponse> {
  return plaidPost<ExchangeTokenResponse>(clientId, secret, env, "/item/public_token/exchange", {
    public_token: publicToken,
  });
}

// ─── Get Accounts ─────────────────────────────────────────────────────────────

export type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: "depository" | "credit" | "loan" | "investment" | "other";
  subtype: string | null;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
  };
};

export type PlaidItem = {
  item_id: string;
  institution_id: string | null;
};

export type GetAccountsResponse = {
  accounts: PlaidAccount[];
  item: PlaidItem;
  request_id: string;
};

export async function getPlaidAccounts(
  clientId: string,
  secret: string,
  env: PlaidEnv,
  accessToken: string
): Promise<GetAccountsResponse> {
  return plaidPost<GetAccountsResponse>(clientId, secret, env, "/accounts/get", {
    access_token: accessToken,
  });
}

// ─── Get Institution ──────────────────────────────────────────────────────────

export type GetInstitutionResponse = {
  institution: {
    institution_id: string;
    name: string;
  };
};

export async function getInstitution(
  clientId: string,
  secret: string,
  env: PlaidEnv,
  institutionId: string
): Promise<GetInstitutionResponse> {
  return plaidPost<GetInstitutionResponse>(clientId, secret, env, "/institutions/get_by_id", {
    institution_id: institutionId,
    country_codes: ["US"],
  });
}

// ─── Transaction Sync ─────────────────────────────────────────────────────────

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number; // positive = debit from user's perspective
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  date: string; // "YYYY-MM-DD"
  pending: boolean;
};

export type SyncTransactionsResponse = {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: Array<{ transaction_id: string }>;
  next_cursor: string;
  has_more: boolean;
};

export async function syncTransactions(
  clientId: string,
  secret: string,
  env: PlaidEnv,
  accessToken: string,
  cursor?: string
): Promise<SyncTransactionsResponse> {
  return plaidPost<SyncTransactionsResponse>(clientId, secret, env, "/transactions/sync", {
    access_token: accessToken,
    ...(cursor !== undefined ? { cursor } : {}),
    count: 250,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map Plaid account type+subtype to our 3-value enum. */
export function mapAccountType(
  type: string,
  subtype: string | null
): "checking" | "savings" | "credit" {
  if (type === "depository") {
    if (subtype === "savings" || subtype === "money market" || subtype === "cd") return "savings";
    return "checking";
  }
  if (type === "credit") return "credit";
  // loan, investment, other → checking (hidden from balance calc via connection_status later)
  return "checking";
}

/** Balance in cents: prefer available, fall back to current. */
export function balanceCents(account: PlaidAccount): number {
  const val = account.balances.available ?? account.balances.current ?? 0;
  // Credit accounts: Plaid returns positive current = amount owed → negate
  const raw = Math.round(val * 100);
  return account.type === "credit" ? -Math.abs(raw) : raw;
}
