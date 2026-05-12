export default async ({ req, res, log, error }) => {
  // Remove proxies que quebram o node-fetch com endpoints HTTPS no Appwrite
  delete process.env.http_proxy;
  delete process.env.https_proxy;
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;

  const { Client, Databases, Query } = await import('node-appwrite');
  const webpush = (await import('web-push')).default;

  // ─── Initialize Appwrite Client ─────────────────────────────────
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // ─── Parse Payload ───────────────────────────────────────────────
  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ error: 'Payload inválido. Envie JSON com { title, body }.' }, 400);
  }

  const { title, body } = payload;
  if (!title || !body) {
    return res.json({ error: 'Os campos "title" e "body" são obrigatórios.' }, 400);
  }

  // ─── Configure VAPID ─────────────────────────────────────────────
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // ─── Fetch all subscribers (paginated) ───────────────────────────
  const DB_ID = process.env.DB_ID;
  const COLLECTION_ID = process.env.COLLECTION_ID;

  let allDocuments = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    allDocuments = allDocuments.concat(response.documents);

    if (response.documents.length < limit) break;
    offset += limit;
  }

  log(`[Dispatch] Found ${allDocuments.length} subscribers`);

  // ─── Dispatch notifications ───────────────────────────────────────
  const notifPayload = JSON.stringify({ title, body, url: '/' });
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
        log(`[Dispatch] Error for ${doc.$id}: ${err.statusCode} ${err.message}`);

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
    log(`[Dispatch] Removing ${toDelete.length} expired subscriptions`);
    await Promise.allSettled(
      toDelete.map((id) => databases.deleteDocument(DB_ID, COLLECTION_ID, id))
    );
  }

  log(`[Dispatch] Done — Sent: ${stats.sent}, Failed: ${stats.failed}, Removed: ${stats.removed}`);

  return res.json({
    success: true,
    sent: stats.sent,
    failed: stats.failed,
    removed: stats.removed,
    total: allDocuments.length,
  });
};
