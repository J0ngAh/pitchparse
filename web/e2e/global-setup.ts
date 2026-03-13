/**
 * Global setup: creates a test user via the Supabase admin API (bypasses email rate limits),
 * then logs in via the app UI to get a valid session. Saves auth state for all tests.
 */
import { chromium, type FullConfig } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth-state.json");

const TEST_EMAIL = `e2e-${Date.now()}@test.pitchparse.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "E2E Tester";
const TEST_ORG = "E2E Test Org";

async function globalSetup(config: FullConfig) {
  const apiBase = "http://localhost:8000";
  const { baseURL } = config.projects[0].use;

  // Step 1: Create user via API signup endpoint
  // We use the API directly to avoid browser overhead
  const signupResp = await fetch(`${apiBase}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
      org_name: TEST_ORG,
    }),
  });

  if (!signupResp.ok) {
    // On any signup failure (rate limit, invalid email, etc.), fall back to login
    console.log(`Signup failed (${signupResp.status}) — attempting login with fallback user`);
    return await setupViaLogin(config, baseURL!);
  }

  const authData = await signupResp.json();
  console.log(`Global setup: created user ${TEST_EMAIL}`);

  // Step 2: Inject auth into browser and save storage state
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: baseURL! });
  const page = await context.newPage();

  await page.goto("/login");
  await page.evaluate(
    (auth) => {
      localStorage.setItem(
        "pitchparse-auth",
        JSON.stringify({
          state: {
            accessToken: auth.access_token,
            userId: auth.user_id,
            orgId: auth.org_id,
            email: auth.email,
            isAuthenticated: true,
          },
          version: 0,
        })
      );
    },
    authData
  );

  // Navigate to dashboard to verify auth works
  await page.goto("/");
  try {
    await page.waitForLoadState("networkidle");
    // Check we're not redirected to login
    const url = page.url();
    if (url.includes("/login") || url.includes("/signup")) {
      throw new Error(`Auth injection failed — redirected to ${url}`);
    }
  } catch (e) {
    await page.screenshot({ path: path.join(__dirname, "setup-failure.png") });
    throw e;
  }

  await context.storageState({ path: AUTH_FILE });
  console.log("Global setup: auth state saved");

  await browser.close();
}

/**
 * Fallback: try to log in with a known test user via the API directly.
 * Creates auth state from API response.
 */
async function setupViaLogin(config: FullConfig, baseURL: string) {
  // Try a set of known test emails
  const fallbackEmails = [
    "e2e-persistent@test.pitchparse.com",
  ];

  // First try to create a persistent user (may fail if already exists)
  const persistEmail = fallbackEmails[0];
  await fetch("http://localhost:8000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: persistEmail,
      password: TEST_PASSWORD,
      name: TEST_NAME,
      org_name: TEST_ORG,
    }),
  }).catch(() => null);

  // Try logging in
  const loginResp = await fetch("http://localhost:8000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: persistEmail,
      password: TEST_PASSWORD,
    }),
  });

  if (!loginResp.ok) {
    const errText = await loginResp.text();
    throw new Error(
      `Global setup: both signup and login failed. ` +
      `Signup may be rate-limited by Supabase. Wait a few minutes and retry.\n` +
      `Login error: ${loginResp.status} ${errText}`
    );
  }

  const authData = await loginResp.json();
  console.log(`Global setup: logged in as ${persistEmail}`);

  // Inject into browser
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto("/login");
  await page.evaluate(
    (auth) => {
      localStorage.setItem(
        "pitchparse-auth",
        JSON.stringify({
          state: {
            accessToken: auth.access_token,
            userId: auth.user_id,
            orgId: auth.org_id,
            email: auth.email,
            isAuthenticated: true,
          },
          version: 0,
        })
      );
    },
    authData
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await context.storageState({ path: AUTH_FILE });
  console.log("Global setup: auth state saved (via login)");

  await browser.close();
}

export default globalSetup;
export { AUTH_FILE, TEST_EMAIL, TEST_PASSWORD };
