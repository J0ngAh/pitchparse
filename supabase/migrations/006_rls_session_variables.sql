-- RLS optimization: use session variables instead of per-row function calls
-- Set via SET LOCAL in API auth middleware, read via current_setting()

-- Helper functions that read from session variables (fast, no table lookup)
CREATE OR REPLACE FUNCTION auth.session_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_org_id', true), '')::UUID;
$$;

CREATE OR REPLACE FUNCTION auth.session_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_role', true), '');
$$;
