import { describe, expect, it } from "vitest";

import { arquivoIcs, diaSeguinte, linkGoogleAgenda, proximoDeposito } from "./agenda";

describe("agenda", () => {
  it("dia seguinte vira mês e ano", () => {
    expect(diaSeguinte("2027-04-04")).toBe("2027-04-05");
    expect(diaSeguinte("2027-12-31")).toBe("2028-01-01");
    expect(diaSeguinte("2028-02-28")).toBe("2028-02-29");
  });

  it("link do Google Agenda para a aventura (dia inteiro, fim exclusivo)", () => {
    const url = new URL(
      linkGoogleAgenda({ titulo: "Páscoa na Serra", inicio: "2027-04-01", fim: "2027-04-04", local: "Pousada X" }),
    );
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20270401/20270405");
    expect(url.searchParams.get("text")).toBe("Páscoa na Serra");
    expect(url.searchParams.get("location")).toBe("Pousada X");
    expect(url.searchParams.get("recur")).toBeNull();
  });

  it("depósito mensal repete no dia do mês até a aventura", () => {
    const url = new URL(
      linkGoogleAgenda({ titulo: "Depósito", inicio: "2026-12-10", fim: "2026-12-10", mensal: { ate: "2027-04-01" } }),
    );
    expect(url.searchParams.get("dates")).toBe("20261210/20261211");
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=10;UNTIL=20270401");
  });

  it(".ics com datas, repetição, alerta e escape", () => {
    const ics = arquivoIcs({
      uid: "x@taverna",
      titulo: "Depósito; baú, mês",
      inicio: "2026-12-10",
      fim: "2026-12-10",
      mensal: { ate: "2027-04-01" },
      lembreteDiasAntes: 1,
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261210\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261211\r\n");
    expect(ics).toContain("SUMMARY:Depósito\; baú\\, mês\r\n");
    expect(ics).toContain("RRULE:FREQ=MONTHLY;BYMONTHDAY=10;UNTIL=20270401\r\n");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });

  it("sem data da aventura, repete sem fim", () => {
    const url = new URL(
      linkGoogleAgenda({ titulo: "D", inicio: "2026-12-05", fim: "2026-12-05", mensal: { ate: null } }),
    );
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=5");
  });

  it("próximo depósito: este mês se o dia não passou, senão o próximo", () => {
    expect(proximoDeposito("2026-11-26", 28)).toBe("2026-11-28");
    expect(proximoDeposito("2026-11-26", 10)).toBe("2026-12-10");
    expect(proximoDeposito("2026-12-26", 5)).toBe("2027-01-05");
    expect(proximoDeposito("2026-11-10", 10)).toBe("2026-11-10");
  });
});
