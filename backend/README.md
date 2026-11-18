# API Controle de Escala

Backend em Node.js, Express e MySQL, organizado com a separação de servidor, rotas, controladores, middleware e configuração usada no projeto MantoUrbano. A conexão usa `mysql2/promise` e consultas parametrizadas.

## Preparar localmente

1. Crie o banco `controle_escala` e um usuário MySQL sem privilégios administrativos. No XAMPP, pode criar o banco pelo phpMyAdmin; na Hostinger, pelo painel MySQL.
2. Copie `.env.example` para `.env` e ajuste conexão, domínio do frontend e um `JWT_SECRET` aleatório com pelo menos 32 caracteres.
3. Rode `npm install`.
4. Crie as tabelas e a cobertura inicial com `npm run db:migrate` e `npm run db:seed`.
5. Crie a conta inicial: configure `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente e rode `npm run admin:create`. A senha deve ter 12 a 72 bytes. Não há rota pública de cadastro.
6. Inicie com `npm run dev` (local) ou `npm start`.
7. O frontend está em `../index.html`; ajuste `window.CONTROLE_ESCALA_API` em `../config.js` para o endereço da API e inclua a origem do site em `CORS_ORIGINS`.

O migration base detecta tabelas já criadas pelo `sql/schema.sql`; nesse caso, registra a versão sem tentar recriá-las. Migrations futuras devem ser adicionadas como novos arquivos, sem alterar a migration já aplicada.
Se instalar dependências de produção com `npm install --omit=dev`, execute as migrations antes, em um ambiente com as dependências de desenvolvimento instaladas.

## Endpoints

- `POST /api/auth/login` — recebe `{ "email": "...", "senha": "..." }` e devolve token Bearer.
- `GET /api/auth/me` — valida a sessão.
- `GET /api/funcionarios` — lista funcionários.
- `POST /api/funcionarios` — recebe `{ "nome": "...", "cargo": "Chapista" }`. Os cargos aceitos são `Chapista`, `Auxiliar de chapista`, `Auxiliar de cozinha`, `Caixa` e `Atendente`.
- `GET /api/funcionarios/:id` — consulta um funcionário.
- `PATCH /api/funcionarios/:id` — altera `nome`, `cargo`, `matricula` ou `ativo`.
- `DELETE /api/funcionarios/:id` — remove o funcionário e suas atribuições das escalas geradas.
- `GET /api/configuracao/cobertura` — consulta quantas pessoas de cada cargo são necessárias em cada dia.
- `PUT /api/configuracao/cobertura` — substitui a configuração semanal; cada item recebe `cargoAlvo`, `cargosAceitos`, `diaSemana` (segunda=1, domingo=7) e `quantidade`.
- `POST /api/escalas/gerar` — recebe `{ "inicioSemana": "AAAA-MM-DD" }`, sendo a data uma segunda-feira. Gera ou substitui o rascunho daquela semana.
- `GET /api/escalas?inicioSemana=AAAA-MM-DD` — consulta a escala já gerada.
- `GET /api/health` — verificação simples de disponibilidade.

Todas as rotas, exceto login e health, exigem `Authorization: Bearer <token>`.

## Regra de cobertura e geração

O seed cria a cobertura informada: segunda a quinta, duas pessoas entre Chapista e Auxiliar de chapista, duas de Auxiliar de cozinha, uma Caixa e uma Atendente. De sexta a domingo, duas Chapistas, uma Auxiliar de chapista, duas de Auxiliar de cozinha, uma Caixa e duas Atendentes.

O gerador usa fluxo de custo mínimo para cobrir os postos, não escala uma pessoa em dois postos no mesmo dia, limita cada funcionário a cinco dias de trabalho na semana e distribui os turnos de forma equilibrada. Os demais dias aparecem como folga. Se a equipe não cobrir os postos, a API informa as vagas sem salvar uma escala incompleta. A regra atual trabalha com dias, sem horários de entrada, saída, intervalo ou saldo do banco de horas.

A transição divulgada para a EC 141 prevê limite de 42 horas semanais e dois dias de descanso a partir de 16/12/2026; 12 meses depois, o limite passa a 40 horas. Cinco jornadas de 8h24 somam 42 horas. A aplicação ainda não calcula nem valida horas ou banco de horas.

Este sistema organiza uma escala e não substitui a validação trabalhista da convenção coletiva e da jornada aplicável à empresa.
