# Escopo — Taverna O Lobby

Site privado e único onde o grupo (até 20 pessoas, de várias regiões do Brasil) organiza cada encontro do início ao fim: data, local, viagem, comida, dinheiro e presença. Substitui a organização espalhada no WhatsApp por um painel por encontro, atualizado em tempo real para todos.

Este arquivo é a fonte da verdade do produto. Em caso de dúvida, ele prevalece sobre suposições.

---

## 1. Princípios

- **Celular primeiro**: a maioria abre pelo link no WhatsApp. Layout pensado para 360–430 px de largura, depois desktop.
- **Tempo real**: voto, depósito ou item da despensa aparece para todos na hora (Supabase Realtime).
- **Transparência**: todos veem valores, saldo e histórico.
- **Pouco atrito**: login com um clique; uma pessoa cadastra a família toda.
- **Localização**: português do Brasil, valores em R$ (formato `R$ 1.234,56`), datas `dd/mm/aaaa`, fuso `America/Sao_Paulo`.
- **Custo zero**: só planos gratuitos. Nenhuma funcionalidade pode depender de serviço pago.

## 2. Identidade: Taverna O Lobby

Tema de RPG em tom de sátira leve: a taverna onde a party se reúne antes da aventura.

**Regra de clareza (obrigatória)**: todo termo temático aparece com a palavra comum ao lado ou embaixo (ex.: "Baú · caixinha"). Valores, datas, botões de ação e mensagens de erro usam linguagem direta ("Registrar depósito", nunca "Ofertar ao baú").

| No site | Significa |
| --- | --- |
| Taverna | Página inicial do grupo |
| Aventura | Encontro |
| Party | Participantes confirmados |
| Baú | Caixinha |
| Loot guardado | Depósito confirmado (notifica quem depositou) |
| Pilha de tesouro | Total acumulado na caixinha |
| Armazém | Despensa de alimentação e bebidas |
| Estalagens | Opções de hospedagem |
| Mestre da Taverna | Admin |
| Guardião do Baú | Tag Tesoureiro |
| Mural da taverna | Avisos (fase 2) |

**Paleta**

| Uso | Cor |
| --- | --- |
| Fundo escuro (madeira) | `#3B2A1E` |
| Destaque (âmbar, ouro do tesouro) | `#E0A030` |
| Ações e confirmações (verde-garrafa) | `#1F4D3A` |
| Fundo claro de cartões (pergaminho) | `#F3E7CF` |
| Alertas (ex.: troca de Pix) | `#8B2E2E` |

- Títulos: fonte serifada de ar medieval e legível (Cinzel, Google Fonts). Texto: Inter.
- Logo: caneca de taverna com um dado d20 (SVG simples, gerado no projeto).
- Humor só em mensagens vazias e de sucesso (ex.: "O baú está vazio. Nem um tostão furado."), nunca em valores ou erros.
- Contraste mínimo WCAG AA em todo texto.

## 3. Usuários, papéis e login

- **Login**: Google (Supabase Auth) e, como alternativa, link mágico por e-mail.
- **Grupo único**: existe um só grupo. Entrada por link de convite; o admin aprova cada pessoa antes de ela ver qualquer dado.
- **Admin único**: `guto.miranda90@gmail.com` ("Mestre da Taverna"). Só o admin cria encontros, fecha votações, define custos e regras, aprova membros, atribui tags e altera banco/chave Pix.
- **Tags de função**: o admin cria tags e atribui a pessoas. Quem tem a tag controla aquela área.
  - `Tesoureiro` ("Guardião do Baú"): confirma ou recusa depósitos e registra saídas da caixinha. **Não pode** alterar banco nem chave Pix.
  - Outras tags (ex.: `Despensa`) podem ser criadas pelo admin para delegar o controle de uma área.
- **Participante**: curte/descurte datas e estalagens, confirma presença, registra depósitos, edita o armazém, adiciona estalagens e preços de passagens.
- **Núcleo familiar ("Minha família")**: cada conta tem um núcleo e cadastra dependentes (nome, parentesco, tag `Criança`).
  - Dependentes não fazem login. Um adulto dependente (ex.: cônjuge) pode depois receber convite para assumir o próprio perfil com login, mantendo o histórico.
  - O responsável confirma presença e opções (dias, álcool) por todos do núcleo.
  - Valores aparecem por pessoa e somados por núcleo (quem efetivamente paga).

## 4. Fluxo de uma aventura (encontro)

O painel da aventura mostra a fase atual, o próximo passo, a contagem regressiva e "Minhas pendências" (o que falta a pessoa logada fazer).

