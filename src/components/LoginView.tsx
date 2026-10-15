import { useState } from 'react'
import { Command, Lock, Mail, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export function LoginView() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

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
          <div className="mb-6 flex items-center gap-1 rounded-xl bg-background p-1 text-sm font-bold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setInfo(null) }}
              className={`flex-1 rounded-lg py-2 transition-colors cursor-pointer ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setInfo(null) }}
              className={`flex-1 rounded-lg py-2 transition-colors cursor-pointer ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Hesap Oluştur
            </button>
          </div>

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
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Veriler yalnızca bu hesaba görünür (Satır Düzeyi Güvenlik / RLS).
        </p>
      </div>
    </div>
  )
}
