---
name: integration-tests
description: "Use this skill whenever you are asked to write, generate, improve, or review integration tests. Triggers include: 'write integration tests', 'test the API', 'test database interactions', 'test service layer', 'test components together', 'test the endpoint', 'test the workflow', 'test with a real database', or when the user needs to verify that multiple modules, services, or layers work together correctly. Applies to any language or framework (pytest, Jest, Vitest, supertest, Go test, Spring Boot Test, etc.). Also use when asked to test API routes, database queries, message queues, or service-to-service interactions."
---

# Writing Good Integration Tests

## Core Philosophy

An integration test verifies that **multiple components work correctly together** — that the wiring between modules, services, databases, and APIs produces the right behavior. Where unit tests prove a function works in isolation, integration tests prove the system holds together at its seams.

The three properties that matter most:

1. **Realism** — the test exercises real interactions between real components, not just mocks talking to mocks
2. **Determinism** — the test produces the same result every time regardless of environment timing or external state
3. **Specificity** — when the test fails, you can tell *which integration boundary* broke

---

## Before Writing Tests

Read the code and architecture, then answer these questions:

- What are the **integration boundaries**? (service ↔ database, API ↔ service, service ↔ message queue, module ↔ module)
- What **data flows** across those boundaries? (request/response shapes, database rows, queue messages)
- What are the **failure modes at each boundary**? (connection refused, timeout, constraint violation, serialization error)
- What **state** must exist before the test? (seed data, schema, running services)
- What **side effects** does the operation produce? (rows inserted, events emitted, files written)

Map the boundaries first. Each boundary is a test target.

---

## What Separates Integration Tests from Unit Tests

| Concern | Unit test | Integration test |
|---|---|---|
| Scope | Single function/class | Multiple components working together |
| Dependencies | Mocked/stubbed | Real (or realistic fakes like testcontainers) |
| Database | Never touched | Real database, real queries |
| Network | Never touched | Real HTTP calls to test server |
| Speed | Milliseconds | Seconds (acceptable) |
| Failure signal | "This function is broken" | "These components don't work together" |

If you're mocking every dependency, you're writing a unit test. If nothing is real, you're testing glue code with no glue.

---

## Test Structure: Setup / Execute / Verify / Teardown

Integration tests need heavier setup and explicit cleanup compared to unit tests:

```python
def test_create_order_persists_to_database(db_session):
    # Setup — seed required state
    user = create_user(db_session, name="Alice")
    product = create_product(db_session, name="Widget", price=25.00)

    # Execute — call through the real service layer
    order = order_service.create_order(
        db_session, user_id=user.id, items=[{"product_id": product.id, "qty": 2}]
    )

    # Verify — check the real database state
    saved = db_session.query(Order).filter_by(id=order.id).one()
    assert saved.total == 50.00
    assert saved.user_id == user.id
    assert len(saved.line_items) == 2

    # Teardown — handled by fixture (transaction rollback)
```

The key difference from unit tests: **verify the side effects in the real dependency**, not just the return value.

---

## Naming Tests

Integration test names should communicate the **workflow** and the **integration boundary** being tested.

**Pattern:** `test_<operation>_<through_what>_<expected_outcome>`

```
# Good
test_create_user_via_api_persists_to_database
test_submit_payment_through_stripe_gateway_returns_confirmation
test_publish_event_to_queue_triggers_consumer_handler
test_login_with_expired_token_returns_401

# Bad
test_api
test_database
test_payment_works
```

---

## Database Integration Tests

### Use transactions for isolation

Wrap each test in a transaction and roll back at the end. This is fast and guarantees no leaked state.

```python
# pytest fixture — transaction-per-test
@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

### Use factories, not raw SQL

Build test data with factories or builder functions that express intent:

```python
# Good: clear intent
user = create_user(db, name="Alice", role="admin")

# Bad: opaque SQL
db.execute("INSERT INTO users (name, role) VALUES ('Alice', 'admin')")
```

### Test real queries

The whole point is to catch query bugs, ORM misconfigurations, and schema mismatches:

```python
def test_find_active_users_excludes_deactivated(db_session):
    active = create_user(db_session, active=True)
    inactive = create_user(db_session, active=False)

    result = user_repo.find_active(db_session)

    assert active in result
    assert inactive not in result
