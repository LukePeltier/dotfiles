---
name: unit-tests
description: "Use this skill whenever you are asked to write, generate, improve, or review unit tests. Triggers include: 'write tests for this', 'add unit tests', 'test coverage', 'test this function/class/module', 'write a test suite', 'fix failing tests', 'improve tests', or when producing code files that should have accompanying tests. Applies to any language or framework (pytest, Jest, Vitest, Go test, JUnit, RSpec, etc.). Also use when asked to review existing tests for quality issues."
---

# Writing Good Unit Tests

## Core Philosophy

A unit test has one job: prove that a specific unit of behavior works correctly, and catch it the moment it breaks. Good tests are **fast to run, easy to read, and hard to accidentally break for the wrong reasons**.

The three properties that matter most:

1. **Correctness** — the test actually verifies what it claims to
2. **Clarity** — a failing test immediately tells you *what* broke and *why*
3. **Stability** — the test only fails when the code it covers is broken

---

## Before Writing Tests

Read the source code and answer these questions:

- What is the contract of this unit? (inputs → outputs, side effects, error cases)
- What are the *boundaries*? (empty inputs, zero, nulls, max values, off-by-one edges)
- What are the *failure modes*? (invalid input, external dependency failure, concurrent access)
- Does the code have hidden dependencies that need to be isolated?

Do not start writing tests until you can enumerate the behavioral cases. Missing cases produce false confidence.

---

## Test Structure: Arrange / Act / Assert

Every test should follow this structure, with a blank line between each phase:

```python
def test_calculate_discount_for_premium_user():
    # Arrange
    user = User(tier="premium")
    cart = Cart(items=[Item(price=100)])

    # Act
    discounted = calculate_discount(user, cart)

    # Assert
    assert discounted == 80
```

Never merge phases. If your "Arrange" and "Assert" are tangled, the test is testing too much.

---

## Naming Tests

Test names are failure messages. Name them so a failing test tells you exactly what broke without reading the body.

**Pattern:** `test_<unit>_<condition>_<expected_outcome>`

```
# Good
test_parse_date_with_invalid_format_raises_value_error
test_apply_coupon_when_expired_returns_original_price
test_user_is_admin_when_role_is_superuser

# Bad
test_parse_date_2
test_coupon
test_user
```

For parametrized tests, include the varying parameter in the ID, not just the index.

---

## What to Test

### Always test

- **Happy path**: the main intended use case with valid inputs
- **Edge cases**: empty collections, zero, negative numbers, single-element inputs, boundary values
- **Error/exception paths**: invalid input, precondition violations, resource failures
- **Contract**: if a function documents a return value or raises a specific exception, test it directly

### Test one thing per test

Each test should have a single `assert` (or multiple asserts for the *same* behavior). If you're asserting unrelated things, split the test.

```python
# Bad: two separate behaviors in one test
def test_order():
    order = create_order(items=[...])
    assert order.total == 42        # behavior 1
    assert order.status == "pending"  # behavior 2 (unrelated)

# Good
def test_order_total_is_sum_of_items(): ...
def test_new_order_status_is_pending(): ...
```

### Do not test implementation details

