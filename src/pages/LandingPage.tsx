import { useState, useEffect } from 'react';
import { client, databases, DB_ID, COLLECTION_ID, VAPID_PUBLIC_KEY, ID, Query } from '../lib/appwrite';

type Notice = {
  $id: string;
  title: string;
  body: string;
  url: string | null;
  sender: string | null;
  image?: string | null;
  createdAt: string;
};

type SubscribeState = 'idle' | 'loading' | 'success' | 'error' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function LandingPage() {
  const [state, setState] = useState<SubscribeState>('idle');
  const [error, setError] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 5;

  useEffect(() => {
    // Check push support
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
    } else if (Notification.permission === 'denied') {
      setState('denied');
    } else if (Notification.permission === 'granted') {
      setState('success'); // Already subscribed
    }
  }, []);

  useEffect(() => {
    // Fetch notices
    const fetchNotices = async () => {
      if (loadingNotices || !hasMore) return;
      setLoadingNotices(true);

      try {
        const res = await databases.listDocuments(DB_ID, 'notices', [
          Query.orderDesc('createdAt'),
          Query.limit(LIMIT),
          Query.offset(offset)
        ]);
        
        const newNotices = res.documents as unknown as Notice[];
        setNotices(prev => [...prev, ...newNotices]);
        
        if (newNotices.length < LIMIT) {
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoadingNotices(false);
      }
    };

    fetchNotices();
  }, [offset]); // Only re-run when offset changes

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingNotices) {
          setOffset(prev => prev + LIMIT);
        }
      },
      { threshold: 1.0 }
    );

    const target = document.querySelector('#scroll-trigger');
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loadingNotices]);

  useEffect(() => {
    // Realtime subscription for new notices
    const unsubscribe = client.subscribe(
      `databases.${DB_ID}.collections.notices.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const newNotice = response.payload as Notice;
          setNotices((prev) => [newNotice, ...prev]);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubscribe = async () => {
    if (state === 'loading') return;
    setState('loading');
    setError('');

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState('denied');
        return;
      }

      // 2. Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Extract subscription data
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string };

      // 5. Save to Appwrite
      await databases.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
        endpoint: subscriptionJson.endpoint!,
        keys_p256dh: keys.p256dh,
        keys_auth: keys.auth,
      });

      setState('success');
    } catch (err: unknown) {
      console.error('[Subscribe] Error:', err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
      setError(msg);
      setState('error');
    }
  };

  return (
    <div className="landing-page-container">
      {/* Inscription Block (Left Column on Desktop, Top on Mobile) */}
      <main className="landing" aria-label="Página de inscrição Sportshot">
        <div className="landing-content">
          {/* Logo Badge */}
          <div className="logo-badge" role="banner">
            <span className="logo-badge-dot" aria-hidden="true" />
            <span className="logo-badge-text">🎯 Sportshot</span>
          </div>

          {/* Target Icon */}
          <div className="target-icon" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="38" stroke="#C9A84C" strokeWidth="2" opacity="0.3"/>
              <circle cx="40" cy="40" r="28" stroke="#C9A84C" strokeWidth="2" opacity="0.5"/>
              <circle cx="40" cy="40" r="18" stroke="#C9A84C" strokeWidth="2" opacity="0.7"/>
              <circle cx="40" cy="40" r="8" fill="#C9A84C"/>
              <circle cx="40" cy="40" r="3" fill="#0A0A0B"/>
              {/* Crosshair lines */}
              <line x1="40" y1="2" x2="40" y2="24" stroke="#C9A84C" strokeWidth="2" opacity="0.5"/>
              <line x1="40" y1="56" x2="40" y2="78" stroke="#C9A84C" strokeWidth="2" opacity="0.5"/>
              <line x1="2" y1="40" x2="24" y2="40" stroke="#C9A84C" strokeWidth="2" opacity="0.5"/>
              <line x1="56" y1="40" x2="78" y2="40" stroke="#C9A84C" strokeWidth="2" opacity="0.5"/>
            </svg>
          </div>

          {state === 'success' ? (
            /* SUCCESS STATE */
            <div className="success-card" role="status" aria-live="polite">
              <span className="success-icon" aria-hidden="true">🏆</span>
              <h1 className="success-title">Você está dentro!</h1>
              <p className="success-text">
                Notificações ativadas! Veja os avisos logo abaixo no nosso mural.
              </p>
            </div>
          ) : (
            /* DEFAULT STATE */
            <>
              <h1 className="landing-headline">
                Avisos
                <span>Sportshot</span>
              </h1>

              <p className="landing-subtitle">
                Ative e receba convites, torneios e novidades exclusivas direto no seu celular.
              </p>

              <div className="benefits" aria-label="Benefícios">
                <div className="benefit-item">
                  <span className="benefit-icon" aria-hidden="true">🏆</span>
                  <span className="benefit-text">Convites para torneios</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon" aria-hidden="true">🎯</span>
                  <span className="benefit-text">Eventos e novidades</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon" aria-hidden="true">⭐</span>
                  <span className="benefit-text">Promoções exclusivas</span>
                </div>
              </div>

              {state === 'unsupported' ? (
                <div className="error-banner" role="alert">
                  ⚠️ Navegador não suportado. Use o Chrome ou Firefox.
                </div>
              ) : state === 'denied' ? (
                <div className="error-banner" role="alert">
                  🔒 Permissão negada. Ative as notificações deste site nas configurações.
                </div>
              ) : (
                <>
                  <button
                    id="subscribe-btn"
                    className={`cta-button ${state === 'loading' ? 'loading' : ''}`}
                    onClick={handleSubscribe}
                    disabled={state === 'loading'}
                    aria-label="Ativar notificações do clube Sportshot"
                  >
                    {state === 'loading' ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Ativando...
                      </>
                    ) : (
                      <>
                        🔔 Receber Avisos
                      </>
                    )}
                  </button>

                  {state === 'error' && (
                    <div className="error-banner" role="alert">
                      ❌ {error || 'Não foi possível ativar. Tente novamente.'}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <p className="landing-footer" aria-label="Rodapé">
            Sportshot • Dados Seguros
          </p>
        </div>
      </main>

      {/* Mural Sidebar (Right Column on Desktop, Bottom on Mobile) */}
      <aside className="mural-sidebar" aria-label="Mural de avisos Sportshot">
        <div className="notices-panel">
          <h2 className="notices-title">Últimos Avisos</h2>
          
          {notices.length === 0 && !loadingNotices ? (
            <div className="notices-end">
              Nenhum aviso por enquanto.
            </div>
          ) : (
            <>
              <div className="notices-list">
                {notices.map((notice) => (
                  <div key={notice.$id} className="notice-card new-notice-animation">
                    <div className="notice-header">
                      <span className="notice-date">
                        {new Date(notice.createdAt).toLocaleDateString('pt-BR', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                      {notice.sender && (
                        <span className="notice-sender">
                          por {notice.sender}
                        </span>
                      )}
                    </div>
                    <h3 className="notice-title">{notice.title}</h3>
                    <p className="notice-body">{notice.body}</p>
                    {notice.image && notice.image.trim() !== '' && (
                      <img 
                        src={notice.image} 
                        alt={notice.title} 
                        className="notice-image" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }} 
                      />
                    )}
                    {notice.url && notice.url !== '/' && notice.url !== 'https://sportshot.simplemsg.net.br/' && (
                      <a href={notice.url} target="_blank" rel="noopener noreferrer" className="notice-link">
                        Saber mais →
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Scroll Trigger for Infinite Loading */}
              {hasMore && notices.length > 0 ? (
                <div id="scroll-trigger" className="notices-loading">
                  {loadingNotices ? 'Carregando...' : ''}
                </div>
              ) : (
                notices.length > 0 && (
                  <div className="notices-end">
                    Fim dos avisos.
                  </div>
                )
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
