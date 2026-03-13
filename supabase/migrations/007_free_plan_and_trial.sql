-- Migration 007: Add 'free' plan, update defaults for new orgs
--
-- Changes:
-- 1. Add 'free' to the plan CHECK constraint
-- 2. Change default plan from 'starter' to 'free'
-- 3. Change default analysis_quota from 50 to 5

-- Drop existing CHECK constraint and add new one with 'free'
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
    CHECK (plan IN ('free', 'starter', 'team', 'enterprise'));

-- Update defaults for new orgs
ALTER TABLE organizations ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE organizations ALTER COLUMN analysis_quota SET DEFAULT 5;
