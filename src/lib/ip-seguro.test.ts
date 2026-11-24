import { describe, expect, it } from "vitest";

import { ipPrivado } from "./ip-seguro";

describe("ipPrivado", () => {
  it("bloqueia endereços internos", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.0.10", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"]) {
      expect(ipPrivado(ip), ip).toBe(true);
    }
  });

  it("libera endereços públicos", () => {
    for (const ip of ["8.8.8.8", "200.147.67.142", "2800:3f0:4001:810::200e"]) {
      expect(ipPrivado(ip), ip).toBe(false);
    }
  });
});
