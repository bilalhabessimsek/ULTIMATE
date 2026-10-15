import { useState } from 'react'
import { Command, Lock, Mail, Loader2, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 'reset'        : e-posta girilir, sifirlama kodu istenir
// 'resetConfirm' : gelen 6 haneli kod + yeni sifre girilir
type Mode = 'login' | 'signup' | 'reset' | 'resetConfirm'

interface LoginViewProps {
  /**
   * Sifre sifirlama sirasinda true olur. App bu bayrak acikken ana ekrana
   * gecmez; boylece kod dogrulandiktan sonra sifre guncellenip mesaj
   * gosterilebilir (oturum hemen acilsa bile ekran degismez).
   */
  onRecoveryBusyChange?: (busy: boolean) => void
}

export function LoginView({ onRecoveryBusyChange }: LoginViewProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const goTo = (next: Mode) => {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error

        // E-posta onayı açıksa oturum hemen açılmaz
        if (!data.session) {
          setInfo('Hesap oluşturuldu. E-postana gelen onay bağlantısına tıkladıktan sonra giriş yapabilirsin.')
          setMode('login')
        }
      }
    } catch (err: any) {
      const message: string = err?.message || 'Bilinmeyen bir hata oluştu.'
      if (message.toLowerCase().includes('invalid login credentials')) {
        setError('E-posta veya şifre hatalı.')
      } else if (message.toLowerCase().includes('email not confirmed')) {
        setError('E-posta adresin henüz onaylanmamış. Gelen kutunu kontrol et.')
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 1. adım: sifirlama kodu iste
  const requestResetCode = async () => {
    setError(null)
    setInfo(null)

    const mail = email.trim()
    if (!mail) {
      setError('E-posta adresini gir.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(mail)
      if (error) throw error

      setCode('')
      setNewPassword('')
      setNewPassword2('')
      setMode('resetConfirm')
      setInfo('E-postana 6 haneli bir sıfırlama kodu gönderdik. Kodu ve yeni şifreni gir.')
    } catch (err: any) {
      const message: string = err?.message || 'Kod gönderilemedi.'
      if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many')) {
        setError('Çok fazla kod istedin. Birkaç dakika bekleyip tekrar dene.')
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetRequest = (e: React.FormEvent) => {
    e.preventDefault()
    void requestResetCode()
  }

  // 2. adım: kodu dogrula + yeni sifreyi kaydet
  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const mail = email.trim()
    const token = code.replace(/\D/g, '')
    if (!mail) {
      setError('E-posta adresi eksik. Baştan başla.')
      return
    }
    if (token.length < 6) {
      setError('E-postandaki 6 haneli kodu gir.')
      return
    }
    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalı.')
      return
    }
    if (newPassword !== newPassword2) {
      setError('İki şifre birbiriyle uyuşmuyor.')
      return
    }

    setIsLoading(true)
    // Kod dogrulaninca oturum acilir; App'in ana ekrana gecmemesi icin kilit
    onRecoveryBusyChange?.(true)
    let completed = false
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: mail,
        token,
        type: 'recovery',
      })
      if (error) throw error

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      completed = true
      setInfo('Şifren güncellendi! Uygulama açılıyor...')
      window.setTimeout(() => onRecoveryBusyChange?.(false), 1200)
    } catch (err: any) {
      // Yarim kalan oturum varsa kapat ki kullanici giris ekraninda kalsin
      try {
        await supabase.auth.signOut()
      } catch {
        /* yoksay */
      }
      onRecoveryBusyChange?.(false)

      const message: string = err?.message || 'Kod doğrulanamadı.'
      const lower = message.toLowerCase()
      if (lower.includes('expired') || lower.includes('invalid') || lower.includes('token')) {
        setError('Kod geçersiz veya süresi dolmuş. "Kodu tekrar gönder" ile yeni kod isteyebilirsin.')
      } else {
        setError(message)
      }
    } finally {
      if (!completed) setIsLoading(false)
    }
  }

  const isResetMode = mode === 'reset' || mode === 'resetConfirm'

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Command className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">ULTIMATE</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notların, takvimin ve listelerin senin hesabına bağlı.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-sidebar p-8 shadow-2xl">
          {isResetMode ? (
            <div className="mb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => goTo('login')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                aria-label="Geri"
                title="Girişe dön"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-bold">Şifremi Unuttum</p>
                <p className="text-[11px] text-muted-foreground">
                  {mode === 'reset' ? 'E-postana kod gönderelim' : 'Kodu gir ve yeni şifreni belirle'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-1 rounded-xl bg-background p-1 text-sm font-bold">
              <button
                type="button"
                onClick={() => goTo('login')}
                className={`flex-1 rounded-lg py-2 transition-colors cursor-pointer ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => goTo('signup')}
                className={`flex-1 rounded-lg py-2 transition-colors cursor-pointer ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Hesap Oluştur
              </button>
            </div>
          )}

          {/* --- Giriş / Kayıt --- */}
          {!isResetMode && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-posta</span>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@mail.com"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Şifre</span>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => goTo('reset')}
                  className="self-end text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary cursor-pointer"
                >
                  Şifremi unuttum
                </button>
              )}

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs font-medium text-green-400">
                  {info}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
              </button>
            </form>
          )}

          {/* --- Şifre sıfırlama: e-posta --- */}
          {mode === 'reset' && (
            <form onSubmit={handleResetRequest} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hesabının e-postası</span>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@mail.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                Sıfırlama Kodu Gönder
              </button>

              <p className="text-center text-[11px] text-muted-foreground">
                E-postandaki 6 haneli kodu uygulamaya gireceksin.
              </p>
            </form>
          )}

          {/* --- Şifre sıfırlama: kod + yeni şifre --- */}
          {mode === 'resetConfirm' && (
            <form onSubmit={handleResetConfirm} className="flex flex-col gap-4">
              <p className="rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                Kod gönderilen adres: <span className="font-semibold text-foreground">{email.trim()}</span>
              </p>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">6 Haneli Kod</span>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-full bg-transparent text-lg font-bold tracking-[0.4em] outline-none"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Yeni Şifre</span>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="en az 6 karakter"
                    autoComplete="new-password"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Yeni Şifre (tekrar)</span>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs font-medium text-green-400">
                  {info}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Şifreyi Güncelle
              </button>

              <button
                type="button"
                onClick={handleResetRequest}
                disabled={isLoading}
                className="text-center text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary disabled:opacity-60 cursor-pointer"
              >
                Kod gelmedi mi? Tekrar gönder
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Veriler yalnızca bu hesaba görünür (Satır Düzeyi Güvenlik / RLS).
        </p>
      </div>
    </div>
  )
}
