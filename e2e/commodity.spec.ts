import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

const bffBaseUrl = process.env.PLAYWRIGHT_BFF_BASE_URL ?? "http://127.0.0.1:3201";
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");

async function resetTestData(request: APIRequestContext) {
  let lastStatus = 0;
  let lastError = "";

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request.post(`${bffBaseUrl}/api/test/reset`, {
        failOnStatusCode: false
      });

      lastStatus = response.status();

      if (response.ok()) {
        return;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`test data reset failed with status ${lastStatus}${lastError ? `: ${lastError}` : ""}`);
}

async function login(page: Page, username = "admin", password = "admin123") {
  await page.goto("/login");
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并写入 cookie" }).click();
  await expect(page).toHaveURL(/\/present\/commodity\/list/);
  await expect(page.locator("h1", { hasText: "商品列表" })).toBeVisible();
}

async function loginWithNewPage(browser: Browser, username: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page, username, password);

  return {
    context,
    page
  };
}

test.beforeEach(async ({ request }) => {
  await resetTestData(request);
});

test("登录后访问商品列表", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("link", { name: "北极光蓝牙音箱" })).toBeVisible();
  await expect(page.getByRole("link", { name: "风暴机械键盘" })).toBeVisible();
});

test("创建带图商品后列表展示图片", async ({ page }) => {
  const productName = "E2E带图商品";

  await login(page);
  await page.getByRole("link", { name: "去创建商品" }).click();
  await expect(page.locator("h1", { hasText: "创建商品" })).toBeVisible();

  await page.getByLabel("商品图片").setInputFiles({
    buffer: tinyPng,
    mimeType: "image/png",
    name: "product.png"
  });
  await expect(page.getByText("图片已上传")).toBeVisible();

  await page.getByLabel("商品名称 *").fill(productName);
  await page.getByLabel("商品价格 *").fill("88.5");
  await page.getByLabel("库存 *").fill("12");
  await page.getByLabel("状态 *").selectOption("pending");
  await page.getByLabel("商品描述").fill("Playwright 上传图片创建的商品");
  await page.getByRole("button", { name: "创建商品" }).click();

  await expect(page.getByText(productName)).toBeVisible();
  await page.goto("/present/commodity/list");

  const productRow = page.getByRole("row", { name: new RegExp(productName) });

  await expect(productRow).toBeVisible();
  await expect(productRow.locator(`img[alt="${productName}"]`)).toBeVisible();
});

test("operator 修改状态后 admin 可以查看审计", async ({ browser }) => {
  const { context: operatorContext, page: operatorPage } = await loginWithNewPage(browser, "operator", "operator123");

  await operatorPage.goto("/present/commodity/10002");
  await expect(operatorPage.locator("h1", { hasText: "商品详情" })).toBeVisible();
  await operatorPage.getByLabel("目标状态").selectOption("on_sale");
  await operatorPage.getByLabel("变更原因 *").fill("E2E 审核通过");
  await operatorPage.getByRole("button", { name: "提交状态变更" }).click();
  await expect(operatorPage.getByText("状态已更新，审计日志已写入")).toBeVisible();
  await operatorContext.close();

  const { context: adminContext, page: adminPage } = await loginWithNewPage(browser, "admin", "admin123");

  await adminPage.goto("/present/commodity/audit?action=status_change&targetId=10002&pageSize=20");
  await expect(adminPage.locator("h2", { hasText: "商品审计日志" })).toBeVisible();
  const auditRow = adminPage.getByRole("row", { name: /u_operator_001.*状态变更.*10002.*E2E 审核通过/ });

  await expect(auditRow).toBeVisible();
  await expect(auditRow.locator("td").nth(7)).toHaveText(/\S/);
  await adminContext.close();
});

test("admin 删除商品后列表不可见", async ({ page }) => {
  await login(page);
  await page.goto("/present/commodity/10001");
  await expect(page.getByText("北极光蓝牙音箱")).toBeVisible();

  await page.getByLabel("删除原因 *").fill("E2E 删除验证");
  await page.getByLabel("输入商品名称确认 *").fill("北极光蓝牙音箱");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除商品" }).click();

  await expect(page).toHaveURL(/\/present\/commodity\/list/);
  await expect(page.getByRole("link", { name: "北极光蓝牙音箱" })).toHaveCount(0);
});
