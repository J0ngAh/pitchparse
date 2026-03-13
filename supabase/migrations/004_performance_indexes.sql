-- Performance indexes for common query patterns
-- Speeds up list queries, dashboard stats, and billing webhook lookups

CREATE INDEX IF NOT EXISTS idx_analyses_org_created ON analyses(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status_org ON analyses(status, org_id);
CREATE INDEX IF NOT EXISTS idx_reports_org_analysis ON reports(org_id, analysis_id);
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_sub ON organizations(stripe_subscription_id);
