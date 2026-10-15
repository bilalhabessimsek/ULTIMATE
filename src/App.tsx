import { useEffect, useState, ComponentType, FC } from 'react'
import {
  FileText,
  GitBranch,
  Music,
  Command,
  Search,
  Settings,
  FolderOpen, // KLASÖR İKONU EKLENDİ
  CalendarDays, // TAKVİM İKONU EKLENDİ
  LogOut, // OTURUM KAPATMA İKONU EKLENDİ
  type LucideProps,
} from 'lucide-react'
import { NotesView } from './components/NotesView'
import { GithubView } from './components/GithubView'
import { PlayerView } from './components/PlayerView'
import { ProjectsView } from './components/ProjectsView' // YEREL PROJELER EKRANI ÇAĞRILDI
import { CalendarView } from './components/CalendarView' // TAKVİM EKRANI ÇAĞRILDI
import { SetupWizard } from './components/SetupWizard' // İLK KURULUM SİHİRBAZI ÇAĞRILDI
import { LoginView } from './components/LoginView' // GİRİŞ EKRANI ÇAĞRILDI
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { cn } from './lib/utils'

// 4. MENÜ ID'Sİ EKLENDİ ('projects')
// 5. MENÜ ID'Sİ EKLENDİ ('calendar')
type ViewId = 'notes' | 'calendar' | 'github' | 'player' | 'projects'

interface NavItem {
  id: ViewId
  label: string
  icon: ComponentType<LucideProps>
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays }, // TAKVİM MENÜSÜ EKLENDİ
  { id: 'projects', label: 'Projects', icon: FolderOpen }, // YENİ MENÜ BUTONUMUZ
  { id: 'github', label: 'Repositories', icon: GitBranch },
  { id: 'player', label: 'Player', icon: Music },
]

interface ActionItem {
  id: string
  label: string
  icon: ComponentType<LucideProps>
}

const ACTION_ITEMS: readonly ActionItem[] = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// --- Reusable Components ---
interface SidebarButtonProps {
  icon: ComponentType<LucideProps>
  label: string
  onClick?: () => void
  isActive?: boolean
}

const SidebarButton: FC<SidebarButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  isActive = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={cn(
      'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
      isActive
        ? 'bg-accent text-primary'
        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
    )}
  >
    {isActive && (
      <span aria-hidden="true" className="absolute -left-2.5 h-6 w-1 rounded-full bg-primary" />
    )}
    <Icon className="h-5 w-5" />
  </button>
)

// --- Main Layout Components ---
interface DesktopSidebarProps {
  currentView: ViewId
  onSetView: (view: ViewId) => void
  onSignOut: () => void
  email: string | null
}

const DesktopSidebar: FC<DesktopSidebarProps> = ({ currentView, onSetView, onSignOut, email }) => (
  <aside className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-4 md:flex z-50">
    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
      <Command className="h-5 w-5" />
    </div>

    {NAV_ITEMS.map(({ id, label, icon }) => (
      <SidebarButton
        key={id}
        icon={icon}
        label={label}
        onClick={() => onSetView(id)}
        isActive={currentView === id}
      />
    ))}

    <div className="mt-auto flex flex-col items-center gap-1">
      {ACTION_ITEMS.map(({ id, label, icon }) => (
        <SidebarButton key={id} icon={icon} label={label} />
      ))}
      <button
        type="button"
        onClick={onSignOut}
        title="Oturumu Kapat"
        aria-label="Oturumu Kapat"
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <LogOut className="h-5 w-5" />
      </button>
      <span
        className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-900 text-xs font-semibold text-primary-foreground uppercase"
        title={email || 'Hesap'}
        aria-label="User Profile"
      >
        {email ? email.slice(0, 2) : 'BL'}
      </span>
    </div>

    <div className="mt-3 mb-1 select-none font-mono text-[9px] text-zinc-700 [writing-mode:vertical-lr] rotate-180">
      DEVELOPED BY BİLAL
    </div>
  </aside>
)

interface MobileNavProps {
  currentView: ViewId
  onSetView: (view: ViewId) => void
  onSignOut: () => void
}

const MobileNav: FC<MobileNavProps> = ({ currentView, onSetView, onSignOut }) => (
  <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
    <div className="pointer-events-none absolute inset-x-0 -top-4 select-none text-center font-mono text-[9px] text-zinc-700">
      DEVELOPED BY BİLAL
    </div>
    {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        type="button"
        onClick={() => onSetView(id)}
        className={cn(
          'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
          currentView === id ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </button>
    ))}
    <button
      type="button"
      onClick={onSignOut}
      className="flex w-14 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-red-400"
    >
      <LogOut className="h-5 w-5" />
      Çıkış
    </button>
  </nav>
)

export default function App() {
  const [view, setView] = useState<ViewId>('notes')
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    if (!confirm('Oturumu kapatmak istediğine emin misin? (Veriler hesabında güvende kalır)')) return
    await supabase.auth.signOut()
  }

  if (!authReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-muted-foreground">
        Yükleniyor...
      </div>
    )
  }

  // Oturum yoksa: giriş ekranı. Görünümler ancak giriş yapıldıktan sonra mount edilir,
  // böylece yetkisiz sorgu ve realtime aboneliği oluşmaz.
  if (!session) {
    return <LoginView />
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <DesktopSidebar
        currentView={view}
        onSetView={setView}
        onSignOut={handleSignOut}
        email={session.user.email ?? null}
      />
      
      <main className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0 h-full w-full">
        {/* YEREL PROJELER EKRANI (ProjectsView) BURAYA EKLENDİ */}
        <div className={cn("h-full w-full", view === 'notes' ? 'block' : 'hidden')}>
          <NotesView />
        </div>
        <div className={cn("h-full w-full", view === 'calendar' ? 'block' : 'hidden')}>
          <CalendarView />
        </div>
        <div className={cn("h-full w-full", view === 'projects' ? 'block' : 'hidden')}>
          <ProjectsView />
        </div>
        <div className={cn("h-full w-full", view === 'github' ? 'block' : 'hidden')}>
          <GithubView />
        </div>
        <div className={cn("h-full w-full", view === 'player' ? 'block' : 'hidden')}>
          <PlayerView />
        </div>
      </main>

      <MobileNav currentView={view} onSetView={setView} onSignOut={handleSignOut} />

      {/* İLK KURULUM: Rainmeter widget kurulum sihirbazı */}
      <SetupWizard />
    </div>
  )
}