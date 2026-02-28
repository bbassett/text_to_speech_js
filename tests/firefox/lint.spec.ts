import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";

const FIREFOX_EXT_PATH = path.resolve(__dirname, "../../dist/firefox");

test("Firefox extension passes web-ext lint with no errors", () => {
  const result = execSync(
    `npx web-ext lint --source-dir ${FIREFOX_EXT_PATH} --output=json`,
    { encoding: "utf-8", timeout: 30_000 }
  );
  const lint = JSON.parse(result);
  expect(lint.errors).toHaveLength(0);
});