Test the public API / observable behavior. Do not assert on private methods, internal state, or how many times an internal helper was called (unless testing a side effect that's part of the contract).

```python
# Bad: tests internal state
assert user._password_hash == "abc123"

# Good: tests observable behavior
assert user.check_password("correct") is True
assert user.check_password("wrong") is False
```

---

## Mocking and Dependencies

Isolate the unit under test from its dependencies. Only mock what you own or what causes test instability (network, filesystem, time, randomness, databases).

### Mock at the boundary

Mock the dependency at the point it's *injected* or *called*, not deep inside the implementation.

```python
# Good: patch at the call site
@patch("myapp.email.send_email")
def test_register_sends_welcome_email(mock_send):
    register_user("alice@example.com")
    mock_send.assert_called_once_with(
        to="alice@example.com",
        subject="Welcome"
    )
```

### Don't over-mock

If you find yourself mocking 5+ things to test one function, the function has too many dependencies. Note this in a comment; don't paper over it with mocks.

### Test doubles: choose the right type

| Type | Use when |
|------|----------|
| **Stub** | You need a dependency to return a value |
| **Mock** | You need to assert a dependency was called correctly |
| **Fake** | You need a lightweight working implementation (in-memory DB) |
| **Spy** | You want real behavior but also want to observe calls |

Don't use a Mock when a Stub suffices. Mocks that assert call counts on internal helpers make tests brittle.

---

## Parametrize to Cover Cases Without Repetition

When the same behavior should hold for multiple inputs, parametrize instead of copy-pasting:

```python
# Python / pytest
@pytest.mark.parametrize("input,expected", [
    ("hello",  "HELLO"),
    ("",       ""),
    ("123",    "123"),
    ("café",   "CAFÉ"),
])
def test_to_uppercase(input, expected):
    assert to_uppercase(input) == expected
```

```javascript
// Jest
test.each([
  ["hello",  "HELLO"],
  ["",       ""],
  ["café",   "CAFÉ"],
])("to_uppercase(%s) returns %s", (input, expected) => {
  expect(toUppercase(input)).toBe(expected);
});
```

---

## Assertion Quality

Use the most specific assertion available. Vague assertions hide bugs.

```python
# Bad: passes for any truthy return value
assert result

# Good: catches wrong values
assert result == {"status": "ok", "count": 3}

# Bad: hides the actual vs expected in failure output
assert len(items) > 0

# Good: tells you what was actually in the list on failure
assert items == [expected_item]
```

For exceptions, always assert the message or type specifically:

```python
with pytest.raises(ValueError, match="must be positive"):
    calculate_area(-1)
```

---

## Test Isolation

Every test must be independent. Tests must not share mutable state, depend on execution order, or leave side effects.

- **Reset** any global state in `setUp`/`tearDown` or fixtures
- **Never** rely on another test having run first
- **Never** write to a shared file or database row without cleanup
- Use **temporary directories/files** for filesystem tests (pytest's `tmp_path`, Go's `t.TempDir()`, etc.)

If tests pass individually but fail when run together, you have isolation violations.

---

## Test Coverage: What It Means and Doesn't

100% line coverage is not the goal. Coverage is a floor, not a ceiling.

- **Covered lines** = lines that executed; not lines that were *correctly* tested
- Missing coverage is always a problem; full coverage is not a guarantee
- Prioritize covering **branches** (if/else, switch cases) over just lines
- Write tests for *behaviors*, then check coverage to find gaps

Flag any untested error paths with a comment rather than leaving them silently uncovered.

---

## Common Anti-Patterns to Avoid

| Anti-pattern | Problem | Fix |
|---|---|---|
| Testing the mock | Asserting the stub returns what you told it to | Test real behavior |
| God test | One test covers 10 behaviors | Split by behavior |
| Mystery guest | Test depends on external fixture with no local context | Make setup explicit |
| Fragile test | Breaks when unrelated code changes | Only test the public contract |
| Tautological test | `assert add(2,2) == add(2,2)` | Assert against a literal expected value |
| Ignored flaky test | `@skip` or `xit` left indefinitely | Fix the root cause or delete the test |
| No assertion | Test runs without asserting anything | Always assert |

---

## Language-Specific Quick Reference

### Python (pytest)

```python
# Fixtures for reusable setup
@pytest.fixture
def db_session():
    session = create_test_session()
    yield session
    session.rollback()

# Parametrize
@pytest.mark.parametrize("x,y,expected", [(1,2,3),(0,0,0),(-1,1,0)])
def test_add(x, y, expected):
    assert add(x, y) == expected

# Exception with message
with pytest.raises(ValueError, match="non-negative"):
    sqrt(-1)

# Approx for floats
assert result == pytest.approx(3.14, rel=1e-3)
```

### JavaScript / TypeScript (Jest / Vitest)

```typescript
describe("calculateDiscount", () => {
  it("returns 20% off for premium users", () => {
    expect(calculateDiscount("premium", 100)).toBe(80);
  });

  it("throws for negative price", () => {
    expect(() => calculateDiscount("premium", -1)).toThrow("Price must be positive");
  });
});

// Mock a module
jest.mock("../emailService");
const sendEmail = emailService.send as jest.MockedFunction<typeof emailService.send>;
sendEmail.mockResolvedValue({ success: true });
```

### Go

```go
func TestDivide(t *testing.T) {
    tests := []struct {
        name    string
        a, b    float64
        want    float64
        wantErr bool
    }{
        {"normal", 10, 2, 5, false},
        {"zero denominator", 10, 0, 0, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Divide(tt.a, tt.b)
            if (err != nil) != tt.wantErr {
                t.Errorf("unexpected error: %v", err)
            }
            if got != tt.want {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

---

## Output Checklist

Before finishing a test file, verify:

- [ ] Every public function/method has at least one test
- [ ] Happy path covered
- [ ] At least one edge case per function (empty, zero, boundary)
- [ ] Error/exception paths covered with specific assertions
- [ ] No test depends on another test
- [ ] No hardcoded paths, network calls, or sleep() calls
- [ ] Test names clearly describe what's being tested and expected outcome
- [ ] Mocks are cleaned up or scoped to the test
- [ ] Asserts use specific expected values, not just truthy checks
