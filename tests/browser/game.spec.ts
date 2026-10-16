import { test, expect } from "@playwright/test";
async function begin(page: any, code = "TUR") {
  await page.goto("./");
  await page.getByRole("button", { name: new RegExp(`^${code}`) }).click();
  await page.getByRole("button", { name: "Begin campaign" }).click();
  await expect(page.getByText("Orders while paused")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss tutorial" }).click();
}
test("all governments start with a working simulation worker", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const code of ["TUR", "IRN", "SYR"]) {
    await begin(page, code);
    await expect(page.locator("[data-province]")).toHaveCount(304);
    await page.getByRole("button", { name: "Next day", exact: true }).click();
    await expect(page.getByText("02 Jan 2012", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Save campaign", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("saved");
    await page.evaluate(() => localStorage.clear());
  }
  expect(errors).toEqual([]);
});
test("negotiated access, map selection, investments and exact local restore", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Diplomacy", exact: true }).click();
  await page.getByRole("button", { name: "Propose diplomatic crisis" }).click();
  await expect(page.getByText("Will accept", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Conclude agreement" }).click();
  await expect(page.getByRole("status")).toContainText("implemented");
  await expect(page.getByText("Active crisis", { exact: false })).toHaveCount(
    0,
  );
  await page
    .locator('[data-province="TUR-3020"]')
    .count()
    .then(async (n) => {
      if (n)
        await page.locator('[data-province="TUR-3020"]').dispatchEvent("click");
      else
        await page
          .locator('[data-province^="TUR-"]')
          .first()
          .dispatchEvent("click");
    });
  await page.getByRole("button", { name: "Economy", exact: true }).click();
  await page.getByRole("button", { name: "Expand civilian industry" }).click();
  await expect(
    page.getByText("25 days remaining", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save campaign", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  const before = await page.evaluate(() =>
    localStorage.getItem("fault-lines-v1"),
  );
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(page.getByText("02 Jan 2012", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await page.getByRole("button", { name: "Load local save" }).click();
  await expect(page.getByText("01 Jan 2012", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Save campaign", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  expect(
    await page.evaluate(() => localStorage.getItem("fault-lines-v1")),
  ).toBe(before);
});
test("failed negotiation escalates after warning; army objective and halt work", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Diplomacy", exact: true }).click();
  await page.getByLabel("Compensation", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Propose diplomatic crisis" }).click();
  await page.getByRole("button", { name: "Conclude agreement" }).click();
  await expect(page.getByRole("alert")).toContainText("refuse");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next day", exact: true }).click();
    await expect(page.locator(".clock>span")).toHaveText(
      `${String(i + 2).padStart(2, "0")} Jan 2012`,
    );
  }
  await page.getByRole("button", { name: "Escalate to war" }).click();
  await expect(page.getByRole("status")).toContainText("war");
  await page.getByRole("button", { name: "Armed forces", exact: true }).click();
  await page.locator(".army-list button").first().click();
  await page
    .getByRole("button", { name: "Set objective", exact: true })
    .click();
  await page.locator('[data-province^="SYR-"]').first().dispatchEvent("click");
  await expect(page.getByRole("status")).toContainText("objective");
  await page.getByRole("button", { name: "Halt", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("halted");
});
test("import rejects corrupt file without replacing current campaign", async ({
  page,
}) => {
  await begin(page);
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"format":"wrong"}'),
    });
  await expect(page.getByRole("alert")).toContainText("supported");
  await expect(page.getByText("01 Jan 2012", { exact: true })).toBeVisible();
});
test("map overlays, world toggle, keyboard and desktop layout", async ({
  page,
}) => {
  await begin(page);
  await page.getByLabel("Map overlay").selectOption("supply");
  await expect(page.getByLabel("Map overlay")).toHaveValue("supply");
  await page.getByRole("button", { name: "Toggle world overview" }).click();
  await expect(
    page.getByRole("heading", { name: "The world", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle world overview" }).click();
  await page.locator(".map-svg").click({ position: { x: 10, y: 450 } });
  await page.keyboard.press("Space");
  await expect(
    page.getByText("Simulation running", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByText("Orders while paused")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/atlas-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1100, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/atlas-compact.png",
    fullPage: true,
  });
});

test('aid reaches Syria and mediation ends the conflict through the interface',async({page})=>{
 await begin(page,'IRN');await page.getByRole('button',{name:'Diplomacy',exact:true}).click();await page.getByRole('button',{name:'Equipment aid',exact:false}).click();await expect(page.getByRole('status')).toContainText('dispatched');
 for(let i=0;i<5;i++){await page.getByRole('button',{name:'Next day',exact:true}).click();await expect(page.locator('.clock>span')).toHaveText(`${String(i+2).padStart(2,'0')} Jan 2012`)}
 await expect(page.locator('.ticker')).toContainText('reaches Syrian government');await page.getByLabel('Crisis demand').selectOption('ceasefire');await page.getByLabel('Compensation',{exact:true}).fill('100');await page.getByRole('button',{name:'Propose diplomatic crisis'}).click();await page.getByRole('button',{name:'Conclude agreement'}).click();await expect(page.getByRole('status')).toContainText('implemented');await page.getByRole('button',{name:'Save campaign',exact:true}).click();await expect(page.getByRole('status')).toContainText('saved');const raw=await page.evaluate(()=>localStorage.getItem('fault-lines-v1'));const saved=JSON.parse(raw!);expect(saved.state.wars).not.toContainEqual(['SYR','OPP']);
 await page.locator('input[type=file]').setInputFiles({name:'campaign.json',mimeType:'application/json',buffer:Buffer.from(raw!)});await expect(page.getByRole('status')).toContainText('loaded');await expect(page.locator('.clock>span')).toHaveText('06 Jan 2012');
 await page.getByRole('button',{name:'Focus Syrian theatre'}).click();await page.screenshot({path:'test-results/syria-diplomacy.png',fullPage:true});
});

test('campaign introduction and political map remain readable',async({page})=>{
 await page.goto('./');await expect(page.getByRole('button',{name:'Begin campaign'})).toBeEnabled();await page.screenshot({path:'test-results/introduction.png',fullPage:true});await page.getByRole('button',{name:'Begin campaign'}).click();await expect(page.getByText('Orders while paused')).toBeVisible();await page.getByRole('button',{name:'Dismiss tutorial'}).click();await page.getByRole('button',{name:'Focus Syrian theatre'}).click();await page.screenshot({path:'test-results/syria-political.png',fullPage:true});
});
