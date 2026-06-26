---
name: e2e-tests
description: "Use this skill whenever you are asked to write, generate, improve, or review end-to-end (e2e) tests. Triggers include: 'write e2e tests', 'add end-to-end tests', 'test the user flow', 'test in the browser', 'write a Playwright test', 'write a Cypress test', 'test the full workflow', 'test from the user perspective', 'smoke tests', 'acceptance tests', or when the user needs to verify complete user journeys through a running application. Applies to any e2e framework (Playwright, Cypress, Selenium, Puppeteer, etc.). Also use when asked to test login flows, checkout flows, form submissions, navigation, or any multi-step user interaction."
---

# Writing Good End-to-End Tests

## Core Philosophy

An end-to-end test proves that a **complete user journey works** through the full, running application — browser, frontend, backend, database, and all. E2E tests are the closest thing to a real user clicking through your app.

The three properties that matter most:

1. **User-centricity** — the test mimics what a real user does; it interacts with the UI the way a human would
2. **Reliability** — the test produces the same result every run; flaky e2e tests destroy team trust
3. **Signal quality** — a failing test tells you which user journey is broken and where

E2E tests are expensive to write, slow to run, and hard to maintain. Write fewer of them, but make each one count. **Test critical user journeys, not every edge case.**

---

## Before Writing Tests

Understand the user journey before touching code:

- What is the **user goal**? (sign up, purchase an item, invite a teammate)
- What are the **steps** from start to finish? (navigate → fill form → submit → see confirmation)
- What **state** must exist before the journey? (test user account, seed products, feature flags)
- What are the **success criteria**? (confirmation page shown, email sent, database updated)
- What are the **critical failure modes**? (network error mid-checkout, session expiry, validation rejection)

Write the steps in plain language first. If you can't describe the journey in a sentence, the test scope is too broad.

---

## What Separates E2E Tests from Integration Tests

| Concern | Integration test | E2E test |
|---|---|---|
| Interface | API calls / service methods | Real browser / UI interactions |
| Frontend | Not involved | Fully rendered, JavaScript executing |
| User simulation | None | Clicks, types, navigates like a real user |
| Environment | Partial stack | Full stack running |
| Speed | Seconds | 10–60 seconds per test |
| Quantity | Dozens to hundreds | Tens (cover critical paths only) |
| Failure signal | "This API/service boundary is broken" | "This user journey is broken" |

---

## Test Structure: Seed / Navigate / Interact / Assert

E2E tests follow a four-phase structure:

```typescript
// Playwright
test("user can purchase a product", async ({ page }) => {
  // Seed — create test data via API (not UI)
  const user = await api.createUser({ name: "Alice", credits: 100 });
  const product = await api.createProduct({ name: "Widget", price: 25 });

  // Navigate — go to the starting point
  await page.goto("/products");

  // Interact — perform user actions
  await page.getByRole("link", { name: "Widget" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Cart" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();

  // Assert — verify the user sees the right outcome
  await expect(page.getByText("Order confirmed")).toBeVisible();
  await expect(page.getByText("Widget")).toBeVisible();
  await expect(page.getByText("$25.00")).toBeVisible();
});
```

**Key rule:** seed data through APIs or direct database access, never through the UI. UI-based setup is slow, fragile, and obscures the test's intent.

---

## Naming Tests

E2E test names describe the **user journey** in plain language.

**Pattern:** `<persona> can <accomplish goal>` or `<action> when <condition> results in <outcome>`

```
# Good
"new user can sign up and see the dashboard"
"customer can add items to cart and complete checkout"
"admin can disable a user account"
"login with expired session redirects to login page"
"checkout with insufficient funds shows payment error"

# Bad
"test checkout"
"test login flow"
"cart test 2"
```

---

## Selectors: Target What the User Sees

The most important rule for stable e2e tests: **select elements the way a user finds them** — by role, label, text, or explicit test IDs. Never select by CSS class, tag hierarchy, or DOM structure.

### Selector priority (best → worst)

1. **Role + accessible name** — `getByRole("button", { name: "Submit" })` ✅
2. **Label text** — `getByLabel("Email address")` ✅
3. **Visible text** — `getByText("Order confirmed")` ✅
4. **Placeholder** — `getByPlaceholder("Search...")` ⚠️ (acceptable)
5. **Test ID** — `getByTestId("checkout-btn")` ⚠️ (last resort for complex cases)
6. **CSS selector** — `page.locator(".btn-primary.xl")` ❌ (fragile)
7. **XPath** — `//div[3]/span[2]/button` ❌ (extremely fragile)

```typescript
// Good: survives redesigns, refactors, and CSS changes
await page.getByRole("button", { name: "Place order" }).click();
await page.getByLabel("Email address").fill("alice@example.com");

// Bad: breaks when any class name, DOM structure, or styling changes
await page.locator(".checkout-form > div:nth-child(3) > button.primary").click();
await page.locator("#email-input-v2").fill("alice@example.com");
```

