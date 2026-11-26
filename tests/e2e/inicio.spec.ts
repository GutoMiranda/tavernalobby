import { expect, test } from "@playwright/test";

test("visitante é levado para a tela de entrar", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { level: 1, name: "Entrar na taverna" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(page.getByLabel("Seu e-mail")).toBeVisible();
});

test("página protegida guarda o destino para depois do login", async ({ page }) => {
  await page.goto("/familia");
  await expect(page).toHaveURL(/\/entrar\?depois=%2Ffamilia$/);
});

test("convite inválido mostra aviso claro", async ({ page }) => {
  await page.goto("/convite/codigo-que-nao-existe");
  await expect(page.getByText("Convite inválido")).toBeVisible();
});

test("manifest do PWA está disponível com ícones", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.name).toBe("Taverna O Lobby");
  expect(manifest.display).toBe("standalone");
  const tamanhos = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(tamanhos).toContain("192x192");
  expect(tamanhos).toContain("512x512");
  for (const icone of manifest.icons) {
    expect((await request.get(icone.src)).ok()).toBeTruthy();
  }
});

test("aviso falso da InfinitePay é recusado sem creditar nada", async ({ request }) => {
  const res = await request.post("/api/infinitepay/webhook", { data: { order_nsu: "x", amount: 100 } });
  expect(res.status()).toBe(400);
});

test("retorno da InfinitePay sem dados não confirma pagamento", async ({ page }) => {
  await page.goto("/api/infinitepay/retorno");
  await expect(page).toHaveURL(/\/entrar/);
});

test("notificações exigem login", async ({ page }) => {
  await page.goto("/notificacoes");
  await expect(page).toHaveURL(/\/entrar\?depois=%2Fnotificacoes$/);
});

test("privacidade e termos são públicos e ligados no rodapé", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("link", { name: "Privacidade" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeVisible();
  await page.goto("/termos");
  await expect(page.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeVisible();
});

test("cabeçalhos de segurança", async ({ request }) => {
  const res = await request.get("/entrar");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});

test("tela de entrar cabe em 375 px sem rolagem lateral", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  for (const rota of ["/entrar", "/privacidade", "/termos"]) {
    await page.goto(rota);
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura, rota).toBeLessThanOrEqual(375);
  }
});
