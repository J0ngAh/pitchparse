import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/auth-store";

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      accessToken: null,
      userId: null,
      orgId: null,
      email: null,
      role: null,
      isAuthenticated: false,
    });
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.orgId).toBeNull();
    expect(state.email).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("setAuth sets all fields and isAuthenticated becomes true", () => {
    useAuthStore.getState().setAuth({
      access_token: "tok_abc123",
      user_id: "user_001",
      org_id: "org_001",
      email: "rep@company.com",
      role: "user",
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("tok_abc123");
    expect(state.userId).toBe("user_001");
    expect(state.orgId).toBe("org_001");
    expect(state.email).toBe("rep@company.com");
    expect(state.role).toBe("user");
    expect(state.isAuthenticated).toBe(true);
  });

  it("logout clears back to initial state", () => {
    // First set auth
    useAuthStore.getState().setAuth({
      access_token: "tok_abc123",
      user_id: "user_001",
      org_id: "org_001",
      email: "rep@company.com",
      role: "user",
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Then logout
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.orgId).toBeNull();
    expect(state.email).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("uses pitchparse-auth as persist key", () => {
    // The persist middleware config name is set in the store definition.
    // We verify by checking the store's persist API exposes the correct name.
    const persistApi = useAuthStore.persist;
    expect(persistApi.getOptions().name).toBe("pitchparse-auth");
  });
});