This approach also validates your accessibility — if you can't select by role, your HTML semantics need fixing.

---

## Waiting: Never Use Fixed Timeouts

E2E tests run against real applications with real network latency, rendering, and async operations. **Never use `sleep()` or fixed timeouts.** Use built-in auto-waiting and explicit conditions.

```typescript
// Good: Playwright auto-waits for visibility
await expect(page.getByText("Order confirmed")).toBeVisible();

// Good: explicit wait for network-dependent state
await page.waitForResponse(resp =>
  resp.url().includes("/api/orders") && resp.status() === 201
);

// Good: wait for navigation
await page.waitForURL("**/dashboard");

// Bad: arbitrary sleep
await page.waitForTimeout(3000);  // NEVER do this
```

```javascript
// Cypress — built-in retry and wait
cy.findByText("Order confirmed").should("be.visible");
cy.url().should("include", "/dashboard");

// Bad
cy.wait(5000);
```

If you find yourself needing `sleep()`, the test or the application has a synchronization problem. Fix it at the root.

---

## Authentication: Fast Setup, Real Verification

Login is a prerequisite, not the thing being tested (unless you're explicitly testing the login flow). Don't log in through the UI for every test.

### Playwright: use `storageState` for session reuse

```typescript
// auth.setup.ts — runs once before all tests
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("testuser@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");

  // Save signed-in state
  await page.context().storageState({ path: ".auth/user.json" });
});

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "tests",
      dependencies: ["setup"],
      use: { storageState: ".auth/user.json" },
    },
  ],
});
```

### Cypress: use API login + cookie injection

```javascript
Cypress.Commands.add("login", (email, password) => {
  cy.request("POST", "/api/auth/login", { email, password }).then((resp) => {
    window.localStorage.setItem("token", resp.body.token);
  });
});

// In tests
beforeEach(() => {
  cy.login("testuser@example.com", "password123");
});
```

### Test the login flow itself separately

```typescript
test("user can log in with valid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("alice@example.com");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.getByText("Welcome, Alice")).toBeVisible();
});

test("login with wrong password shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("alice@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/.*login/);
});
```

---

## Page Object Model: When and How

For applications with repeated UI patterns, use the Page Object Model (POM) to encapsulate page interactions. This reduces duplication and makes tests resilient to UI changes.

### When to use POM

- Multiple tests interact with the same page/component
- The page has complex interactions (multi-step forms, modals, tables)
- You want to change selectors in one place when the UI changes

### When to skip POM

- Simple one-off tests
- The test only visits a page once
- Over-abstraction would hurt readability

```typescript
// pages/checkout.page.ts
export class CheckoutPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/checkout");
  }

  async fillShipping(address: { street: string; city: string; zip: string }) {
    await this.page.getByLabel("Street").fill(address.street);
    await this.page.getByLabel("City").fill(address.city);
    await this.page.getByLabel("ZIP code").fill(address.zip);
  }

  async selectPaymentMethod(method: string) {
    await this.page.getByLabel("Payment method").selectOption(method);
  }

  async placeOrder() {
    await this.page.getByRole("button", { name: "Place order" }).click();
  }

  async expectConfirmation() {
    await expect(this.page.getByText("Order confirmed")).toBeVisible();
  }
}

// tests/checkout.spec.ts
test("customer can complete checkout", async ({ page }) => {
  const checkout = new CheckoutPage(page);
  await checkout.goto();
  await checkout.fillShipping({ street: "123 Main", city: "Springfield", zip: "62704" });
  await checkout.selectPaymentMethod("credit_card");
  await checkout.placeOrder();
  await checkout.expectConfirmation();
});
```

Keep page objects thin — they encapsulate **selectors and interactions**, not assertions or test logic.

---

## Test Data Management

### Seed via API, not UI

```typescript
// Good: fast, reliable, explicit
const user = await api.post("/test/seed/user", { name: "Alice", plan: "premium" });

// Bad: slow, fragile, tests the signup flow as a side effect
await page.goto("/signup");
await page.getByLabel("Name").fill("Alice");
// ... 10 more steps ...
```

### Use a test seed API or database reset

Provide a backend endpoint (protected, test-environment only) that creates or resets test data:

```
POST /test/seed    — create test scenario
POST /test/reset   — wipe and re-seed database
```

### Isolate test data

Each test should create unique data (unique emails, unique names) to avoid collisions in parallel runs:

```typescript
const email = `alice-${Date.now()}@test.example.com`;
```

---

## Network Interception

Use network interception to test error states, loading states, and edge cases that are hard to reproduce against a real backend:

```typescript
// Playwright: simulate server error on checkout
test("shows error when payment API fails", async ({ page }) => {
  await page.route("**/api/payments", (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ error: "Server error" }) })
  );

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(page.getByText("Payment failed")).toBeVisible();
});

// Simulate slow response
test("shows loading spinner during checkout", async ({ page }) => {
  await page.route("**/api/payments", async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(page.getByRole("progressbar")).toBeVisible();
});
```

```javascript
// Cypress
cy.intercept("POST", "/api/payments", { statusCode: 500 }).as("paymentFail");
cy.get("[data-testid=pay-btn]").click();
cy.wait("@paymentFail");
cy.findByText("Payment failed").should("be.visible");
```

Use interception sparingly — the default should be real network requests.

---

## Visual Regression Testing

For UI-heavy applications, combine functional e2e tests with visual snapshots:

```typescript
// Playwright visual comparison
test("dashboard renders correctly", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Welcome")).toBeVisible();

  await expect(page).toHaveScreenshot("dashboard.png", {
    maxDiffPixelRatio: 0.01,
  });
});
```

- Capture screenshots **after the page is stable** (data loaded, animations complete)
- Use `maxDiffPixelRatio` or `threshold` to tolerate sub-pixel rendering differences
- Store baseline screenshots in version control
- Review visual diffs in CI like you review code diffs

---

## Cross-Browser and Mobile Testing

Configure your test runner to cover the browsers and viewports your users actually use:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
```

Don't test every flow on every browser. Run critical paths (login, checkout, signup) across all targets; run the rest on your primary browser only.

---

## Debugging Failing Tests

### Use traces and screenshots

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: "on-first-retry",    // capture trace on failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
```

### Use `page.pause()` for interactive debugging

```typescript
test("debug this flow", async ({ page }) => {
  await page.goto("/checkout");
  await page.pause();  // opens Playwright Inspector — step through interactively
});
```

### Check the test report

```bash
# Playwright
npx playwright show-report

# Cypress
npx cypress open  # interactive runner with time-travel debugging
```

---

## CI Configuration

### Run e2e tests in CI with proper setup

```yaml
# GitHub Actions — Playwright
- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Start application
  run: npm run start:test &
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

- name: Wait for app
  run: npx wait-on http://localhost:3000 --timeout 30000

- name: Run e2e tests
  run: npx playwright test

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

### Parallelize in CI

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 2 : 0,
});
```

Use retries cautiously — retries mask flakiness. If a test needs retries to pass, it has a reliability problem that should be fixed.

---

## How Many E2E Tests to Write

E2E tests sit at the top of the testing pyramid. Write **fewer but more impactful** tests:

- **Critical user journeys** — signup, login, core workflow, checkout, payment ✅
- **Revenue-critical paths** — anything where a bug costs money ✅
- **Smoke tests** — basic "is the app alive" checks ✅
- **Every edge case** — ❌ (cover these in unit/integration tests)
- **Every form validation** — ❌ (cover in unit tests)
- **Every UI variant** — ❌ (cover in component tests)

A healthy ratio: for every 1 e2e test, you should have ~10 integration tests and ~100 unit tests.

---

## Common Anti-Patterns to Avoid

| Anti-pattern | Problem | Fix |
|---|---|---|
| Selecting by CSS class/XPath | Breaks on every redesign | Use roles, labels, text, test IDs |
| `sleep()` / fixed timeouts | Slow and flaky | Use auto-waiting and explicit conditions |
| Login via UI for every test | Wastes 5–10s per test | Use API login + session reuse |
| Seed data via UI | Slow and fragile | Use API or database seeding |
| Testing every permutation | Slow suite, diminishing returns | Test critical journeys only |
| No test isolation | Tests depend on each other's state | Each test sets up and tears down its own data |
| Ignoring flaky tests | Erodes team trust in the suite | Fix root cause or delete the test |
| Asserting on DOM structure | Fragile, breaks on refactor | Assert on visible text and user-facing state |
| No CI artifacts | Can't debug failures after the fact | Capture traces, screenshots, and video |
| Running e2e tests on every commit | Slow feedback loop | Run on PR/merge, not every push; use unit tests for fast feedback |

---

## Output Checklist

Before finishing an e2e test file, verify:

- [ ] Each test covers one complete user journey from start to finish
- [ ] Test data is seeded via API/database, not through UI interactions
- [ ] Selectors use roles, labels, and text — no CSS classes or XPath
- [ ] No `sleep()` or fixed timeouts — all waits are condition-based
- [ ] Authentication uses session reuse (storageState / cookie injection), not UI login per test
- [ ] Tests are independent — no shared mutable state, no execution order dependency
- [ ] Failure modes tested via network interception (500s, timeouts, validation errors)
- [ ] Test names describe the user journey in plain language
- [ ] CI is configured with proper setup, artifact capture, and parallelization
- [ ] Test count is proportional — only critical paths, not every edge case
- [ ] Each test runs in under 30 seconds
- [ ] Suite is not flaky — if it is, fix or remove the flaky test before adding more
