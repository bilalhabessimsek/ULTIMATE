import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Cloud, Pin, Trash2, Tag, FileText, MonitorSmartphone } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { cn } from '../lib/utils'

type Note = {
  id: string
  title: string
  content: string
  updatedAt: number
  tag: string
  pinned: boolean
}

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const [rainmeterPath, setRainmeterPath] = useState<string | null>(null)
  
  // DİKKAT: Zamanlayıcı tipi any olarak düzeltildi
  const rainmeterTimerRef = useRef<any>(null)

  useEffect(() => {
    const savedNotes = localStorage.getItem('ultimate_notes')
    const savedRainmeter = localStorage.getItem('rainmeter_path')
    
    if (savedRainmeter) setRainmeterPath(savedRainmeter)

    if (savedNotes) {
      const parsed = JSON.parse(savedNotes)
      setNotes(parsed)
      if (parsed.length > 0) setActiveId(parsed[0].id)
    } else {
      const welcomeNote: Note = {
        id: Date.now().toString(),
        title: 'Ultimate Notlara Hoş Geldin!',
        content: 'Burası senin kişisel alanın.',
        updatedAt: Date.now(),
        tag: 'sistem',
        pinned: true
      }
      setNotes([welcomeNote])
      setActiveId(welcomeNote.id)
    }
  }, [])

  useEffect(() => {
    if (notes.length >= 0) {
      setIsSaving(true)
      localStorage.setItem('ultimate_notes', JSON.stringify(notes))
      
      if (rainmeterPath) {
        if (rainmeterTimerRef.current) clearTimeout(rainmeterTimerRef.current)
        
        rainmeterTimerRef.current = setTimeout(() => {
          const sortedForRainmeter = [...notes].sort((a,b) => {
            if (a.pinned && !b.pinned) return -1
            if (!a.pinned && b.pinned) return 1
            return b.updatedAt - a.updatedAt
          }).slice(0, 10)
          
          // Orijinal To-Do Formatı ve Windows Satır Başı
          const content = sortedForRainmeter.length > 0 
            ? sortedForRainmeter.map(n => `0|${n.title || 'İsimsiz Not'}`).join('\r\n') 
            : '0|'
          
          invoke('save_txt_file', { path: rainmeterPath, content })
            .catch(err => console.error('Rainmeter Senk. Hatası:', err))
            
        }, 1500)
      }

      const timer = setTimeout(() => setIsSaving(false), 500)
      return () => clearTimeout(timer)
    }
  }, [notes, rainmeterPath])

  const activeNote = notes.find(n => n.id === activeId)

  const setupRainmeter = async () => {
    try {
      const path = await open({ 
        multiple: false,
        filters: [{ name: 'Metin Belgesi', extensions: ['txt'] }],
        title: "Rainmeter eklentisinin 'tasks.txt' dosyasını seçin"
      })
      
      if (path && typeof path === 'string') {
        setRainmeterPath(path)
        localStorage.setItem('rainmeter_path', path)
        alert(`Bağlantı başarılı! 🚀\nNotlar şu dosyaya yazılacak:\n${path}\n\nNot: Eklentinin güncellenmesi için Rainmeter'a sağ tıklayıp 'Yenile' demeyi unutma!`)
        setNotes([...notes]) 
      }
    } catch(e) {
      console.error(e)
    }
  }

  const createNewNote = () => {
    const newNote: Note = { id: Date.now().toString(), title: '', content: '', updatedAt: Date.now(), tag: 'genel', pinned: false }
    setNotes([newNote, ...notes])
    setActiveId(newNote.id)
    setSearchQuery('')
  }

  const deleteNote = (id: string) => {
    if (!confirm("Bu notu silmek istediğine emin misin?")) return
    const newNotes = notes.filter(n => n.id !== id)
    setNotes(newNotes)
    if (activeId === id) setActiveId(newNotes.length > 0 ? newNotes[0].id : null)
  }

  const togglePin = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n))
  }

  const updateActiveNote = (field: keyof Note, value: string) => {
    if (!activeId) return
    setNotes(notes.map(n => n.id === activeId ? { ...n, [field]: value, updatedAt: Date.now() } : n))
  }

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tag.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt - a.updatedAt
  })

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <div className="flex w-full shrink-0 flex-col border-r border-border bg-sidebar md:w-[400px]">
        <div className="flex items-center justify-between px-5 pt-5">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-primary" /> Notlarım
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={setupRainmeter} 
              className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer", rainmeterPath ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground")}
              title="Rainmeter'a Bağla (tasks.txt seç)"
            >
              <MonitorSmartphone className="h-5 w-5" />
            </button>
            <button 
              onClick={createNewNote} 
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              title="Yeni Not Oluştur"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Notlarda ara..." className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {filteredNotes.length === 0 ? (
            <div className="text-center mt-10"><p className="text-sm text-muted-foreground">Aradığınız not bulunamadı.</p></div>
          ) : (
            filteredNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => setActiveId(note.id)}
                className={cn('group mb-1 flex flex-col w-full rounded-xl px-4 py-3 text-left transition-colors cursor-pointer border', activeId === note.id ? 'bg-accent border-border shadow-sm' : 'bg-sidebar border-transparent hover:bg-accent/40')}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={cn("flex items-center gap-1.5 truncate text-[15px] font-bold", activeId === note.id ? "text-primary" : "text-foreground")}>
                    {note.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" />}
                    {note.title || "İsimsiz Not"}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap pt-0.5">{formatDate(note.updatedAt)}</span>
                </div>
                <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/80 mb-2 min-h-[38px]">{note.content || "Boş not..."}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                    <Tag className="h-3 w-3" /> {note.tag}
                  </span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); togglePin(note.id); }} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md" title={note.pinned ? "Sabitlemeyi Kaldır" : "Sabitle"}><Pin className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-md" title="Sil"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-background relative">
        {activeNote ? (
          <>
            <header className="flex items-center justify-between border-b border-border px-8 py-4 bg-background/95 backdrop-blur z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-sidebar border border-border px-3 py-1.5 rounded-lg focus-within:border-primary/50 transition-colors">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <input type="text" value={activeNote.tag} onChange={(e) => updateActiveNote('tag', e.target.value)} className="bg-transparent text-xs font-mono text-foreground focus:outline-none w-24" placeholder="Etiket..." />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Son düzenleme: {new Date(activeNote.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors", isSaving ? "text-amber-500 bg-amber-500/10" : "text-green-500 bg-green-500/10")}>
                  {isSaving ? <Cloud className="h-3.5 w-3.5 animate-pulse" /> : <Cloud className="h-3.5 w-3.5" />}
                  {isSaving ? 'Kaydediliyor...' : 'Kaydedildi'}
                </span>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12 flex flex-col gap-6">
              <input type="text" value={activeNote.title} onChange={(e) => updateActiveNote('title', e.target.value)} placeholder="Not Başlığı..." className="w-full bg-transparent text-4xl font-black tracking-tight text-foreground focus:outline-none placeholder:text-muted-foreground/50" />
              <textarea value={activeNote.content} onChange={(e) => updateActiveNote('content', e.target.value)} placeholder="Aklındakileri buraya dök..." className="w-full flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-foreground/90 focus:outline-none placeholder:text-muted-foreground/50 scrollbar-hide" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-60">
            <FileText className="h-20 w-20 mb-6" strokeWidth={1} />
            <h2 className="text-2xl font-bold tracking-tight mb-2">Not Seçilmedi</h2>
            <p>Listeden bir not seçin veya yeni bir not oluşturun.</p>
          </div>
        )}
      </div>
    </div>
  )
}