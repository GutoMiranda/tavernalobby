import { expect, test } from "@playwright/test";

test("página inicial mostra o tema da taverna", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Taverna O Lobby" })).toBeVisible();
  await expect(page.getByText("Baú", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("· caixinha", { exact: true })).toBeVisible();
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
