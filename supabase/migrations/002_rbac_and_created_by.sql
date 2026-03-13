-- PitchParse Phase 2: RBAC + created_by tracking
-- Adds role-based access control, ownership tracking, and invitation system

-- ============================================================
-- 1. ADD ROLE COLUMN TO USERS
-- ============================================================

ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'manager', 'admin'));

CREATE INDEX idx_users_role ON users(role);

-- Helper: get the role of the current authenticated user
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ============================================================
-- 2. ADD CREATED_BY COLUMNS
-- ============================================================

ALTER TABLE transcripts ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE analyses ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_transcripts_created_by ON transcripts(created_by);
CREATE INDEX idx_analyses_created_by ON analyses(created_by);
CREATE INDEX idx_reports_created_by ON reports(created_by);

-- ============================================================
-- 3. UPDATE RLS SELECT POLICIES FOR ROLE-BASED ACCESS
-- ============================================================

-- Transcripts: manager/admin see all org data, user sees own
DROP POLICY "Org members can view transcripts" ON transcripts;
CREATE POLICY "Role-based transcript access" ON transcripts FOR SELECT USING (
    org_id = public.user_org_id()
    AND (
        public.user_role() IN ('manager', 'admin')
        OR created_by = auth.uid()
        OR created_by IS NULL  -- legacy rows visible to all
    )
);

-- Analyses: manager/admin see all org data, user sees own
DROP POLICY "Org members can view analyses" ON analyses;
CREATE POLICY "Role-based analysis access" ON analyses FOR SELECT USING (
    org_id = public.user_org_id()
    AND (
        public.user_role() IN ('manager', 'admin')
        OR created_by = auth.uid()
        OR created_by IS NULL  -- legacy rows visible to all
    )
);

-- Reports: manager/admin see all org data, user sees own
DROP POLICY "Org members can view reports" ON reports;
CREATE POLICY "Role-based report access" ON reports FOR SELECT USING (
    org_id = public.user_org_id()
    AND (
        public.user_role() IN ('manager', 'admin')
        OR created_by = auth.uid()
        OR created_by IS NULL  -- legacy rows visible to all
    )
);

-- INSERT/UPDATE/DELETE policies stay org-scoped (unchanged)

-- ============================================================
-- 4. INVITATIONS TABLE
-- ============================================================

CREATE TABLE invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager')),
    invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);

CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Managers/admins can view invitations for their org
CREATE POLICY "Managers can view org invitations" ON invitations FOR SELECT USING (
    org_id = public.user_org_id()
    AND public.user_role() IN ('manager', 'admin')
);

CREATE POLICY "Managers can create invitations" ON invitations FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_role() IN ('manager', 'admin')
);

CREATE POLICY "Managers can update invitations" ON invitations FOR UPDATE USING (
    org_id = public.user_org_id()
    AND public.user_role() IN ('manager', 'admin')
);

CREATE POLICY "Managers can delete invitations" ON invitations FOR DELETE USING (
    org_id = public.user_org_id()
    AND public.user_role() IN ('manager', 'admin')
);

-- ============================================================
-- 5. SEED DATA
-- ============================================================

-- Set admin for the system owner
UPDATE users SET role = 'admin' WHERE email = 'jon.hartley90@gmail.com';

-- Promote all existing users to manager (safe since only the owner exists)
UPDATE users SET role = 'manager' WHERE role = 'user';
