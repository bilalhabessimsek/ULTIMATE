import { useState, useEffect } from 'react'
import { FolderOpen, Code, Layers, FolderPlus, Trash2, Terminal, Rocket, Search, Loader2, Smartphone, Cpu } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

type Project = { name: string; path: string; ptype: string; }

export function ProjectsView() {
  const [rootFolders, setRootFolders] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('ultimate_project_roots')
    if (saved) {
      const folders = JSON.parse(saved)
      setRootFolders(folders)
      scanAllRoots(folders)
    }
  }, [])

  const scanAllRoots = async (folders: string[]) => {
    setIsLoading(true)
    let allProjects: Project[] = []
    for (const folder of folders) {
      try {
        const res = await invoke<Project[]>('get_projects', { folderPath: folder })
        allProjects = [...allProjects, ...res]
      } catch (err) { console.error(err) }
    }
    setProjects(allProjects)
    setIsLoading(false)
  }

  const addRootFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false })
      if (selected && typeof selected === 'string') {
        if (rootFolders.includes(selected)) return alert("Bu klasör zaten ekli!")
        const newFolders = [...rootFolders, selected]
        setRootFolders(newFolders)
        localStorage.setItem('ultimate_project_roots', JSON.stringify(newFolders))
        scanAllRoots(newFolders)
      }
    } catch (err) { console.error(err) }
  }

  const removeRootFolder = (folder: string) => {
    const newFolders = rootFolders.filter(f => f !== folder)
    setRootFolders(newFolders)
    localStorage.setItem('ultimate_project_roots', JSON.stringify(newFolders))
    scanAllRoots(newFolders)
  }

  const openInIde = async (path: string, ide: string) => {
    try {
      await invoke('open_in_ide', { path, ide })
    } catch (err) {
      alert("Hata: " + err + "\n\nNot: IDE'nin bilgisayarında kurulu ve 'Path' (Ortam Değişkenleri) ayarlarına ekli olduğundan emin ol.")
    }
  }

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.ptype.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex h-full w-full flex-col md:flex-row relative">
      <div className="flex w-full shrink-0 flex-col border-r border-border bg-sidebar md:w-[350px] z-10">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Layers className="h-6 w-6 text-primary" /> Kayıtlı Dizinler
          </h1>
          <button onClick={addRootFolder} className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors" title="Ana Klasör Ekle">
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {rootFolders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center mt-4">Projelerinin bulunduğu bir ana klasör ekle (Örn: C:\Projelerim)</p>
          ) : (
            rootFolders.map((folder, idx) => (
              <div key={idx} className="flex items-center justify-between bg-background border border-border p-3 rounded-xl group hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FolderOpen className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-mono truncate" title={folder}>{folder}</span>
                </div>
                <button onClick={() => removeRootFolder(folder)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-background relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2 border-b border-border p-8 pb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Geliştirme Stüdyosu</h2>
            <p className="text-muted-foreground mt-2">Unuttuğun projelerini bul ve tek tıkla IDE'nde ayağa kaldır.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-sidebar px-3 py-2.5 focus-within:ring-1 focus-within:ring-primary/50 transition-all w-full max-w-xs shadow-inner">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Proje veya teknoloji ara..." className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
              <Rocket className="h-16 w-16 mb-4" />
              <p className="text-xl font-bold">Proje Bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredProjects.map((p, i) => (
                <div key={i} className="flex flex-col bg-sidebar border border-border p-5 rounded-2xl shadow-sm hover:border-primary/50 transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors flex items-center gap-2 truncate">
                      <Code className="h-5 w-5 text-muted-foreground" /> {p.name}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary text-muted-foreground px-2 py-1 rounded-md shrink-0">
                      {p.ptype}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate mb-5 opacity-70" title={p.path}>{p.path}</p>
                  
                  {/* BUTONLAR (FLEX-WRAP İLE YAN YANA VE ALTA SARKACAK ŞEKİLDE) */}
                  <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-border">
                    <button onClick={() => openInIde(p.path, 'vscode')} className="flex-1 min-w-[90px] flex justify-center items-center gap-1.5 bg-[#0066b8]/10 text-[#007acc] hover:bg-[#0066b8] hover:text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer" title="VS Code">
                      <Terminal className="h-4 w-4" /> VS Code
                    </button>
                    
                    {p.ptype.includes("Visual Studio") && (
                      <button onClick={() => openInIde(p.path, 'visual_studio')} className="flex-1 min-w-[90px] flex justify-center items-center gap-1.5 bg-[#5c2d91]/10 text-[#5c2d91] hover:bg-[#5c2d91] hover:text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer" title="Visual Studio">
                        <Code className="h-4 w-4" /> V. Studio
                      </button>
                    )}

                    <button onClick={() => openInIde(p.path, 'eclipse')} className="flex-1 min-w-[90px] flex justify-center items-center gap-1.5 bg-[#2C2255]/10 text-[#9b59b6] hover:bg-[#2C2255] hover:text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer" title="Eclipse">
                      <Cpu className="h-4 w-4" /> Eclipse
                    </button>

                    <button onClick={() => openInIde(p.path, 'android_studio')} className="flex-1 min-w-[90px] flex justify-center items-center gap-1.5 bg-[#3DDC84]/10 text-[#3DDC84] hover:bg-[#3DDC84] hover:text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer" title="Android Studio">
                      <Smartphone className="h-4 w-4" /> A. Studio
                    </button>

                    <button onClick={() => openInIde(p.path, 'explorer')} className="flex justify-center items-center px-4 bg-secondary text-foreground hover:bg-secondary/80 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer" title="Klasörü Aç">
                      <FolderOpen className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}