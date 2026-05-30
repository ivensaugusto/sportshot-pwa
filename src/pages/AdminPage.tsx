import { useState, useEffect } from 'react';
import { account, functions, FUNCTION_ID, storage } from '../lib/appwrite';
import type { Models } from 'appwrite';

type SendState = 'idle' | 'loading' | 'success' | 'error';
type AuthState = 'checking' | 'unauthenticated' | 'authenticated';

interface DispatchResult {
  sent: number;
  failed: number;
  removed: number;
}

const processImageTo21 = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      // 1. Create a 1200 x 600 canvas (2:1 aspect ratio)
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto 2D do Canvas'));
        return;
      }

      // ─── BACKGROUND LAYER: Blurred cover ───
      const cw = 1200;
      const ch = 600;
      const scaleBg = Math.max(cw / img.width, ch / img.height);
      const bgW = img.width * scaleBg;
      const bgH = img.height * scaleBg;
      const bgX = (cw - bgW) / 2;
      const bgY = (ch - bgH) / 2;

      // Draw raw image for backing
      ctx.drawImage(img, bgX, bgY, bgW, bgH);
      
      // Semi-transparent dark backing
      ctx.save();
      ctx.fillStyle = 'rgba(10, 10, 11, 0.7)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();

      // Apply blur filter if supported
      if ('filter' in ctx) {
        ctx.save();
        ctx.filter = 'blur(28px) brightness(0.5)';
        ctx.drawImage(img, bgX, bgY, bgW, bgH);
        ctx.restore();
      }

      // ─── FOREGROUND LAYER: Aspect ratio fitted uncropped image ───
      const scaleFg = Math.min(cw / img.width, ch / img.height);
      const fgW = img.width * scaleFg;
      const fgH = img.height * scaleFg;
      const fgX = (cw - fgW) / 2;
      const fgY = (ch - fgH) / 2;

      // Draw subtle shadow for premium effect
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(img, fgX, fgY, fgW, fgH);
      ctx.restore();

      // Convert canvas to blob and then to File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(processedFile);
          } else {
            reject(new Error('Falha ao gerar o blob da imagem.'));
          }
        },
        'image/jpeg',
        0.9 // high quality compression
      );
      
      // Cleanup object URL
      URL.revokeObjectURL(img.src);
    };
    img.onerror = (err) => {
      reject(err);
      URL.revokeObjectURL(img.src);
    };
  });
};

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [optimizeImage, setOptimizeImage] = useState(true);
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
      let finalImageUrl = '';
      let fileToUpload = imageFile;

      if (imageFile && optimizeImage) {
        try {
          fileToUpload = await processImageTo21(imageFile);
        } catch (procErr: unknown) {
          console.error('[Image Optimization] Failed, uploading original:', procErr);
          // Fallback to original image if processing fails
        }
      }

      if (fileToUpload) {
        try {
          // Upload file using unique ID
          const uploaded = await storage.createFile(
            'notices-images',
            'unique()',
            fileToUpload
          );
          
          // Get direct preview/view URL from Appwrite
          finalImageUrl = storage.getFileView('notices-images', uploaded.$id).toString();
        } catch (uploadErr: unknown) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Falha no upload da imagem';
          setSendError(`Erro ao fazer upload da imagem: ${msg}`);
          setSendState('error');
          return;
        }
      }

      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({ 
          title: title.trim(), 
          body: body.trim(),
          url: url.trim() || '/',
          sender: user?.name || user?.email || 'Administrador',
          image: finalImageUrl
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
        setImageFile(null);
        setImagePreview('');
        setOptimizeImage(true);
        const fileInput = document.getElementById('notif-image') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
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

            <div className="form-group">
              <label htmlFor="notif-image" className="form-label">Imagem de Ilustração (Opcional)</label>
              <input
                id="notif-image"
                type="file"
                accept="image/*"
                className="form-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  } else {
                    setImageFile(null);
                    setImagePreview('');
                  }
                }}
              />
              {imageFile && (
                <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: '12px 0 6px 2px', fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={optimizeImage}
                    onChange={(e) => setOptimizeImage(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer' }}
                  />
                  <span>Otimizar imagem para notificações (evita cortes no celular)</span>
                </label>
              )}
              {imagePreview && (
                <div className="image-preview-container">
                  <span className="preview-label">Pré-visualização da imagem:</span>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="admin-image-preview" 
                  />
                </div>
              )}
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