```

### Test constraints and migrations

Verify that database constraints actually enforce your rules:

```python
def test_duplicate_email_raises_integrity_error(db_session):
    create_user(db_session, email="alice@example.com")

    with pytest.raises(IntegrityError):
        create_user(db_session, email="alice@example.com")
```

---

## API / HTTP Integration Tests

### Use a test client, not mocks

Spin up the real application and make real HTTP requests to it:

```python
# Python / FastAPI
def test_get_user_returns_profile(client, db_session):
    user = create_user(db_session, name="Alice")

    response = client.get(f"/api/users/{user.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Alice"
```

```typescript
// Node / supertest
describe("POST /api/orders", () => {
  it("creates an order and returns 201", async () => {
    const user = await createUser({ name: "Alice" });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ items: [{ productId: 1, qty: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(50);

    // Verify side effect in database
    const order = await db.orders.findById(res.body.id);
    expect(order).toBeDefined();
  });
});
```

```go
// Go / httptest
func TestGetUser(t *testing.T) {
    db := setupTestDB(t)
    user := createUser(t, db, "Alice")
    srv := httptest.NewServer(newRouter(db))
    defer srv.Close()

    resp, err := http.Get(srv.URL + "/api/users/" + user.ID)
    if err != nil {
        t.Fatal(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("got status %d, want 200", resp.StatusCode)
    }

    var body map[string]string
    json.NewDecoder(resp.Body).Decode(&body)
    if body["name"] != "Alice" {
        t.Errorf("got name %q, want Alice", body["name"])
    }
}
```

### Test the full request/response cycle

- **Request**: method, path, headers, auth, body serialization
- **Response**: status code, body shape, headers (Content-Type, caching)
- **Side effects**: database writes, events published, emails queued

### Test authentication and authorization

```python
def test_unauthenticated_request_returns_401(client):
    response = client.get("/api/orders")
    assert response.status_code == 401

def test_user_cannot_access_other_users_orders(client, db_session):
    alice = create_user(db_session, name="Alice")
    bob = create_user(db_session, name="Bob")
    order = create_order(db_session, user=bob)

    response = client.get(
        f"/api/orders/{order.id}",
        headers=auth_headers(alice),
    )
    assert response.status_code == 403
```

### Test error responses

Verify that error responses have correct status codes **and** useful error bodies:

```python
def test_create_order_with_invalid_product_returns_422(client, db_session):
    user = create_user(db_session)

    response = client.post(
        "/api/orders",
        json={"items": [{"product_id": 99999, "qty": 1}]},
        headers=auth_headers(user),
    )

    assert response.status_code == 422
    assert "product" in response.json()["detail"].lower()
```

---

## Service-to-Service Integration Tests

### Use testcontainers or docker-compose for external services

When your code integrates with Redis, Postgres, RabbitMQ, S3, etc., use real instances:

```python
# Python with testcontainers
@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16") as pg:
        yield pg.get_connection_url()

@pytest.fixture(scope="session")
def redis():
    with RedisContainer("redis:7") as r:
        yield r.get_connection_url()
```

```typescript
// Node with testcontainers
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
});

afterAll(async () => {
  await container.stop();
});
```

```go
// Go with testcontainers
func TestWithPostgres(t *testing.T) {
    ctx := context.Background()
    pg, err := postgres.Run(ctx, "postgres:16",
        postgres.WithDatabase("testdb"),
    )
    if err != nil {
        t.Fatal(err)
    }
    defer pg.Terminate(ctx)

    connStr, _ := pg.ConnectionString(ctx, "sslmode=disable")
    // use connStr for your tests
}
```

### Only fake what you can't run

| Dependency | Approach |
|---|---|
| Your own database | Real instance (testcontainers or test DB) |
| Your own services | Real instance or in-process |
| Third-party APIs (Stripe, Twilio) | Fake/stub server or recorded responses |
| Time | Inject a clock; freeze in tests |
| Filesystem | Temp directories |

Never mock your own database in an integration test — that defeats the purpose.

---

## Message Queue / Event Integration Tests

Test that events are published, consumed, and produce the right side effects:

```python
def test_order_created_event_triggers_inventory_update(db_session, event_bus):
    product = create_product(db_session, stock=10)

    # Act — create order, which should emit an event
    order_service.create_order(db_session, items=[{"product_id": product.id, "qty": 3}])

    # Give the consumer time to process (use polling, not sleep)
    wait_until(lambda: get_stock(db_session, product.id) == 7, timeout=5)

    assert get_stock(db_session, product.id) == 7
```

### Avoid `sleep()`; use polling

Never use a fixed `sleep()` to wait for async operations. Use a polling helper with a timeout:

```python
import time

def wait_until(predicate, timeout=5, interval=0.1):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(interval)
    raise TimeoutError(f"Condition not met within {timeout}s")
```

---

## Test Data Management

### Principle: every test creates what it needs

Do not rely on shared seed data that "should" exist. Shared fixtures become invisible dependencies that break tests mysteriously.

```python
# Bad: assumes user ID 1 exists from seed data
def test_get_user(client):
    response = client.get("/api/users/1")  # who is user 1?

# Good: creates its own user
def test_get_user(client, db_session):
    user = create_user(db_session, name="Alice")
    response = client.get(f"/api/users/{user.id}")
```

### Use fixture scoping wisely

| Scope | Use for |
|---|---|
| **function** (default) | Mutable state — database rows, files |
| **session** | Expensive immutable infrastructure — containers, schema creation |
| **module** | Shared read-only reference data within a module |

Never share mutable fixtures across tests.

---

## Test Isolation

Integration tests are harder to isolate than unit tests. Follow these rules:

1. **Database**: use transaction rollback per test, or truncate tables in teardown
2. **Files**: use `tmp_path` / `t.TempDir()` / OS temp directories
3. **Ports**: use dynamic port allocation (port 0), never hardcode ports
4. **Environment variables**: save and restore, or use a test-scoped override
5. **Time**: inject a clock; never depend on wall-clock time for assertions
6. **External state**: if a test writes to Redis/S3/queue, clean up in teardown

If tests pass alone but fail together, check for leaked database rows, cached connections, or global state mutations.

---

## Performance Considerations

Integration tests are slower than unit tests. Keep them fast enough to run on every push:

- **Reuse containers** across the test session (session-scoped fixtures)
- **Reuse database schemas** — create once, roll back per test
- **Parallelize** — use pytest-xdist, Go's `t.Parallel()`, or Jest's `--workers`
- **Don't test what unit tests already cover** — integration tests verify *wiring*, not every edge case
- Target: **individual integration test < 5 seconds**, **full suite < 5 minutes**

---

## Common Anti-Patterns to Avoid

| Anti-pattern | Problem | Fix |
|---|---|---|
| Mocking the database | Defeats the purpose of integration testing | Use a real test database |
| Shared mutable seed data | Tests depend on invisible state, break randomly | Each test creates its own data |
| Fixed `sleep()` waits | Slow and flaky | Use polling with timeout |
| Hardcoded ports | Parallel runs collide | Use dynamic port allocation |
| Testing every edge case | Slow suite, duplicates unit test coverage | Test wiring and boundaries, not every permutation |
| No cleanup/teardown | Leaked state breaks subsequent tests | Use transaction rollback or truncation |
| Asserting only status code | Misses broken response bodies, missing side effects | Assert status + body + side effects |
| Giant test that tests everything | Impossible to diagnose failures | One workflow per test |
| Testing against production | Dangerous and flaky | Use isolated test instances |

---

## Output Checklist

Before finishing an integration test file, verify:

- [ ] Each integration boundary has at least one test (DB, API, queue, etc.)
- [ ] Tests use real dependencies, not mocks of things you own
- [ ] Happy path workflow tested end-to-end through the integration
- [ ] Error/failure cases tested at each boundary (connection failure, bad input, constraint violation)
- [ ] Auth/authz tested (401, 403 for protected endpoints)
- [ ] Side effects verified in the real dependency (check the DB, check the queue)
- [ ] Each test creates its own data — no reliance on shared seed data
- [ ] Teardown/rollback ensures no leaked state between tests
- [ ] No `sleep()` — async waits use polling with timeout
- [ ] No hardcoded ports, paths, or environment-specific values
- [ ] Test names describe the workflow and boundary being tested
- [ ] Suite runs in under 5 minutes
