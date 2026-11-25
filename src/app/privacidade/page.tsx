import type { Metadata } from "next";
import Link from "next/link";

import { contatoDoAdmin, DocumentoLegal } from "@/components/legal/documento-legal";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  const contato = contatoDoAdmin();
  return (
    <DocumentoLegal titulo="Política de privacidade" atualizado="25/11/2026">
      <p>
        A Taverna O Lobby é um site privado, sem fins lucrativos, usado por um grupo de amigos e familiares (até 20
        pessoas) para organizar encontros. Esta política explica quais dados guardamos, para quê e quais são os seus
        direitos, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>Quem cuida dos dados</h2>
      <p>
        O responsável (controlador) é o administrador do grupo, chamado no site de Mestre da Taverna.
        {contato ? (
          <>
            {" "}
            Contato: <a href={`mailto:${contato}`}>{contato}</a>.
          </>
        ) : (
          " O contato é o do administrador que convidou você."
        )}
      </p>

      <h2>Dados que guardamos</h2>
      <ul>
        <li>Da sua conta: nome, e-mail e foto de perfil vindos do login com Google ou do link por e-mail.</li>
        <li>
          Da sua família (núcleo): nomes, parentesco e se é criança, cadastrados por um adulto do núcleo; cidade de
          origem com a localização aproximada, para calcular rotas e tempo de viagem.
        </li>
        <li>Das aventuras: votos em datas e hospedagens, presença, dias de permanência e adesão a itens de custo.</li>
        <li>
          Do baú (caixinha): depósitos, saídas, comprovantes que você envia e, quando usar o Pix automático, o código da
          transação e o link do recibo da InfinitePay. O site não guarda dados de cartão nem senha de banco.
        </li>
        <li>Avisos (notificações) enviados a você dentro do site.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Organizar os encontros: datas, hospedagem, presença, divisão de custos, caixinha e lista de compras.</li>
        <li>Mostrar a todos os membros aprovados as informações do grupo, com transparência sobre valores.</li>
        <li>Enviar avisos no site e, em mudanças nos dados de pagamento da caixinha, por e-mail.</li>
      </ul>
      <p>
        Não vendemos, não alugamos e não usamos seus dados para publicidade. Os dados são vistos apenas pelos membros
        aprovados do grupo.
      </p>

      <h2>Serviços que usamos</h2>
      <ul>
        <li>Supabase: banco de dados, login e arquivos (comprovantes ficam em área privada).</li>
        <li>Google: login com Google, mapas, rotas e busca de endereços.</li>
        <li>Vercel: hospedagem do site.</li>
        <li>Gmail: envio de e-mails de aviso.</li>
        <li>InfinitePay: pagamento por Pix com confirmação automática, quando você escolhe essa opção.</li>
      </ul>

      <h2>Por quanto tempo</h2>
      <p>
        Enquanto você fizer parte do grupo. Registros financeiros não são apagados, para manter o histórico da caixinha
        correto; erros são corrigidos com estorno. Se você sair do grupo, pode pedir a remoção dos seus dados pessoais;
        os lançamentos financeiros já feitos são mantidos para que as contas do grupo continuem fechando.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir a qualquer momento acesso, correção ou exclusão dos seus dados, ou tirar seu consentimento,
        falando com o administrador. Dados da sua família podem ser corrigidos por você mesmo em Minha família.
      </p>

      <h2>Segurança</h2>
      <p>
        O acesso exige login e aprovação do administrador. As permissões são conferidas no próprio banco de dados, e as
        chaves secretas ficam só no servidor.
      </p>

      <p>
        Veja também os <Link href="/termos">termos de uso</Link>.
      </p>
    </DocumentoLegal>
  );
}
