export class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertAlmostEqual(a, b, epsilon = 0.001, message) {
    if (Math.abs(a - b) > epsilon) {
      throw new Error(`Assertion failed: Expected ${a} to be close to ${b}. ${message || ''}`);
    }
  }

  async runAll() {
    console.log(`Running ${this.tests.length} tests...`);
    const container = document.getElementById('test-results') || document.body;
    
    for (const t of this.tests) {
      const div = document.createElement('div');
      div.textContent = `[RUNNING] ${t.name}`;
      container.appendChild(div);

      try {
        await t.fn();
        this.passed++;
        div.textContent = `✅ [PASS] ${t.name}`;
        div.style.color = 'green';
      } catch (err) {
        this.failed++;
        div.textContent = `❌ [FAIL] ${t.name}: ${err.message}`;
        div.style.color = 'red';
        console.error(err);
      }
    }

    const summary = document.createElement('h3');
    summary.textContent = `Results: ${this.passed} passed, ${this.failed} failed.`;
    container.appendChild(summary);
  }
}

export const runner = new TestRunner();
export const test = runner.test.bind(runner);
export const assert = runner.assert.bind(runner);
export const assertAlmostEqual = runner.assertAlmostEqual.bind(runner);
