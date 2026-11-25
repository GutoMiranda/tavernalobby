import type { Metadata } from "next";
import Link from "next/link";

import { CREDITOS_DAS_CENAS } from "@/lib/cenas";

import { contatoDoAdmin, DocumentoLegal } from "@/components/legal/documento-legal";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermosPage() {
  const contato = contatoDoAdmin();
  return (
    <DocumentoLegal titulo="Termos de uso" atualizado="25/11/2026">
      <p>
        A Taverna O Lobby é um site privado e gratuito para um grupo de amigos e familiares organizar encontros. Ao
        entrar, você concorda com estes termos.
      </p>

      <h2>Acesso</h2>
      <ul>
        <li>O acesso é só por convite e depende da aprovação do administrador (Mestre da Taverna).</li>
        <li>Cada pessoa usa a própria conta. Um adulto pode cadastrar e responder pelos dependentes do seu núcleo.</li>
        <li>O administrador pode suspender o acesso de quem usar o site de forma indevida.</li>
      </ul>

      <h2>Dinheiro e caixinha</h2>
      <ul>
        <li>
          O site não guarda nem movimenta dinheiro. Ele registra e mostra os valores; o dinheiro fica na conta indicada
          na página do Baú, de responsabilidade do grupo.
        </li>
        <li>
          Os valores de cada pessoa são calculados pelas regras de divisão mostradas no site. Confira sempre banco,
          titular e chave antes de pagar.
        </li>
        <li>
          O Pix automático é processado pela InfinitePay; problemas no pagamento são tratados com ela e com o
          administrador.
        </li>
        <li>Lançamentos não são apagados; correções são feitas por estorno, com motivo.</li>
      </ul>

      <h2>Conteúdo</h2>
      <p>
        Você é responsável pelo que cadastra (comprovantes, hospedagens, itens). Não envie conteúdo ofensivo, ilegal ou
        dados de terceiros sem autorização.
      </p>

      <h2>Disponibilidade</h2>
      <p>
        O site usa planos gratuitos de serviços de terceiros e pode ficar fora do ar ou mudar sem aviso. Não há garantia
        de funcionamento contínuo.
      </p>

      {Object.keys(CREDITOS_DAS_CENAS).length > 0 && (
        <>
          <h2>Créditos das imagens</h2>
          <p>Fotos das aventuras do Unsplash (Unsplash License):</p>
          <ul>
            {Object.entries(CREDITOS_DAS_CENAS).map(([fase, c]) => (
              <li key={fase}>
                <a href={c.fonte} rel="noopener noreferrer">
                  {c.autor}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Contato</h2>
      <p>
        Dúvidas sobre estes termos:{" "}
        {contato ? <a href={`mailto:${contato}`}>{contato}</a> : "fale com o administrador que convidou você"}. Veja
        também a <Link href="/privacidade">política de privacidade</Link>.
      </p>
    </DocumentoLegal>
  );
}
