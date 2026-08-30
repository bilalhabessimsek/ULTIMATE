import { useState, ComponentType, FC } from 'react'
import {
  FileText,
  GitBranch,
  Music,
  Command,
  Search,
  Settings,
  FolderOpen, // KLASÖR İKONU EKLENDİ
  type LucideProps,
} from 'lucide-react'
import { NotesView } from './components/NotesView'
import { GithubView } from './components/GithubView'
import { PlayerView } from './components/PlayerView'
import { ProjectsView } from './components/ProjectsView' // YEREL PROJELER EKRANI ÇAĞRILDI
import { cn } from './lib/utils'

// 4. MENÜ ID'Sİ EKLENDİ ('projects')
type ViewId = 'notes' | 'github' | 'player' | 'projects'

interface NavItem {
  id: ViewId
  label: string
  icon: ComponentType<LucideProps>
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'notes', label: 'Notes', icon: FileText },
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
}

const DesktopSidebar: FC<DesktopSidebarProps> = ({ currentView, onSetView }) => (
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
      <span
        className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-900 text-xs font-semibold text-primary-foreground"
        aria-label="User Profile"
      >
        BL
      </span>
    </div>
  </aside>
)

interface MobileNavProps {
  currentView: ViewId
  onSetView: (view: ViewId) => void
}

const MobileNav: FC<MobileNavProps> = ({ currentView, onSetView }) => (
  <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
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
  </nav>
)

export default function App() {
  const [view, setView] = useState<ViewId>('notes')

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <DesktopSidebar currentView={view} onSetView={setView} />
      
      <main className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0 h-full w-full">
        {/* YEREL PROJELER EKRANI (ProjectsView) BURAYA EKLENDİ */}
        <div className={cn("h-full w-full", view === 'notes' ? 'block' : 'hidden')}>
          <NotesView />
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

      <MobileNav currentView={view} onSetView={setView} />
    </div>
  )
}