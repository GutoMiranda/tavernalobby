import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/aventuras/armazem-actions", () => ({
  editarItemArmazem: vi.fn(async () => ({})),
  removerItensArmazem: vi.fn(async () => ({ ok: "ok" })),
  usarSugestao: vi.fn(async () => ({})),
}));

import { type LinhaArmazem, TabelaArmazem } from "./tabela-armazem";

const base: Omit<LinhaArmazem, "id" | "name"> = {
  category: "Carnes",
  unit: "kg",
  unit_price_cents: 5990,
  quantity: 8.5,
  quantity_per_person: null,
  is_alcoholic: false,
  cost_cents: 50915,
  sugestao: 12.4,
  consumo: 0.4,
  consumoInformado: false,
  pessoasDia: 31,
  podeExcluir: true,
};

const linhas: LinhaArmazem[] = [
  { ...base, id: "1", name: "Picanha" },
  {
    ...base,
    id: "2",
    name: "Cerveja",
    category: "Bebidas",
    unit: "lata",
    unit_price_cents: 450,
    quantity: 48,
    cost_cents: 21600,
    is_alcoholic: true,
    sugestao: null,
    consumo: null,
    podeExcluir: false,
  },
];

afterEach(cleanup);

describe("TabelaArmazem", () => {
  it("mostra custo, sugestão e total; filtra por categoria e unidade", () => {
    render(<TabelaArmazem linhas={linhas} eventoId="e" />);
    const tabela = screen.getByRole("table");
    expect(within(tabela).getByText("R$ 509,15")).toBeInTheDocument();
    expect(within(tabela).getByText(/≈ 12,4 kg/)).toBeInTheDocument();
    expect(within(tabela).getByText("R$ 725,15")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "Bebidas" } });
    expect(within(tabela).queryByText("Picanha")).toBeNull();
    expect(within(tabela).getByText("R$ 216,00", { selector: "td.font-semibold" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Unidade"), { target: { value: "kg" } });
    expect(within(tabela).queryByText("Cerveja")).toBeNull();
  });

  it("só deixa selecionar o que a pessoa pode excluir", () => {
    render(<TabelaArmazem linhas={linhas} eventoId="e" />);
    expect(screen.getByLabelText("Selecionar Picanha")).toBeInTheDocument();
    expect(screen.queryByLabelText("Selecionar Cerveja")).toBeNull();
    fireEvent.click(screen.getByLabelText("Selecionar todos os itens visíveis"));
    expect(screen.getByRole("button", { name: /Excluir selecionados \(1\)/ })).toBeEnabled();
    expect(screen.queryByLabelText("Excluir Cerveja")).toBeNull();
  });
});
