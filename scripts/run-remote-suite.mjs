import { spawnSync } from "node:child_process";

const setups = new Map([
  ["final-price-resolution-test.mjs", ["client_pricing_test_setup.sql", "final_price_resolution_test_setup.sql"]],
  ["client-pricing-full-flow-test.mjs", "client_pricing_test_setup.sql"],
  ["client-pricing-workflow-test.mjs", "client_pricing_test_setup.sql"],
  ["client-pricing-integrity-test.mjs", "client_pricing_test_setup.sql"],
  ["commercial-pricing-full-flow-test.mjs", "commercial_price_test_setup.sql"],
  ["commercial-price-workflow-test.mjs", "commercial_price_test_setup.sql"],
  ["commercial-price-integrity-test.mjs", "commercial_price_test_setup.sql"],
  ["pricing-engine-test.mjs", "pricing_engine_test_setup.sql"],
  ["pricing-policy-integrity-test.mjs", "pricing_test_setup.sql"],
  ["cost-integrity-test.mjs", "cost_test_setup.sql"],
  ["pricing-full-flow-test.mjs", "pricing_engine_test_setup.sql"],
]);

const suite = process.argv[2];
const setup = setups.get(suite);

if (!setup) {
  console.error("Usage: npm run test:remote -- <mandatory-suite.mjs>");
  console.error(`Allowed suites: ${[...setups.keys()].join(", ")}`);
  process.exit(1);
}

function run(args) {
  const result = spawnSync(process.execPath, args, {
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const setupFile of Array.isArray(setup) ? setup : [setup]) {
  run(["scripts/run-sql.mjs", `tests/remote/sql/${setupFile}`]);
}
run([`tests/remote/${suite}`]);
