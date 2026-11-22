import { expect, test } from "@playwright/test";

test("keyboard edits apply without losing invalid-input context or screen state", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?ea");

  const article = page.getByRole("article");
  await expect(article.getByRole("heading", { level: 1 })).toHaveText("Bisection Screen, Root Finding");
  await expect(page.getByRole("navigation").getByRole("button")).toHaveCount(7);
  const names = ["Bisection", "Newton’s Method", "False Position", "Secant", "Fixed-Point Iteration", "Brent’s Method"];
  for (const [index, name] of names.entries()) {
    await expect(
      page
        .getByRole("navigation")
        .getByRole("button")
        .nth(index + 1),
    ).toHaveAccessibleName(`${name} Screen`);
  }

  const fn = article.getByRole("textbox", { name: "Function f(x)" });
  await fn.focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("sin(");
  await page.keyboard.press("Enter");
  await expect(fn).toHaveAttribute("aria-invalid", "true");
  await expect(article.getByText(/Current function x\^3 - x - 2/)).toBeAttached();

  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("x - 1.5");
  await page.keyboard.press("Enter");
  await article.getByRole("button", { name: "Step", exact: true }).press("Enter");
  await expect(article.getByText(/Zero found.*Bisection midpoint.*1.5/)).toBeAttached();

  await page.getByRole("button", { name: "Newton’s Method Screen", exact: true }).press("Enter");
  await expect(article.getByRole("textbox", { name: "Derivative f′(x)" })).toHaveValue("3*x^2 - 1");
  await article.getByRole("button", { name: "Run", exact: true }).press("Enter");
  await expect(article.getByRole("button", { name: "Pause", exact: true })).toBeAttached();
  await page.getByRole("button", { name: "Bisection Screen", exact: true }).press("Enter");
  await expect(article.getByText(/Zero found.*Bisection midpoint.*1.5/)).toBeAttached();
  await page.getByRole("button", { name: "Newton’s Method Screen", exact: true }).press("Enter");
  await expect(article.getByRole("button", { name: "Run", exact: true })).toBeAttached();
  await article.getByRole("button", { name: "Run", exact: true }).press("Enter");
  await expect(article.getByText(/Approximating a root.*Tangent intercept/)).toBeAttached();
  await expect(article.getByText(/Converged within tolerance.*Tangent intercept/)).toBeAttached();

  await page.getByRole("button", { name: "Reset All", exact: true }).press("Enter");
  await expect(article.getByText(/Ready to iterate/)).toBeAttached();
  expect(errors).toEqual([]);
});

test("all methods can be selected in portrait", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?ea");
  for (const name of ["False Position", "Secant", "Fixed-Point Iteration", "Brent’s Method"]) {
    await page.getByRole("button", { name: `${name} Screen`, exact: true }).press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${name} Screen, Root Finding`);
    await page.getByRole("button", { name: "Step", exact: true }).press("Enter");
    await expect(page.getByRole("article").getByText(/Approximating a root/)).toBeAttached();
  }
});

test("keyboard focus can enter the custom function syntax panel", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  await page.goto("/?ea");
  await page.getByRole("button", { name: "Preferences", exact: true }).press("Enter");
  const dialog = page.getByRole("dialog", { name: "Preferences" });
  await dialog.getByRole("tab", { name: "Overview", exact: true }).press("ArrowRight");
  const syntax = dialog.getByRole("heading", { name: "Custom function syntax" });
  await expect(syntax).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(dialog.getByText(/Supported functions are abs/)).toBeVisible();
  expect(errors).toEqual([]);
});
