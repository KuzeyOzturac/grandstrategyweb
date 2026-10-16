import { test, expect, type Page } from "@playwright/test";
async function begin(page: Page, code = "TUR") {
  await page.goto("./");
  await page.getByRole("button", { name: new RegExp(`^${code}`) }).click();
  await page.getByRole("button", { name: "Begin campaign" }).click();
  await expect(page.locator(".panel-heading h2")).toHaveText(
    "National overview",
  );
  await page.getByRole("button", { name: "Dismiss tutorial" }).click();
}
async function day(page: Page, n: number) {
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(page.locator(".clock>span")).toHaveText(
    `${String(n).padStart(2, "0")} Jan 2012`,
  );
}
async function saved(page: Page) {
  await page
    .getByRole("button", { name: "Save campaign", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  return JSON.parse(
    (await page.evaluate(() => localStorage.getItem("fault-lines-v1")))!,
  );
}
test("all governments start and the worker advances without page errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const code of ["TUR", "IRN", "SYR"]) {
    await begin(page, code);
    await expect(page.locator("[data-province]")).toHaveCount(304);
    await day(page, 2);
    const s = await saved(page);
    expect(s.state.society[code].living).toBeGreaterThan(0);
    await page.evaluate(() => localStorage.clear());
  }
  expect(errors).toEqual([]);
});
test("clicking a country opens diplomacy and highlights shapes without a rectangular focus ring", async ({
  page,
}) => {
  await begin(page);
  const homs = page.locator('path.province[aria-label^="Homs"]').first();
  await homs.click();
  await expect(page.locator(".panel-heading h2")).toHaveText(
    "Syrian government",
  );
  await expect(
    page.getByRole("button", { name: "Improve relations", exact: false }),
  ).toBeVisible();
  expect(await homs.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "none",
  );
  await homs.focus();
  expect(await homs.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "none",
  );
  await expect(page.locator(".province.country-selected")).not.toHaveCount(0);
  await page.screenshot({
    path: "test-results/country-diplomacy.png",
    fullPage: true,
  });
  await page.locator('path.province[aria-label="Ankara, Türkiye"]').click();
  await expect(page.locator(".panel-heading h2")).toHaveText(
    "National overview",
  );
});
test("relations change over time and compensated plays show phases and resolve", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Diplomacy", exact: true }).click();
  await page
    .getByRole("button", { name: "Improve relations", exact: false })
    .click();
  await expect(page.getByRole("status")).toContainText("Improving");
  await day(page, 2);
  const s = await saved(page);
  expect(s.state.society.TUR.relations.SYR).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Begin diplomatic play" }).click();
  await expect(
    page.getByText("Opening demands", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Offer an obligation").click();
  await expect(page.getByText("Promised obligation")).toBeVisible();
  await page.getByRole("button", { name: "Conclude agreement" }).click();
  await expect(page.getByRole("status")).toContainText("implemented");
  expect((await saved(page)).state.society.TUR.obligations).toContain("SYR");
});
test("market trade uses exporter surplus and lowers an import shortage", async ({
  page,
}) => {
  await begin(page);
  const before = await saved(page);
  await page.getByRole("button", { name: "Market", exact: true }).click();
  await page.getByLabel("Trade good", { exact: true }).selectOption("energy");
  await page.getByLabel("Trade partner", { exact: true }).selectOption("IRN");
  await page.getByRole("button", { name: "Open route", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("opened");
  await day(page, 2);
  const after = await saved(page);
  expect(after.state.society.TUR.routes[0].volume).toBeGreaterThan(0);
  expect(after.state.society.TUR.market.energy.price).toBeLessThan(
    before.state.society.TUR.market.energy.price,
  );
  await page.screenshot({
    path: "test-results/national-market.png",
    fullPage: true,
  });
});
test("construction can be queued, prioritized and cancelled with visible progress", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Production", exact: true }).click();
  await page
    .getByRole("button", { name: "Agricultural complex", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Power & fuel complex", exact: false })
    .click();
  await expect(page.locator(".queue-item")).toHaveCount(2);
  await page
    .getByRole("button", {
      name: "Prioritize Power & fuel complex",
      exact: true,
    })
    .click();
  await expect(page.locator(".queue-item").first()).toContainText(
    "Power & fuel complex",
  );
  await day(page, 2);
  await expect(page.locator(".queue-item").first()).toContainText(
    "23 days remaining",
  );
  await page
    .getByRole("button", { name: "Cancel Agricultural complex", exact: true })
    .click();
  await expect(page.locator(".queue-item")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/construction.png",
    fullPage: true,
  });
});
test("politics exposes groups, reforms, research and decisions", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Politics", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Workers & households/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Economy", exact: true }).click();
  await page.getByLabel("Policy area", { exact: true }).selectOption("health");
  await expect(
    page.getByText("Private healthcare", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Begin reform", exact: false })
    .first()
    .click();
  await expect(page.getByLabel("Active reform")).toContainText("Drafting");
  await expect(page.getByRole("status")).toContainText("debate");
  await page
    .getByRole("button", { name: "Research · 70 base days", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("started");
  for (let n = 2; n <= 8; n++) await day(page, n);
  await expect(
    page.getByText("A decision awaits", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Provide household relief", exact: false })
    .click();
  await expect(page.getByRole("status")).toContainText("implemented");
  await expect(
    page.getByText("A decision awaits", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/politics.png", fullPage: true });
});
test("war is managed by fronts rather than army micromanagement", async ({
  page,
}) => {
  await begin(page, "SYR");
  await page
    .getByRole("button", { name: "Military fronts", exact: true })
    .click();
  await expect(page.getByText("Command the strategy")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Set objective", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Defend", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Defend", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await day(page, 2);
  const s = await saved(page);
  expect(s.state.society.SYR.postures.OPP).toBe("defend");
  await page.getByRole("button", { name: "Advance", exact: true }).click();
  await day(page, 3);
  expect(
    (await saved(page)).state.armies.some(
      (a: any) => a.country === "SYR" && a.stance === "advance",
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/fronts.png", fullPage: true });
});
test("save restore, imports, overlays and keyboard controls still work", async ({
  page,
}) => {
  await begin(page);
  const original = await saved(page);
  await day(page, 2);
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await page.getByRole("button", { name: "Load local save" }).click();
  await expect(page.locator(".clock>span")).toHaveText("01 Jan 2012");
  await page.locator("input[type=file]").setInputFiles({
    name: "corrupt.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"bad"}'),
  });
  await expect(page.getByRole("alert")).toContainText("supported");
  await page.locator("input[type=file]").setInputFiles({
    name: "campaign.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await expect(page.getByRole("status")).toContainText("loaded");
  await page.getByLabel("Map overlay").selectOption("economy");
  await page.getByRole("button", { name: "Toggle world overview" }).click();
  await expect(
    page.getByRole("heading", { name: "The world", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle world overview" }).click();
  await page.locator(".map-svg").click({ position: { x: 10, y: 450 } });
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1100, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/compact-atlas.png",
    fullPage: true,
  });
});

test("new decisions pause the running simulation instead of passing unnoticed", async ({
  page,
}) => {
  await begin(page);
  for (let n = 2; n <= 7; n++) await day(page, n);
  await page.getByRole("button", { name: "Speed 3", exact: true }).click();
  await expect(page.locator(".clock>span")).toHaveText("08 Jan 2012");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Decision awaits:/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Decision awaits:/ }).click();
  await expect(
    page.getByText("A decision awaits", { exact: true }),
  ).toBeVisible();
});

test("law categories expose competing policies, odds and cancellation cooldowns", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Politics", exact: true }).click();
  await page.getByRole("button", { name: "Human rights", exact: true }).click();
  await page.getByLabel("Policy area", { exact: true }).selectOption("labor");
  await expect(
    page.getByText("Unregulated workplaces", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".law-odds").first()).toContainText("% advance");
  await page
    .getByRole("button", { name: "Begin reform · 15 credits", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Active reform")).toContainText(
    "Workplace protections",
  );
  await page
    .getByRole("button", { name: "Abandon reform", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("60-day cooldown");
  await expect(
    page
      .getByRole("button", { name: "Begin reform · 15 credits", exact: true })
      .first(),
  ).toBeDisabled();
  await page
    .locator(".law-codex")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: "test-results/law-codex.png", fullPage: true });
  const save = await saved(page);
  expect(save.state.society.TUR.lawCooldowns.labor).toBe(60);
});

test("secondary war aims, coalition backing and settlement are usable from country diplomacy", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Diplomacy", exact: true }).click();
  await page
    .getByRole("button", { name: "War reparations", exact: true })
    .click();
  await page.getByLabel("Compensation", { exact: false }).fill("0");
  await page
    .getByRole("button", { name: "Begin diplomatic play", exact: true })
    .click();
  await page
    .getByLabel("Additional demand", { exact: true })
    .selectOption("disarm");
  await page
    .getByRole("button", { name: "Add secondary war aim", exact: true })
    .click();
  await expect(page.locator(".play-terms")).toContainText(
    "40 maneuvers remaining",
  );
  await page
    .getByRole("button", { name: "Seek USA backing", exact: true })
    .click();
  await expect(page.locator(".play-terms")).toContainText(
    "Türkiye, United States",
  );
  for (let n = 2; n <= 4; n++) await day(page, n);
  await page
    .getByRole("button", { name: "Escalate to war", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Enforce war aims", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Your war aims:/)).toContainText(
    "Limit armaments",
  );
  await page
    .getByRole("button", { name: "Concede opposing war aims", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/war-settlement.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Concede opposing war aims", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("War settled");
  const save = await saved(page);
  expect(save.state.crises.at(-1).status).toBe("agreed");
  expect(
    save.state.wars.some(
      (pair: string[]) => pair.includes("TUR") && pair.includes("SYR"),
    ),
  ).toBe(false);
});