1. **Criação** (admin): nome, descrição, período candidato, região desejada. Botão "Copiar convite para o WhatsApp".
2. **Votação de datas**: o admin cadastra datas candidatas; cada adulto curte ou descurte cada uma. Ranking pelo saldo (curtidas − descurtidas). O admin fecha no prazo.
3. **Origens**: cada núcleo informa a cidade de saída (autocomplete Google Places). Mapa com todos os pontos.
4. **Estalagens**: qualquer membro adiciona opções (link, preço total, capacidade, endereço, fotos, notas). O site mostra custo estimado por pessoa e o tempo de viagem de cada origem. Cada adulto curte/descurte; o admin escolhe a final.
5. **Presença**: por pessoa do núcleo: vai/não vai; fica o período todo ou quantos dias (mínimo 1, máximo o total do período); participa do rateio de bebidas alcoólicas (opt-in).
6. **Logística** (fase 2): rota por origem, links de busca de passagens (ônibus e avião), registro de preços encontrados, caronas.
7. **Custos e divisão**: itens de custo com as regras da seção 5.
8. **Baú (caixinha)**: meta, depósitos, confirmação, saídas, saldo e histórico.
9. **Armazém (despensa)**: itens com quantidade sugerida pelo número de pessoas, responsável, comprado, alcoólico ou não.
10. **Reta final** (fase 2): página "O Dia" (endereço, check-in, regras da casa, Wi-Fi, contatos, checklist).
11. **Pós-aventura** (fase 3): fechamento do baú (sobra/falta por núcleo), fotos, duplicar como modelo.

## 5. Regras financeiras

Cada item de custo tem a própria lista de participantes elegíveis; o valor é dividido apenas entre os **adultos elegíveis** daquele item. **Crianças têm peso zero em tudo** (contam para comida e camas, nunca para o rateio).

| Categoria | Quem divide | Regra |
| --- | --- | --- |
| Acomodação | Adultos presentes | Proporcional aos dias: `parte = valor × dias_da_pessoa ÷ Σ dias de todos os adultos presentes`. Quem fica o período todo paga a parte completa |
| Alimentação e bebidas não alcoólicas | Adultos presentes | Divisão igual, valor inteiro mesmo para quem vai só 1 dia |
| Bebidas alcoólicas | Adultos com opt-in de álcool | Divisão igual entre quem marcou opt-in |
| Extras (passeio, gás, limpeza…) | Configurável pelo admin: todos ou opt-in | Divisão igual entre os elegíveis |

- O admin pode ajustar o peso de uma pessoa num item (ex.: 0,5), com registro de quem alterou.
- Itens do armazém marcados como alcoólicos somam no custo "Bebidas alcoólicas"; os demais, em "Alimentação".
- Arredondamento: calcular em centavos (inteiros). A diferença de centavos do arredondamento vai para o núcleo do admin, para o total sempre bater exatamente.
- Cada pessoa vê a **memória de cálculo** da sua parte (item, valor, regra, seus dias/peso, resultado).
- Exemplo de teste obrigatório: acomodação de R$ 3.000,00 por 3 dias; 9 adultos ficam 3 dias e 1 adulto fica 1 dia → Σ dias = 28 → quem fica 3 dias paga R$ 321,43 (arredondado) e quem fica 1 dia paga R$ 107,14. A soma arredondada dá R$ 3.000,01; a regra de arredondamento tira 1 centavo do núcleo do admin e o total fecha exatamente em R$ 3.000,00.

### Baú (caixinha)

O dinheiro fica numa conta real (ex.: cofrinho de banco digital) de um membro. **O site não guarda nem movimenta dinheiro**; ele controla e mostra.

- **Configuração** (só admin): banco, titular, chave Pix, QR code estático (gerado a partir da chave), meta total (= soma dos custos) e meta por núcleo (= sua parte).
- **Troca de banco ou chave Pix**: só o admin. Cada troca:
  1. grava histórico permanente (quem, quando, valor anterior e novo);
  2. cria notificação para todos os membros no site;
  3. envia e-mail para todos os membros;
  4. mostra um aviso destacado (cor de alerta) na página do baú por 7 dias.
- **Depósito**: o participante registra valor, data e comprovante opcional (imagem/PDF). Status `pendente` até um Tesoureiro confirmar ou recusar. Ao confirmar, quem depositou recebe a notificação "Loot guardado".
- **Saídas**: o Tesoureiro registra pagamentos feitos com o dinheiro do baú (sinal da casa, mercado), com comprovante.
- **Painel**: pilha de tesouro (saldo confirmado = entradas confirmadas − saídas), % da meta, quanto falta por núcleo, histórico completo visível a todos.
- **Plano de depósitos**: sugestão de valor mensal até a data da aventura.
- **Nada é apagado**: lançamentos errados são estornados com um lançamento inverso, com motivo.

## 6. Módulos e fases

