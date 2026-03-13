# Admin Org Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admin users to view any organization's data across all pages via a sidebar dropdown, while managers/users remain scoped to their own org.

**Architecture:** Add an `X-Admin-Org-Id` header to the API client that admins can set. The backend auth dependency checks for this header and, if the user is admin, overrides the `org_id` in the returned user context. All existing route handlers automatically use the correct org — zero changes to individual routes. The frontend adds a Zustand-persisted `viewingOrgId` and an org switcher dropdown in the sidebar.

**Tech Stack:** FastAPI (auth dependency), Zustand (state), React Query (data refetching), shadcn/ui Select (dropdown), ky (HTTP client hook)

---

## Task 1: Backend — Admin org override in auth dependency

**Files:**
- Modify: `api/auth.py`
- Test: `tests/test_auth_org_override.py`

**Step 1: Write the failing test**

```python
# tests/test_auth_org_override.py
"""Tests for admin org override via X-Admin-Org-Id header."""

import pytest
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth import get_current_user


@pytest.fixture
def app():
    app = FastAPI()

    @app.get("/test")
    async def test_route(user=Depends(get_current_user)):
        return {"org_id": user["org_id"], "role": user["role"]}

    return app


class TestAdminOrgOverride:
    """Admin users can override org_id via X-Admin-Org-Id header."""

    def test_admin_without_override_uses_own_org(self, mock_admin_user):
        """Admin without header gets their own org_id."""
        # Covered by existing auth tests — just assert org_id matches user's org
        assert mock_admin_user["org_id"] == "admin-org-id"

    def test_admin_with_override_uses_target_org(self):
        """Admin with X-Admin-Org-Id header gets overridden org_id."""
        # When admin sends X-Admin-Org-Id: target-org-id
        # Then user["org_id"] == "target-org-id"
        # And user["_real_org_id"] == "admin-org-id"
        pass

    def test_manager_with_override_header_is_ignored(self):
        """Non-admin users cannot use the override header."""
        # When manager sends X-Admin-Org-Id: target-org-id
        # Then user["org_id"] == manager's own org (header ignored)
        pass

    def test_user_with_override_header_is_ignored(self):
        """Regular users cannot use the override header."""
        pass
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_auth_org_override.py -v`
Expected: FAIL (tests are skeleton)

**Step 3: Implement the override logic in `api/auth.py`**

Add to the end of `get_current_user`, after the user dict is built:

```python
async def get_current_user(request: Request) -> dict:
    # ... existing JWT verification and user lookup (lines 20-52) ...

    # Admin org override: allow admins to view any org's data
    override_org_id = request.headers.get("X-Admin-Org-Id")
    if override_org_id and row["role"] == Role.ADMIN:
        user_dict = {
            "user_id": str(user.id),
            "org_id": override_org_id,
            "_real_org_id": row["org_id"],
            "email": row["email"],
            "name": row["name"],
            "role": row["role"],
        }
        return user_dict

    return {
        "user_id": str(user.id),
        "org_id": row["org_id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
    }
```

The key points:
- Only `Role.ADMIN` can override — managers and users have the header silently ignored
- `_real_org_id` is preserved so downstream code can distinguish if needed
- When no header is sent, behavior is 100% unchanged

**Step 4: Fill in and run tests**

Run: `pytest tests/test_auth_org_override.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add api/auth.py tests/test_auth_org_override.py
git commit -m "feat(api): admin org override via X-Admin-Org-Id header"
```

---

## Task 2: Frontend — Add viewingOrgId to auth store

**Files:**
- Modify: `web/src/stores/auth-store.ts`
- Modify: `web/src/types/api.ts`

**Step 1: Add AdminOrgSummary type if missing**

Check `web/src/types/api.ts` — `AdminOrgSummary` should already exist. If not, add:

```typescript
export interface AdminOrgSummary {
  id: string;
  name: string;
  plan: string;
  analysis_quota: number;
  analysis_count: number;
  user_count: number;
  created_at: string;
}
```

**Step 2: Add viewingOrgId and viewingOrgName to auth store**

```typescript
// web/src/stores/auth-store.ts
interface AuthState {
  // ... existing fields ...
  viewingOrgId: string | null;   // null = viewing own org
  viewingOrgName: string | null;
  setViewingOrg: (orgId: string | null, orgName: string | null) => void;
  // ... existing methods ...
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ... existing state ...
      viewingOrgId: null,
      viewingOrgName: null,
      setViewingOrg: (orgId, orgName) => set({ viewingOrgId: orgId, viewingOrgName: orgName }),
      logout: () =>
        set({
          // ... existing clears ...
          viewingOrgId: null,
          viewingOrgName: null,
        }),
    }),
    { name: "pitchparse-auth" },
  ),
);
```

