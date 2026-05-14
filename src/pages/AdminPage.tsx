import { useState, useEffect } from 'react';
import { account, functions, FUNCTION_ID } from '../lib/appwrite';
import type { Models } from 'appwrite';

type SendState = 'idle' | 'loading' | 'success' | 'error';
type AuthState = 'checking' | 'unauthenticated' | 'authenticated';

interface DispatchResult {
  sent: number;
  failed: number;
  removed: number;
}

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [result, setResult] = useState<DispatchResult | null>(null);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    account.get()
      .then((u) => {
        setUser(u);
        setAuthState('authenticated');
      })
      .catch(() => setAuthState('unauthenticated'));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await account.createEmailPasswordSession(email, password);
      const u = await account.get();
      setUser(u);
      setAuthState('authenticated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email ou senha incorretos.';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await account.deleteSession('current');
    setUser(null);
    setAuthState('unauthenticated');
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSendState('loading');
    setResult(null);
    setSendError('');

    try {
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({ 
          title: title.trim(), 
          body: body.trim(),
          url: url.trim() || '/',
          sender: user?.name || user?.email || 'Administrador'
        }),
        false
      );

      if (execution.status === 'completed') {
        const parsed: DispatchResult = JSON.parse(execution.responseBody);
        setResult(parsed);
        setSendState('success');
        setTitle('');
        setBody('');
        setUrl('');
      } else {
        setSendError(`Erro na execução: ${execution.status}`);
        setSendState('error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao disparar notificações.';
      setSendError(msg);
      setSendState('error');
    }
  };

  // ─── Checking auth state ───
  if (authState === 'checking') {
    return (
      <div className="admin-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--gold)' }} />
          <span>Verificando autenticação...</span>
        </div>
      </div>
    );
  }

  // ─── Login Form ───
  if (authState === 'unauthenticated') {
    return (
      <div className="admin-wrapper">
        <div className="login-card" role="main">
          <div className="login-logo">
            <div className="login-logo-icon" aria-hidden="true">🎯</div>
            <h1 className="login-title">Área Administrativa</h1>
            <p className="login-subtitle">Sportshot Clube de Tiro</p>
          </div>

          <form onSubmit={handleLogin} aria-label="Formulário de login">
            <div className="form-group">
              <label htmlFor="admin-email" className="form-label">E-mail</label>
              <input
                id="admin-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sportshot.com.br"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-password" className="form-label">Senha</label>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="error-banner" role="alert" style={{ marginBottom: 12 }}>
                ❌ {loginError}
              </div>
            )}

            <button
              id="login-btn"
              type="submit"
              className="send-button"
              disabled={loginLoading}
              style={{ marginTop: 8 }}
            >
              {loginLoading ? (
                <>
                  <span className="spinner" />
                  Entrando...
                </>
              ) : (
                '🔐 Entrar no Painel'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Admin Panel ───
  return (
    <div className="admin-wrapper">
      <div className="admin-panel" role="main">
        <header className="admin-header">
          <div className="admin-brand">
            <div className="admin-brand-icon" aria-hidden="true">🎯</div>
            <div>
              <div className="admin-brand-name">Sportshot</div>
              <div className="admin-brand-role">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            id="logout-btn"
            className="logout-btn"
            onClick={handleLogout}
            aria-label="Sair do painel administrativo"
          >
            Sair
          </button>
        </header>

        <div className="dispatch-card">
          <h2 className="dispatch-title">📣 Disparar Notificação</h2>
          <p className="dispatch-subtitle">
            A notificação será enviada para todos os inscritos ativos.
          </p>

          <form onSubmit={handleDispatch} aria-label="Formulário de disparo de notificação">
            <div className="form-group">
              <label htmlFor="notif-title" className="form-label">Título da Notificação</label>
              <input
                id="notif-title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Torneio de Tiro Esportivo — Inscrições Abertas!"
                maxLength={80}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notif-body" className="form-label">Mensagem</label>
              <textarea
                id="notif-body"
                className="form-input form-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex: Participe do nosso torneio mensal. Vagas limitadas, inscreva-se agora!"
                maxLength={200}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notif-url" className="form-label">Link de Destino (Opcional)</label>
              <input
                id="notif-url"
                type="url"
                className="form-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ex: https://forms.gle/... ou https://seusite.com/evento"
              />
            </div>

            <button
              id="dispatch-btn"
              type="submit"
              className="send-button"
              disabled={sendState === 'loading'}
              aria-label="Disparar notificação push para todos os inscritos"
            >
              {sendState === 'loading' ? (
                <>
                  <span className="spinner" />
                  Disparando...
                </>
              ) : (
                '🚀 Disparar para Todos'
              )}
            </button>
          </form>

          {sendState === 'success' && result && (
            <div className="result-banner success" role="status" aria-live="polite">
              ✅ Disparado! {result.sent} enviados • {result.failed} falhas • {result.removed} removidos
            </div>
          )}

          {sendState === 'error' && (
            <div className="result-banner error" role="alert">
              ❌ {sendError}
            </div>
          )}

          <div className="stats-card" aria-label="Informações do canal">
            <span className="stats-icon" aria-hidden="true">🔔</span>
            <div className="stats-info">
              <div className="stats-label">Canal de comunicação</div>
              <div className="stats-value" style={{ fontSize: 14, marginTop: 2 }}>
                Web Push — custo zero de envio
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