| Módulo | Fase |
| --- | --- |
| Login, convite, aprovação, tags | MVP |
| Minha família (dependentes, tag Criança) | MVP |
| Painel da aventura (fase, pendências, contagem regressiva, resumo de valores) | MVP |
| Votação de datas (curtir/descurtir) | MVP |
| Estalagens (cadastro, custo por pessoa, curtir/descurtir, escolha final) | MVP |
| Presença (dias de permanência, opt-in de álcool) | MVP |
| Custos e divisão com memória de cálculo | MVP |
| Baú (caixinha) com troca de Pix auditada e notificada | MVP |
| Armazém (despensa) | MVP |
| Mapa simples com origens e estalagens | MVP |
| Notificações no site (sino) + e-mail para troca de Pix | MVP |
| Tempo de viagem por origem (matriz de rotas) e "índice de justiça" (tempo médio e máximo do grupo por estalagem) | Fase 2 |
| Links de busca e registro de preços de passagens | Fase 2 |
| Caronas, mural de avisos, push no PWA, página "O Dia" | Fase 2 |
| Acerto final, fotos, duplicar aventura, exportar .ics | Fase 3 |

**MVP pronto quando**: uma aventura real é organizada do zero no site, sem planilha paralela.

## 7. Modelo de dados (referência)

| Tabela | Campos principais |
| --- | --- |
| `groups` | grupo único: nome, código de convite |
| `households` | nome, responsável, cidade de origem (texto, lat, lng, place_id) |
| `people` | household_id, user_id (nulo para dependente), nome, parentesco, is_child, is_admin, status de aprovação |
| `tags` / `person_tags` | tags de função e atribuições |
| `events` | nome, descrição, fase, data_início, data_fim, estalagem escolhida, prazos |
| `date_options` / `date_reactions` | datas candidatas; curtida (+1) ou descurtida (−1) por adulto |
| `accommodations` / `accommodation_reactions` | nome, link, endereço, lat/lng, preço total (centavos), capacidade, fotos, notas; reações |
| `attendances` | event_id, person_id, status, dias de permanência, opt-in de álcool |
| `travel_quotes` | pessoa, modal, origem, preço, link, data da consulta (fase 2) |
| `travel_times` | origem × estalagem: duração e distância, calculadas uma vez e guardadas (fase 2) |
| `cost_items` / `cost_weights` | categoria, descrição, valor (centavos), regra de elegibilidade, proporcional aos dias; ajustes de peso |
| `funds` / `fund_settings_history` | banco, titular, chave Pix, meta; histórico de alterações |
| `fund_transactions` | tipo (entrada/saída/estorno), núcleo, valor, data, comprovante, status, criado_por, confirmado_por |
| `pantry_items` | nome, categoria, quantidade, unidade, alcoólico, responsável, comprado, custo |
| `notifications` | destinatário, tipo, mensagem, lida |

- Valores monetários sempre em **centavos (inteiro)**.
- Partes por pessoa e por núcleo são **calculadas** (função/view ou módulo TypeScript puro), nunca digitadas.

## 8. Stack

| Camada | Escolha |
| --- | --- |
| Front-end | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui, como PWA instalável |
| Banco, login, tempo real, arquivos | Supabase (Postgres, Auth, Realtime, Storage) |
| Hospedagem | Vercel (plano Hobby) |
| Mapas | Google Maps: Maps JavaScript API, Places Autocomplete, Geocoding; Routes API (Compute Route Matrix) na fase 2 |
| E-mail | Gmail SMTP com senha de app (Nodemailer), só no servidor |
| Testes | Vitest (regras de rateio e permissões) + Playwright (fluxos ponta a ponta) |

## 9. Segurança

- Row Level Security em **todas** as tabelas. Membro não aprovado não lê nada além do próprio status.
- Permissões checadas no banco (RLS e funções `security definer`), não só na interface.
- Só Tesoureiro confirma/recusa depósitos e registra saídas; só admin altera custos, regras, banco e Pix.
- Toda ação financeira guarda quem fez e quando.
- Comprovantes em bucket privado, servidos por URL assinada temporária.
- Chaves secretas só em variáveis de ambiente do servidor; nunca no repositório nem no código do navegador.
- Chave do Google Maps do navegador restrita por domínio (HTTP referrer); chave do servidor restrita por API.
- Dados pessoais mínimos (nome, parentesco, cidade), em linha com a LGPD.

## 10. Fora de escopo

- Guardar ou movimentar dinheiro; integração bancária ou Pix automático.
- Comprar passagens ou fazer reservas.
- App nativo nas lojas (o PWA cobre o uso no celular).
- Chat próprio (o WhatsApp segue como conversa; o site é a fonte da verdade).
- Qualquer serviço pago.