**Step 3: Commit**

```bash
cd web && git add src/stores/auth-store.ts src/types/api.ts
git commit -m "feat(web): add viewingOrgId to auth store for admin org switching"
```

---

## Task 3: Frontend — Send X-Admin-Org-Id header from API client

**Files:**
- Modify: `web/src/lib/api-client.ts`

**Step 1: Add the header injection in the existing beforeRequest hook**

In `api-client.ts`, find the `beforeRequest` hook that injects the auth token. Add the org override header in the same hook:

```typescript
hooks: {
  beforeRequest: [
    (request) => {
      const { accessToken, viewingOrgId } = useAuthStore.getState();
      if (accessToken) {
        request.headers.set("Authorization", `Bearer ${accessToken}`);
      }
      // Admin org override
      if (viewingOrgId) {
        request.headers.set("X-Admin-Org-Id", viewingOrgId);
      }
    },
  ],
  // ... existing afterResponse hooks ...
},
```

**Step 2: Verify type-check passes**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd web && git add src/lib/api-client.ts
git commit -m "feat(web): send X-Admin-Org-Id header when admin views another org"
```

---

## Task 4: Frontend — Invalidate all queries when org changes

**Files:**
- Modify: `web/src/stores/auth-store.ts` (or create a small hook)
- Create: `web/src/hooks/use-org-switch.ts`

**Step 1: Create the org switch hook**

When the admin switches orgs, all cached React Query data is stale and must be refetched.

```typescript
// web/src/hooks/use-org-switch.ts
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useCallback } from "react";

export function useOrgSwitch() {
  const queryClient = useQueryClient();
  const setViewingOrg = useAuthStore((s) => s.setViewingOrg);

  const switchOrg = useCallback(
    (orgId: string | null, orgName: string | null) => {
      setViewingOrg(orgId, orgName);
      // Invalidate all queries so they refetch with the new org header
      queryClient.invalidateQueries();
    },
    [queryClient, setViewingOrg],
  );

  return { switchOrg };
}
```

**Step 2: Verify type-check passes**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd web && git add src/hooks/use-org-switch.ts
git commit -m "feat(web): add useOrgSwitch hook to invalidate queries on org change"
```

---

## Task 5: Frontend — Org switcher dropdown component

**Files:**
- Create: `web/src/components/layout/org-switcher.tsx`
- Modify: `web/src/components/layout/sidebar.tsx`

**Step 1: Create the OrgSwitcher component**

```typescript
// web/src/components/layout/org-switcher.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgSwitch } from "@/hooks/use-org-switch";
import { getAdminOrgs } from "@/lib/api/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const role = useAuthStore((s) => s.role);
  const orgId = useAuthStore((s) => s.orgId);
  const viewingOrgId = useAuthStore((s) => s.viewingOrgId);
  const viewingOrgName = useAuthStore((s) => s.viewingOrgName);
  const { switchOrg } = useOrgSwitch();

  const { data: orgs } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: getAdminOrgs,
    enabled: role === "admin",
    staleTime: 5 * 60 * 1000, // 5 min — org list rarely changes
  });

  if (role !== "admin") return null;

  const currentValue = viewingOrgId ?? orgId ?? "";
  const currentLabel = viewingOrgId
    ? viewingOrgName ?? "Unknown"
    : "My Org";

  if (collapsed) {
    return (
      <div className="flex justify-center p-3 border-b border-sidebar-border">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
    );
  }

  return (
    <div className="border-b border-sidebar-border p-3">
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Viewing Org
      </label>
      <Select
        value={currentValue}
        onValueChange={(value) => {
          if (value === orgId) {
            switchOrg(null, null); // back to own org
          } else {
            const org = orgs?.find((o) => o.id === value);
            switchOrg(value, org?.name ?? null);
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs bg-sidebar border-sidebar-border">
          <SelectValue placeholder={currentLabel} />
        </SelectTrigger>
        <SelectContent>
          {orgs?.map((org) => (
            <SelectItem key={org.id} value={org.id} className="text-xs">
              {org.name}
              {org.id === orgId && " (yours)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 2: Add OrgSwitcher to the sidebar**

In `web/src/components/layout/sidebar.tsx`, import and render `OrgSwitcher` between the `Logo` and `NavLinks`:

```tsx
import { OrgSwitcher } from "./org-switcher";

