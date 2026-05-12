# Manual de Uso: Sistema Web Push Sportshot

Bem-vindo ao manual do sistema de notificações **Sportshot PWA**. Este documento explica detalhadamente como acessar, usar e gerenciar sua nova plataforma de envios de mensagens gratuitas via Web Push.

---

## 1. Como Funciona o Sistema?

O sistema foi criado para ser um canal direto e sem custos de disparo entre o Clube de Tiro Sportshot e seus clientes. Ele funciona em duas pontas:
1. **O Cliente (Página Pública):** Acessa o site, clica em um botão e permite que o navegador (celular ou computador) receba notificações do clube. O dispositivo dele fica salvo no banco de dados.
2. **O Administrador (Painel Privado):** Acessa uma área restrita, digita a mensagem desejada e dispara. O sistema (via Appwrite) envia a mensagem em massa para todos os clientes inscritos instantaneamente.

---

## 2. Acessos e URLs Importantes

Guarde estes links, eles são a base da sua operação:

- **Site Público (Para os clientes):** 
  👉 [https://sportshot.simplemsg.net.br](https://sportshot.simplemsg.net.br)
  *Compartilhe este link no WhatsApp, Instagram e campanhas do clube para captar inscritos.*

- **Painel Administrativo (Para você disparar mensagens):** 
  👉 [https://sportshot.simplemsg.net.br/admin](https://sportshot.simplemsg.net.br/admin)

- **Painel do Banco de Dados (Appwrite):** 
  👉 [https://apw.simplemsg.net.br](https://apw.simplemsg.net.br)
  *(Acesso infraestrutural: Onde ficam salvos os tokens técnicos dos usuários e a configuração do servidor de disparos).*

---

## 3. Como Disparar uma Notificação (Passo a Passo)

Sempre que quiser avisar seus clientes sobre um torneio, promoção ou evento:

1. Acesse o **Painel Administrativo**: [https://sportshot.simplemsg.net.br/admin](https://sportshot.simplemsg.net.br/admin)
2. Faça o login com as credenciais padrão:
   - **E-mail:** `admin@sportshot.com.br`
   - **Senha:** `Sportshot@2024!`
3. Na tela de disparo, preencha:
   - **Título da Notificação** (Ex: *Torneio de Tiro Esportivo!*)
   - **Mensagem** (Ex: *Inscreva-se agora, vagas limitadas para este fim de semana.*)
4. Clique em **"🚀 Disparar para Todos"**.
5. Aguarde alguns segundos. O sistema mostrará um resumo verde informando quantos envios tiveram sucesso. As notificações começarão a aparecer nos celulares e computadores dos clientes inscritos.

> **Dica de Limpeza Automática:** Se um cliente trocar de celular ou revogar a permissão no navegador, o sistema detectará a falha no próximo disparo e excluirá aquele cliente automaticamente do banco de dados, mantendo sua lista sempre limpa e atualizada!

---

## 4. Testando o Sistema Agora Mesmo

Quer ver funcionando na prática? Siga este teste rápido:
1. Pelo seu próprio celular ou computador, abra o [Site Público](https://sportshot.simplemsg.net.br).
2. Clique no botão dourado **"🔔 Quero receber os avisos"**.
3. O navegador vai perguntar se você permite notificações. Clique em **Permitir**.
4. A tela mostrará uma mensagem de sucesso ("Você está dentro!").
5. Agora abra o **Painel Administrativo**, faça login e envie uma mensagem de teste. Ela aparecerá na tela do seu dispositivo!

---

## 5. Como Atualizar o Sistema (CI/CD Automático)

A infraestrutura foi configurada para que você não precise acessar o servidor Hetzner manualmente se quiser mudar um texto ou a cor de um botão no site.

O sistema possui integração contínua (CI/CD) via Portainer Webhook ligada ao seu GitHub:
1. Altere o código fonte do sistema no seu computador.
2. Faça o commit e envie para o GitHub:
   ```bash
   git add .
   git commit -m "Alterando texto da página inicial"
   git push origin master
   ```
3. **Pronto!** O GitHub vai avisar o seu servidor (Portainer) imediatamente. O servidor vai baixar a nova versão, reconstruir o sistema e colocar no ar sem que o site caia, de forma 100% automática (em cerca de 1 minuto a mudança já estará visível online).

---

## 6. Alterando a Senha do Administrador

Para a segurança do sistema, recomenda-se alterar a senha inicial de disparo.
1. Acesse o [Painel Appwrite](https://apw.simplemsg.net.br).
2. Entre no projeto **Sportshot**.
3. No menu lateral esquerdo, clique em **Auth** (Autenticação).
4. Encontre o usuário `admin@sportshot.com.br` na lista e clique nele.
5. Na aba de configurações do usuário, você poderá atualizar a senha. A nova senha será exigida no próximo login do `/admin`.

---

**Suporte Tecnológico:** Qualquer alteração complexa de infraestrutura Docker ou Lógica de Disparo via Web Push API, consulte o repositório GitHub para verificar o código fonte (`sw.js` e a Appwrite Function em `/functions`).
