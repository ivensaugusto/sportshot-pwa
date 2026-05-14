# Sportshot PWA — Antigravity Handoff

## Project Overview
Sportshot is a Progressive Web App (PWA) for notification management and communication for a shooting club. It uses Appwrite for the backend and React (Vite) for the frontend.

## Current Status (2026-05-14)
- **Message Board (Mural)**: Agora exibe o remetente (nome/e-mail) e data/hora.
- **Push Notifications**: Funcional, com registro robusto de histórico no banco de dados.
- **Admin Panel**: Permite disparar notificações enviando o nome do administrador logado como remetente.

## Key Components

### Frontend (`/src`)
- `pages/LandingPage.tsx`: Mural atualizado para exibir o campo `sender`.
- `pages/AdminPage.tsx`: Payload de disparo atualizado para incluir `sender`.
- `index.css`: Estilização adicionada para o nome do remetente no mural.

### Backend (`/functions`)
- `disparar-notificacoes`: Atualizada para salvar o campo `sender` e retornar erro explícito caso a gravação no histórico falhe.

### Scripts (`/scripts` & `/scratch`)
- `scripts/setup-appwrite.js`: Inclui agora o atributo `sender` na coleção `notices`.
- `scratch/update-schema.js`: **[CRÍTICO]** Script para atualizar o banco de dados existente adicionando a coluna `sender`.

## How to Continue (IMPORTANT)

Se for continuar em outro PC, siga estas etapas na ordem:

1.  **Configurar Variáveis**: Certifique-se de ter `APPWRITE_API_KEY` disponível.
2.  **Atualizar Banco de Dados**:
    Execute o script para adicionar o novo atributo `sender` à coleção `notices`:
    ```bash
    # Windows
    $env:APPWRITE_API_KEY="SUA_CHAVE"; node scratch/update-schema.js
    # Linux/Mac
    APPWRITE_API_KEY="SUA_CHAVE" node scratch/update-schema.js
    ```
3.  **Fazer Deploy da Função**:
    A função `disparar-notificacoes` foi alterada e precisa ser enviada novamente para o Appwrite.
    ```bash
    node scripts/deploy-function.mjs
    ```
4.  **Rebuild do Frontend**:
    ```bash
    npm run build
    ```

## Recent Changes (2026-05-14)
- **Salvamento de Remetente**: Adicionado campo `sender` em todas as mensagens enviadas.
- **Correção de Histórico**: Corrigida a lógica da Appwrite Function para garantir que a mensagem seja gravada no mural antes de retornar sucesso.
- **Feedback de Erro**: O admin agora recebe um aviso se a notificação foi enviada mas o registro no mural falhou.
- **Visual do Mural**: Adicionada a exibição "por [Nome]" em cada aviso do mural.
