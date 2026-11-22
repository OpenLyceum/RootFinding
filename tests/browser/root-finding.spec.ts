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

test("automatic zoom follows the bracket and manual bounds stay put", async ({ page }) => {
  await page.goto("/?ea");
  const article = page.getByRole("article");
  const step = article.getByRole("button", { name: "Step", exact: true });
  const auto = article.getByRole("checkbox", { name: "Auto zoom" });
  const minX = article.getByRole("textbox", { name: "x minimum" });
  const maxX = article.getByRole("textbox", { name: "x maximum" });
  const minY = article.getByRole("textbox", { name: "y minimum" });
  const maxY = article.getByRole("textbox", { name: "y maximum" });
  await expect(auto).toBeChecked();
  const initialWidth = Number(await maxX.inputValue()) - Number(await minX.inputValue());
  const initialHeight = Number(await maxY.inputValue()) - Number(await minY.inputValue());

  for (let i = 0; i < 4; i++) {
    await step.press("Enter");
  }
  expect(Number(await maxX.inputValue()) - Number(await minX.inputValue())).toBeLessThan(initialWidth / 8);
  expect(Number(await maxY.inputValue()) - Number(await minY.inputValue())).toBeLessThan(initialHeight / 4);

  const previousMaxX = await maxX.inputValue();
  await minX.fill("2");
  await minX.press("Enter");
  await expect(auto).not.toBeChecked();
  await expect(minX).toHaveAttribute("aria-invalid", "true");
  await expect(maxX).toHaveValue(previousMaxX);

  await minX.fill("-2");
  await maxX.fill("3");
  await minY.fill("-1");
  await maxY.fill("4");
  await article.getByRole("button", { name: "Apply axes" }).press("Enter");
  await expect(minX).toHaveAttribute("aria-invalid", "false");
  await step.press("Enter");
  await expect(minX).toHaveValue("-2");
  await expect(maxX).toHaveValue("3");
  await expect(minY).toHaveValue("-1");
  await expect(maxY).toHaveValue("4");

  await auto.press("Space");
  await expect(auto).toBeChecked();
  expect(Number(await maxX.inputValue()) - Number(await minX.inputValue())).toBeLessThan(0.25);

  await minY.fill("8");
  await article.getByRole("button", { name: "Reset All" }).press("Enter");
  await expect(auto).toBeChecked();
  expect(Number(await maxX.inputValue()) - Number(await minX.inputValue())).toBe(initialWidth);
});

test("open methods frame their latest construction", async ({ page }) => {
  await page.goto("/?ea&initialScreen=2");
  const article = page.getByRole("article");
  const minX = article.getByRole("textbox", { name: "x minimum" });
  const maxX = article.getByRole("textbox", { name: "x maximum" });
  await expect(article.getByRole("checkbox", { name: "Auto zoom" })).toBeChecked();
  const initialWidth = Number(await maxX.inputValue()) - Number(await minX.inputValue());
  await article.getByRole("button", { name: "Step", exact: true }).press("Enter");
  const lower = Number(await minX.inputValue());
  const upper = Number(await maxX.inputValue());
  expect(upper - lower).toBeLessThan(initialWidth / 4);
  expect(lower).toBeLessThan(1.5);
  expect(upper).toBeGreaterThan(1.52);
});

test("each method explains its construction using the current iteration", async ({ page }) => {
  await page.goto("/?ea");
  const article = page.getByRole("article");
  const cases = [
    ["Bisection", /Construct\. m = \(1 \+ 2\) \/ 2 ≈ 1\.5.*Keep \[1\.5, 2\] because the signs are opposite/],
    ["Newton’s Method", /Slope f′\(xₙ\) ≈ 5\.75.*Follow the tangent to y = 0/],
    ["False Position", /Follow the endpoint chord to y = 0.*Keep \[/],
    ["Secant", /Use \(1, -2\) and \(2, 4\).*Follow the secant to y = 0/],
    ["Fixed-Point Iteration", /Start on y = x.*Go up or down to g\(xₙ\).*then across to y = x/],
    ["Brent’s Method", /Follow the secant to y = 0.*Keep \[/],
  ] as const;
  for (const [name, explanation] of cases) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: `${name} Screen`, exact: true })
      .press("Enter");
    await article.getByRole("button", { name: "Step", exact: true }).press("Enter");
    await expect(article.getByText(explanation)).toBeAttached();
  }
  await article.getByRole("button", { name: "Step", exact: true }).press("Enter");
  await expect(article.getByText(/The third sample is c.*Fit x as a quadratic in y/)).toBeAttached();
});
