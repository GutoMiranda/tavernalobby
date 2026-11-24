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
