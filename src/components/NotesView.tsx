import { useState, useEffect } from 'react'
import { Plus, Search, Pin, Trash2, Tag, FileText, MonitorSmartphone, Download, Upload, Save, Check, Bold, Italic, Heading, ImageIcon } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { convertFileSrc } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'

// TipTap Editör Kütüphaneleri
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

type Note = {
  id: string
  title: string
  content: string // Artık TipTap'in kusursuz HTML formatında saklanacak
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

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, tag, pinned, updated_at')
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const fetchedNotes: Note[] = data.map((note: any) => ({
          id: note.id,
          title: note.title || '',
          content: note.content || '',
          tag: note.tag || 'genel',
          pinned: note.pinned || false,
          updatedAt: note.updated_at
        }))
        setNotes(fetchedNotes)
        if (!activeId) {
          setActiveId(fetchedNotes[0].id)
        }
      } else {
        const welcomeNote: Note = {
          id: Date.now().toString(),
          title: 'İlk Notum 📌',
          content: '<h2>Hoş Geldin!</h2><p>Buraya doğrudan yazabilir, <strong>kalın</strong> yapabilir veya araç çubuğundan resim ekleyebilirsin.</p><img src="https://images.unsplash.com/photo-1506744626753-dfbf0bf35d27?q=80&w=800&auto=format&fit=crop" />',
          updatedAt: Date.now(),
          tag: 'sistem',
          pinned: true
        }
        setNotes([welcomeNote])
        setActiveId(welcomeNote.id)
      }
    } catch (err) {
      console.error('Supabase fetch error:', err)
      const savedNotes = localStorage.getItem('ultimate_notes')
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes)
        setNotes(parsed)
        if (parsed.length > 0 && !activeId) setActiveId(parsed[0].id)
      }
    }
  }

  useEffect(() => {
    const savedRainmeter = localStorage.getItem('rainmeter_path')
    if (savedRainmeter) setRainmeterPath(savedRainmeter)
    fetchNotes()

    const channel = supabase
      .channel('notes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => {
          fetchNotes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const activeNote = notes.find(n => n.id === activeId)

  // TIPTAP EDİTÖR KURULUMU
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Aklındakileri buraya dök, resimleri doğrudan ekle...' })
    ],
    content: activeNote?.content || '',
    onUpdate: ({ editor }) => {
      // Her harf yazıldığında state'i sessizce günceller
      updateActiveNote('content', editor.getHTML())
    },
  })

  // Aktif not değiştiğinde editörün içeriğini güvenle yeniler
  useEffect(() => {
    if (editor && activeNote && editor.getHTML() !== activeNote.content) {
      editor.commands.setContent(activeNote.content)
    }
  }, [activeId, editor])

  // Rainmeter Temizleyici (HTML'i güvenli metne çevirir)
  const cleanForRainmeter = (htmlText: string) => {
    if (!htmlText) return "▪ Boş not."
    const tempDiv = document.createElement('div')
    // Resimleri [Resim] tag'ine çevir
    const processedHtml = htmlText.replace(/<img[^>]*>/gi, ' [Resim] ')
    tempDiv.innerHTML = processedHtml
    return tempDiv.innerText.trim() || "▪ Boş not."
  }

  const handleManualSave = async (latestNotes?: Note[]) => {
    const notesToProcess = latestNotes || notes;
    setIsSaving(true)
    localStorage.setItem('ultimate_notes', JSON.stringify(notesToProcess))

    try {
      for (const note of notesToProcess) {
        const { error } = await supabase.from('notes').upsert({
          id: note.id,
          title: note.title,
          content: note.content,
          tag: note.tag,
          pinned: note.pinned,
          updated_at: note.updatedAt
        })
        if (error) {
          console.error('Supabase upsert error:', error)
        }
      }
    } catch (err) {
      console.error('Supabase save error:', err)
    }

    if (rainmeterPath) {
      const sortedForRainmeter = [...notesToProcess]
        .filter(n => n.pinned)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 8)
      
      // KUSURSUZ TEMİZLİK: Sadece başlığı (title) alıyoruz, içerik/önizleme kısımlarını tamamen sildik!
      const content = sortedForRainmeter.length > 0 
        ? sortedForRainmeter.map(n => `▪ ${n.title || 'İsimsiz Not'}`).join('\r\n')
        : '▪ Sabitlenmis notunuz bulunmuyor.'
      
      try {
        await invoke('save_txt_file', { path: rainmeterPath, content })
      } catch (err) {
        console.error('Rainmeter Kayıt Hatası:', err)
      }
    }
    setTimeout(() => setIsSaving(false), 1000)
  }

  // BİLGİSAYARDAN KUSURSUZ RESİM EKLEME
  const handleInsertImage = async () => {
    if (!editor) return
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Resimler', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
      })
      if (selected && typeof selected === 'string') {
        const safeUrl = convertFileSrc(selected)
        editor.chain().focus().setImage({ src: safeUrl }).run()
      }
    } catch (e) { console.error(e) }
  }

  const handleImportNote = async () => {
    try {
      const selectedPath = await open({ multiple: false, filters: [{ name: 'Metin Belgesi', extensions: ['txt', 'md', 'log'] }] })
      if (selectedPath && typeof selectedPath === 'string') {
        const fileContent = await invoke<number[]>('read_audio_file', { path: selectedPath })
        const text = new TextDecoder('utf-8').decode(new Uint8Array(fileContent))
        const fileName = selectedPath.split('\\').pop()?.split('/').pop()?.replace(/\.[^/.]+$/, "") || "İçe Aktarılan Not"

        const htmlText = text.split('\n').map(line => `<p>${line}</p>`).join('')
        const newNote: Note = { id: Date.now().toString(), title: fileName, content: htmlText, updatedAt: Date.now(), tag: 'içe_aktarıldı', pinned: false }
        
        const newNotesList = [newNote, ...notes]
        setNotes(newNotesList)
        setActiveId(newNote.id)
        handleManualSave(newNotesList)
      }
    } catch (err) { alert("Dosya okunamadı: " + err) }
  }

  const handleExportNote = async () => {
    if (!activeNote) return
    try {
      const savePath = await save({ defaultPath: `${activeNote.title || 'Not'}.txt`, filters: [{ name: 'Metin Belgesi', extensions: ['txt'] }] })
      if (savePath) {
        const plainText = cleanForRainmeter(activeNote.content)
        await invoke('save_txt_file', { path: savePath, content: plainText })
        alert("Not başarıyla kaydedildi!")
      }
    } catch (err) { alert("Kaydetme sırasında hata oluştu: " + err) }
  }

  const setupRainmeter = async () => {
    try {
      const path = await open({ multiple: false, filters: [{ name: 'Metin Belgesi', extensions: ['txt'] }], title: "Rainmeter notes.txt dosyasını seçin" })
      if (path && typeof path === 'string') {
        setRainmeterPath(path)
        localStorage.setItem('rainmeter_path', path)
        alert(`Bağlantı Başarılı! 🚀`)
        handleManualSave()
      }
    } catch(e) { console.error(e) }
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
    handleManualSave(newNotes)
  }

  const togglePin = (id: string) => {
    const newNotes = notes.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n)
    setNotes(newNotes)
    handleManualSave(newNotes)
  }

  const updateActiveNote = (field: keyof Note, value: string) => {
    if (!activeId) return
    setNotes(notes.map(n => n.id === activeId ? { ...n, [field]: value, updatedAt: Date.now() } : n))
  }

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.tag.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt - a.updatedAt
  })

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {/* TIPTAP EDİTÖR STİLLERİ (Otomatik Güzelleştirici) */}
      <style>{`
        .ProseMirror { outline: none; min-height: 100%; padding-right: 1rem; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.5);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p { margin-bottom: 0.75rem; line-height: 1.6; }
        .ProseMirror h2 { font-size: 1.8rem; font-weight: 900; margin-top: 1.5rem; margin-bottom: 0.75rem; color: hsl(var(--foreground)); }
        .ProseMirror strong { font-weight: 800; color: hsl(var(--primary)); }
        .ProseMirror em { font-style: italic; opacity: 0.9; }
        .ProseMirror img { max-width: 100%; max-height: 450px; object-fit: contain; border-radius: 0.75rem; margin: 1rem 0; border: 1px solid hsl(var(--border)); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .ProseMirror img.ProseMirror-selectednode { outline: 2px solid hsl(var(--primary)); }
      `}</style>

      {/* SOL PANEL (DEĞİŞMEDİ) */}
      <div className="flex w-full shrink-0 flex-col border-r border-border bg-sidebar md:w-[400px]">
        <div className="flex items-center justify-between px-5 pt-5">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-primary" /> Notlarım
          </h1>
          <div className="flex gap-2">
            <button onClick={setupRainmeter} className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer", rainmeterPath ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground")} title="Kendi Widget'ımıza Bağla">
              <MonitorSmartphone className="h-5 w-5" />
            </button>
            <button onClick={handleImportNote} className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer" title="Txt İçe Aktar">
              <Upload className="h-4 w-4" />
            </button>
            <button onClick={createNewNote} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer" title="Yeni Not Oluştur">
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
              <div key={note.id} onClick={() => setActiveId(note.id)} className={cn('group mb-1 flex flex-col w-full rounded-xl px-4 py-3 text-left transition-colors cursor-pointer border', activeId === note.id ? 'bg-accent border-border shadow-sm' : 'bg-sidebar border-transparent hover:bg-accent/40')}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={cn("flex items-center gap-1.5 truncate text-[15px] font-bold", activeId === note.id ? "text-primary" : "text-foreground")}>
                    {note.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" />}
                    {note.title || "İsimsiz Not"}
                  </span>
                </div>
                {/* Arayüzde sadece temiz metnin bir kısmını göster */}
                <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/80 mb-2 min-h-[38px]">{cleanForRainmeter(note.content).substring(0, 80)}...</p>
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

      {/* SAĞ PANEL (TIPTAP CANLI EDİTÖR) */}
      <div className="flex flex-1 flex-col bg-background relative">
        {activeNote ? (
          <>
            <header className="flex items-center justify-between border-b border-border px-8 py-4 bg-background/95 backdrop-blur z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-sidebar border border-border px-3 py-1.5 rounded-lg focus-within:border-primary/50 transition-colors">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <input type="text" value={activeNote.tag} onChange={(e) => updateActiveNote('tag', e.target.value)} className="bg-transparent text-xs font-mono text-foreground focus:outline-none w-24" placeholder="Etiket..." />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button onClick={handleExportNote} className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-xl transition-colors text-xs font-bold cursor-pointer" title="Notu İndir">
                  <Download className="h-4 w-4" /> Dışa Aktar
                </button>
                
                <button onClick={() => handleManualSave()} className={cn("flex items-center gap-2 px-5 py-2 rounded-xl transition-all cursor-pointer shadow-sm font-bold text-sm", isSaving ? "bg-green-500 text-white scale-95" : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95")} title="Rainmeter'a ve sisteme kaydet (Ctrl + S)">
                  {isSaving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Kaydedildi!' : 'Kaydet'}
                </button>
              </div>
            </header>
            
            <div className="flex-1 flex flex-col p-8 md:p-12 overflow-hidden">
              <input 
                type="text" 
                value={activeNote.title} 
                onChange={(e) => updateActiveNote('title', e.target.value)} 
                placeholder="Not Başlığı (Win + Nokta ile Emoji 🚀)..." 
                className="w-full bg-transparent text-4xl font-black tracking-tight text-foreground focus:outline-none placeholder:text-muted-foreground/50 mb-6 shrink-0" 
              />
              
              {/* TIPTAP ARAÇ ÇUBUĞU */}
              {editor && (
                <div className="flex items-center gap-1 mb-4 bg-sidebar p-1.5 rounded-xl border border-border w-max shrink-0">
                  <button 
                    onClick={() => editor.chain().focus().toggleBold().run()} 
                    className={cn("p-2 rounded-lg transition-colors cursor-pointer", editor.isActive('bold') ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")} 
                    title="Kalın (Bold)"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleItalic().run()} 
                    className={cn("p-2 rounded-lg transition-colors cursor-pointer", editor.isActive('italic') ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")} 
                    title="İtalik"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                    className={cn("p-2 rounded-lg transition-colors cursor-pointer", editor.isActive('heading', { level: 2 }) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")} 
                    title="Başlık"
                  >
                    <Heading className="h-4 w-4" />
                  </button>
                  
                  <div className="w-px h-5 bg-border mx-2"></div>
                  
                  <button onClick={handleInsertImage} className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Bilgisayardan Resim Ekle">
                    <ImageIcon className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* TIPTAP EDİTÖR EKRANI */}
              <div className="w-full flex-1 overflow-y-auto scrollbar-hide text-[16px]">
                <EditorContent editor={editor} />
              </div>
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
