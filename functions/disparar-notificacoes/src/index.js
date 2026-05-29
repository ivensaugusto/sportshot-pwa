import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';
import webpush from 'web-push';

export default async ({ req, res, log, error }) => {
  // Remove proxies que quebram o node-fetch com endpoints HTTPS no Appwrite
  delete process.env.http_proxy;
  delete process.env.https_proxy;
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;

  log('--- Início da execução ---');
  log(`Payload: ${JSON.stringify(req.body)}`);

  // ─── Initialize Appwrite Client ─────────────────────────────────
  const client = new Client()
    .setEndpoint('https://apw.simplemsg.net.br/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // ─── Parse Payload ───────────────────────────────────────────────
  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (err) {
    error(`Erro ao parsear payload: ${err.message}`);
    return res.json({ error: 'Payload inválido. Envie JSON com { title, body }.' }, 400);
  }

  const { title, body, url, sender, image } = payload;
  if (!title || !body) {
    return res.json({ error: 'Os campos "title" e "body" são obrigatórios.' }, 400);
  }

  // ─── Configure VAPID ─────────────────────────────────────────────
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    error(`Erro ao configurar VAPID: ${err.message}`);
    return res.json({ error: 'Erro interno na configuração de notificações.' }, 500);
  }

  // ─── Fetch all subscribers (paginated) ───────────────────────────
  const DB_ID = process.env.DB_ID || 'sportshot-db';
  const COLLECTION_ID = process.env.COLLECTION_ID || 'push_subscribers';

  log(`Usando DB_ID: ${DB_ID}, COLLECTION_ID: ${COLLECTION_ID}`);

  let allDocuments = [];
  let offset = 0;
  const limit = 100;

  try {
    while (true) {
      const response = await databases.listDocuments(DB_ID, COLLECTION_ID, [
        Query.limit(limit),
        Query.offset(offset),
      ]);

      allDocuments = allDocuments.concat(response.documents);

      if (response.documents.length < limit) break;
      offset += limit;
    }
  } catch (err) {
    error(`Erro ao buscar inscritos: ${err.message}`);
    return res.json({ error: `Falha ao buscar inscritos no banco: ${err.message}` }, 500);
  }

  log(`[Dispatch] Encontrados ${allDocuments.length} inscritos`);

  // ─── Dispatch notifications ───────────────────────────────────────
  const finalUrl = url || '/';
  const notifPayload = JSON.stringify({ title, body, url: finalUrl, image: image || '' });
  const stats = { sent: 0, failed: 0, removed: 0 };
  const toDelete = [];

  await Promise.allSettled(
    allDocuments.map(async (doc) => {
      const subscription = {
        endpoint: doc.endpoint,
        keys: {
          p256dh: doc.keys_p256dh,
          auth: doc.keys_auth,
        },
      };

      try {
        await webpush.sendNotification(subscription, notifPayload);
        stats.sent++;
      } catch (err) {
        log(`[Dispatch] Erro para ${doc.$id}: ${err.statusCode} ${err.message}`);

        // 410 Gone or 404 Not Found = subscription expired/invalid → remove
        if (err.statusCode === 410 || err.statusCode === 404) {
          toDelete.push(doc.$id);
          stats.removed++;
        } else {
          stats.failed++;
        }
      }
    })
  );

  // ─── Remove expired subscriptions ────────────────────────────────
  if (toDelete.length > 0) {
    log(`[Dispatch] Removendo ${toDelete.length} inscrições expiradas`);
    await Promise.allSettled(
      toDelete.map((id) => databases.deleteDocument(DB_ID, COLLECTION_ID, id))
    );
  }

  log(`[Dispatch] Finalizado — Enviados: ${stats.sent}, Falhas: ${stats.failed}, Removidos: ${stats.removed}`);

  // ─── Save History ────────────────────────────────────────────────
  log('--- Salvando histórico no mural ---');
  let historySaved = false;
  try {
    const newNotice = await databases.createDocument(DB_ID, 'notices', ID.unique(), {
      title,
      body,
      url: finalUrl,
      sender: sender || 'Sistema',
      image: image || '',
      createdAt: new Date().toISOString()
    }, [
      Permission.read(Role.any())
    ]);
    log(`[History] Aviso salvo com sucesso na coleção notices (ID: ${newNotice.$id})`);
    historySaved = true;
  } catch (err) {
    error(`[History] Falha ao salvar no mural: ${err.message}`);
    // Se falhar a gravação no banco, logamos mas o retorno principal avisa se houve falha
  }

  return res.json({
    success: historySaved, // O sucesso agora depende também da gravação no banco
    historySaved,
    sent: stats.sent,
    failed: stats.failed,
    removed: stats.removed,
    total: allDocuments.length,
    error: !historySaved ? 'A notificação pode ter sido enviada, mas falhou ao salvar no banco de dados.' : undefined
  });
};