// In AppSidebar component, after <Logo>:
<Logo collapsed={collapsed} />
<OrgSwitcher collapsed={collapsed} />
<NavLinks collapsed={collapsed} />

// In MobileSidebarTrigger's SheetContent, after <Logo>:
<Logo collapsed={false} />
<OrgSwitcher collapsed={false} />
<NavLinks collapsed={false} onNavigate={() => setOpen(false)} />
```

**Step 3: Verify build passes**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
cd web && git add src/components/layout/org-switcher.tsx src/components/layout/sidebar.tsx
git commit -m "feat(web): add admin org switcher dropdown in sidebar"
```

---

## Task 6: Frontend — Visual indicator when viewing another org

**Files:**
- Modify: `web/src/components/layout/topbar.tsx` (or wherever the top bar is)

**Step 1: Check the topbar location**

Read `web/src/components/layout/topbar.tsx` to find the right place for a banner.

**Step 2: Add an admin override banner**

When `viewingOrgId` is set and differs from the user's own `orgId`, show a subtle banner at the top:

```tsx
// Inside the topbar component
const viewingOrgId = useAuthStore((s) => s.viewingOrgId);
const viewingOrgName = useAuthStore((s) => s.viewingOrgName);
const orgId = useAuthStore((s) => s.orgId);
const { switchOrg } = useOrgSwitch();

// Render a banner when viewing another org
{viewingOrgId && viewingOrgId !== orgId && (
  <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary">
    <Building2 className="h-3 w-3" />
    <span>
      Viewing <span className="font-semibold">{viewingOrgName}</span>
    </span>
    <button
      onClick={() => switchOrg(null, null)}
      className="ml-1 underline hover:no-underline"
    >
      Exit
    </button>
  </div>
)}
```

**Step 3: Verify build passes**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: No errors

**Step 4: Commit**

```bash
cd web && git add src/components/layout/topbar.tsx
git commit -m "feat(web): show admin org override banner in topbar"
```

---

## Task 7: Frontend — Handle coach streaming with org override

**Files:**
- Modify: `web/src/lib/api/coach.ts`

**Step 1: Check `streamMessage` in coach.ts**

The coach streaming uses raw `fetch` instead of the ky client, so it won't pick up the `X-Admin-Org-Id` header automatically. Add it:

```typescript
// In streamMessage function, where headers are built:
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
};
const viewingOrgId = useAuthStore.getState().viewingOrgId;
if (viewingOrgId) {
  headers["X-Admin-Org-Id"] = viewingOrgId;
}
```

**Step 2: Commit**

```bash
cd web && git add src/lib/api/coach.ts
git commit -m "fix(web): include org override header in coach streaming requests"
```

---

## Task 8: Quality gates

**Files:** None (verification only)

**Step 1: Run backend quality gates**

```bash
ruff check api/ && ruff format --check api/ && mypy api/
```
Expected: No errors

**Step 2: Run frontend quality gates**

```bash
cd web && npm run lint && npm run format:check && npx tsc --noEmit && npm run build
```
Expected: No errors

**Step 3: Fix any issues found**

**Step 4: Final commit if fixes were needed**

```bash
git add -A && git commit -m "fix: quality gate fixes for admin org switcher"
```

---

## Summary of Changes

| Layer | File | Change |
|-------|------|--------|
| Backend | `api/auth.py` | Read `X-Admin-Org-Id` header, override `org_id` for admins |
| Backend | `tests/test_auth_org_override.py` | Test admin override, non-admin rejection |
| Frontend | `web/src/stores/auth-store.ts` | Add `viewingOrgId`, `viewingOrgName`, `setViewingOrg` |
| Frontend | `web/src/lib/api-client.ts` | Send `X-Admin-Org-Id` header when set |
| Frontend | `web/src/hooks/use-org-switch.ts` | Hook to switch org + invalidate all queries |
| Frontend | `web/src/components/layout/org-switcher.tsx` | Dropdown to pick org (admin only) |
| Frontend | `web/src/components/layout/sidebar.tsx` | Render OrgSwitcher in sidebar |
| Frontend | `web/src/components/layout/topbar.tsx` | Banner showing which org is being viewed |
| Frontend | `web/src/lib/api/coach.ts` | Add override header to streaming fetch |

**Zero changes needed to:** any route handler, any React Query hook, any page component. The override is transparent at the auth layer (backend) and HTTP client layer (frontend).
