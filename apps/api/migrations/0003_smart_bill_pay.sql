-- PRD-003: Smart Bill Pay Timing
-- Adds scheduling metadata to bills so Orbit can calculate optimal payment dates.

ALTER TABLE bills ADD COLUMN grace_period_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN late_fee_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN payment_rail TEXT NOT NULL DEFAULT 'ach' CHECK (payment_rail IN ('ach', 'same_day_ach', 'card', 'check', 'auto'));
ALTER TABLE bills ADD COLUMN smart_pay_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bills ADD COLUMN biller_category TEXT NOT NULL DEFAULT 'utility' CHECK (biller_category IN ('utility', 'insurance', 'rent', 'mortgage', 'credit_card', 'subscription', 'medical', 'other'));
