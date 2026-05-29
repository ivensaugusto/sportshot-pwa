# Sportshot PWA — Antigravity Handoff

## Project Overview
Sportshot is a Progressive Web App (PWA) for notification management and communication for a shooting club. It uses Appwrite for the backend and React (Vite) for the frontend.

## Current Status (2026-05-28)
- **Message Board (Mural) & Rich Push**: Agora suporta inserção de imagens nas mensagens enviadas pelo administrador. As imagens aparecem formatadas de maneira premium no mural e são exibidas diretamente nos dispositivos dos usuários através do Web Push.
- **Admin Panel**: Inclui campo para URL de imagem com preview em tempo real (evita o envio de links quebrados).
- **Push Notifications**: Suporte completo para imagens ricas no Service Worker (`sw.js`).
- **Database Schema**: O atributo `image` foi adicionado à coleção `notices`.

## Key Components

### Frontend (`/src`)
- `pages/LandingPage.tsx`: Mural atualizado para exibir imagens associadas aos avisos de forma elegante.
- `pages/AdminPage.tsx`: Formulário atualizado para incluir campo de URL de imagem, preview visual interativo e payload de disparo incluindo a imagem.
- `index.css`: Estilização premium adicionada para imagens no mural (cantos arredondados, transições de zoom suave ao passar o mouse e sombra) e para o preview no painel do administrador.

### Backend (`/functions`)
- `disparar-notificacoes`: Atualizada para receber o campo `image`, propagar no payload do Web Push e persistir na coleção `notices` do banco de dados.

### Scripts & Migrações (`/scratch`)
- `scratch/update-schema-image.js`: **[CRÍTICO]** Script de migração para adicionar o atributo `image` (tipo String, tamanho 2048, opcional) à coleção `notices` e criar o bucket de Storage `notices-images` no Appwrite.

## How to Continue (IMPORTANT)

Se for continuar em outro PC ou ambiente de homologação, siga estas etapas na ordem:

1.  **Configurar Variáveis**: Certifique-se de ter `APPWRITE_API_KEY` disponível.
2.  **Atualizar Banco de Dados**:
    Execute o script para adicionar os novos atributos à coleção `notices` (se ainda não existirem):
    ```bash
    # Adicionar campo 'sender'
    $env:APPWRITE_API_KEY="SUA_CHAVE"; node scratch/update-schema.js
    
    # Adicionar campo 'image' e Criar Bucket 'notices-images' no Storage
    $env:APPWRITE_API_KEY="SUA_CHAVE"; node scratch/update-schema-image.js
    ```
3.  **Fazer Deploy da Função**:
    Como a função `disparar-notificacoes` foi alterada para suportar a imagem, faça o deploy novamente no Appwrite:
    ```bash
    node scripts/deploy-function.mjs
    ```
4.  **Rebuild do Frontend**:
    ```bash
    npm run build
    ```

## Recent Changes (2026-05-28)
- **Inserção de Imagens**: Suporte completo para inclusão de imagens nas mensagens enviadas.
- **Preview em Tempo Real**: O administrador agora vê instantaneamente como a imagem fica antes de disparar o envio.
- **Web Push Rico**: Envio de payload estendido para o Service Worker com suporte a exibição de imagens nas notificações nativas do sistema operacional/dispositivo.
- **Mural com Design Premium**: Renderização das imagens dos avisos no mural com bordas sutis douradas e efeito parallax suave ao passar o mouse.
