import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Music2, Search, ListMusic, FolderPlus, Shuffle, Heart, Download, Plus, Trash2, ChevronLeft, Check, ArrowDown, ArrowUp, ListVideo } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { cn } from '../lib/utils'
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'

type Track = {
  id: string
  title: string
  format: string
  path: string
  modified_at: number
}

const getMimeType = (format: string) => {
  const f = format.toLowerCase()
  switch (f) {
    case 'mp3': return 'audio/mpeg'
    case 'm4a': return 'audio/mp4'
    case 'wav': return 'audio/wav'
    case 'ogg': return 'audio/ogg'
    case 'flac': return 'audio/flac'
    case 'aac': return 'audio/aac'
    case 'wma': return 'audio/x-ms-wma'
    default: return 'audio/mpeg'
  }
}

export function PlayerView() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTrack, setActiveTrack] = useState<Track | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  
  const [favorites, setFavorites] = useState<string[]>([])
  const [playlists, setPlaylists] = useState<Record<string, string[]>>({})
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({})
  
  const [activeTab, setActiveTab] = useState<'Tümü' | 'Favoriler'>('Tümü')
  
  const [rightPanelMode, setRightPanelMode] = useState<'player' | 'dash' | 'playlist_detail'>('player')
  const [currentPlaylist, setCurrentPlaylist] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')

  const [dragOverList, setDragOverList] = useState<string | null>(null)
  const [isDragOverDetail, setIsDragOverDetail] = useState(false)

  const [sortType, setSortType] = useState<'title' | 'plays' | 'date'>('title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isSortOpen, setIsSortOpen] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const synthsRef = useRef<Tone.PolySynth[]>([])
  const [isMidi, setIsMidi] = useState(false)
  const playNextRef = useRef<() => void>(() => {})
  const currentQueueRef = useRef<Track[]>([])

  useEffect(() => { playNextRef.current = playNext })

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.onended = () => { if (playNextRef.current) playNextRef.current() }
    
    const savedFavs = localStorage.getItem('music_favs')
    if (savedFavs) setFavorites(JSON.parse(savedFavs))

    const savedPlaylists = localStorage.getItem('music_playlists')
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists))

    const savedCounts = localStorage.getItem('music_playcounts')
    if (savedCounts) setPlayCounts(JSON.parse(savedCounts))

    return () => stopCurrentTrack()
  }, [])

  const stopCurrentTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    Tone.Transport.stop()
    Tone.Transport.position = 0
    Tone.Transport.cancel()
    synthsRef.current.forEach(s => s.dispose())
    synthsRef.current = []
  }

  const handleScanFolder = async () => {
    try {
      const selectedFolder = await open({ directory: true, multiple: false })
      if (selectedFolder && typeof selectedFolder === 'string') {
        setIsLoading(true);
        const result = await invoke<Track[]>('scan_music_folder', { folderPath: selectedFolder })
        setTracks(result);
        if (result.length > 0) setActiveTrack(result[0])
      }
    } catch (error) {
      console.error("Hata:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const playTrack = async (track: Track, queueContext?: Track[]) => {
    setActiveTrack(track)
    setIsPlaying(false)
    stopCurrentTrack()
    
    if (queueContext) currentQueueRef.current = queueContext
    else if (currentQueueRef.current.length === 0) currentQueueRef.current = displayedTracks

    const newCounts = { ...playCounts, [track.id]: (playCounts[track.id] || 0) + 1 }
    setPlayCounts(newCounts)
    localStorage.setItem('music_playcounts', JSON.stringify(newCounts))

    try {
      const bytes = await invoke<number[]>('read_audio_file', { path: track.path })
      const arrayBuffer = new Uint8Array(bytes)

      if (track.format === 'MID' || track.format === 'MIDI') {
        setIsMidi(true)
        const midi = new Midi(arrayBuffer)
        await Tone.start() 
        const synths: Tone.PolySynth[] = []
        midi.tracks.forEach(t => {
          if (t.notes.length > 0) {
            const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" } }).toDestination()
            synths.push(synth)
            const part = new Tone.Part((time, note) => {
              synth.triggerAttackRelease(note.name, note.duration, time, note.velocity)
            }, t.notes.map(n => ({ time: n.time, name: n.name, duration: n.duration, velocity: n.velocity })))
            part.start(0)
          }
        })
        synthsRef.current = synths
        Tone.Transport.start()
        Tone.Transport.scheduleOnce(() => {
          setIsPlaying(false)
          if (playNextRef.current) playNextRef.current()
        }, `+${midi.duration}`)
        setIsPlaying(true)
      } else {
        setIsMidi(false)
        const blob = new Blob([arrayBuffer], { type: getMimeType(track.format) })
        const url = URL.createObjectURL(blob)
        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.play()
          setIsPlaying(true)
        }
      }
    } catch (error) {
      console.error("Çalınamadı:", error)
    }
  }

  const togglePlay = () => {
    if (!activeTrack) return
    if (isMidi) {
      if (isPlaying) { Tone.Transport.pause(); setIsPlaying(false) } 
      else { Tone.Transport.start(); setIsPlaying(true) }
    } else {
      if (!audioRef.current) return
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) } 
      else { audioRef.current.play(); setIsPlaying(true) }
    }
  }

  const playNext = () => {
    const queue = currentQueueRef.current.length > 0 ? currentQueueRef.current : tracks
    if (queue.length === 0) return
    let nextIndex;
    if (isShuffle) nextIndex = Math.floor(Math.random() * queue.length)
    else {
      const currentIndex = queue.findIndex(t => t.id === activeTrack?.id)
      nextIndex = (currentIndex + 1) % queue.length
    }
    playTrack(queue[nextIndex])
  }

  const playPrev = () => {
    const queue = currentQueueRef.current.length > 0 ? currentQueueRef.current : tracks
    if (queue.length === 0) return
    const currentIndex = queue.findIndex(t => t.id === activeTrack?.id)
    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1
    playTrack(queue[prevIndex])
  }

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const newFavs = favorites.includes(id) ? favorites.filter(fav => fav !== id) : [...favorites, id]
    setFavorites(newFavs)
    localStorage.setItem('music_favs', JSON.stringify(newFavs))
  }

  const createPlaylist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return
    if (playlists[newListName.trim()]) { alert("Bu isimde bir liste zaten var!"); return }
    const newPlaylists = { ...playlists, [newListName.trim()]: [] }
    setPlaylists(newPlaylists)
    localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
    setNewListName('')
  }

  const deletePlaylist = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    if(!confirm(`"${name}" listesini silmek istediğine emin misin?`)) return
    const newPlaylists = { ...playlists }
    delete newPlaylists[name]
    setPlaylists(newPlaylists)
    localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
    if (currentPlaylist === name) { setRightPanelMode('dash'); setCurrentPlaylist(null) }
  }

  const handleDropOnPlaylist = (e: React.DragEvent, listName: string) => {
    e.preventDefault()
    const trackId = e.dataTransfer.getData('trackId')
    if (!trackId) return
    
    const currentList = playlists[listName] || []
    if (!currentList.includes(trackId)) {
      const newPlaylists = { ...playlists, [listName]: [...currentList, trackId] }
      setPlaylists(newPlaylists)
      localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
    }
  }

  const removeTrackFromPlaylist = (e: React.MouseEvent, trackId: string, listName: string) => {
    e.stopPropagation()
    const currentList = playlists[listName] || []
    const newPlaylists = { ...playlists, [listName]: currentList.filter(id => id !== trackId) }
    setPlaylists(newPlaylists)
    localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
  }

  // --- KUSURSUZ TXT ÇIKARMA FONKSİYONLARI ---
  const downloadTxt = async (filename: string, content: string) => {
    try {
      const savePath = await save({ defaultPath: filename, filters: [{ name: 'Metin Belgesi', extensions: ['txt'] }] });
      if (savePath) {
        // Doğrudan Rust motorumuzu kullanarak dosya yetki engelini aşıyoruz
        await invoke('save_txt_file', { path: savePath, content: content });
        alert('✅ Dosya başarıyla oluşturuldu ve bilgisayarına kaydedildi!');
      }
    } catch (err) {
      console.error("Kaydetme Hatası:", err);
      alert('❌ Dosya kaydedilirken bir hata oluştu:\n' + err);
    }
  }

  const exportAllTracks = async () => {
    const sorted = [...tracks].sort((a,b) => a.title.localeCompare(b.title))
    let content = `TÜM MÜZİK ARŞİVİ\nOluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n-----------------------------------\n\n`
    
    if (sorted.length === 0) {
      content += "Arşivinizde henüz hiç şarkı bulunmuyor."
    } else {
      content += `Toplam Şarkı: ${sorted.length}\n\n` + sorted.map((t, i) => `${i + 1}. ${t.title} [${t.format}]`).join('\n')
    }
    
    await downloadTxt('Tum_Muzik_Arsivim.txt', content)
  }

  const exportPlaylist = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    const listTrackIds = playlists[name] || []
    const listTracks = tracks.filter(t => listTrackIds.includes(t.id)).sort((a,b) => a.title.localeCompare(b.title))
    
    let content = `ÇALMA LİSTESİ: ${name.toUpperCase()}\nOluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n-----------------------------------\n\n`
    
    if (listTracks.length === 0) {
      content += "Bu çalma listesi şu an boş."
    } else {
      content += `Toplam Şarkı: ${listTracks.length}\n\n` + listTracks.map((t, i) => `${i + 1}. ${t.title} [${t.format}]`).join('\n')
    }
    
    await downloadTxt(`Liste_${name.replace(/\s+/g, '_')}.txt`, content)
  }

  let displayedTracks = [...tracks]
  if (activeTab === 'Favoriler') displayedTracks = displayedTracks.filter(t => favorites.includes(t.id))
  if (searchQuery) displayedTracks = displayedTracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))

  displayedTracks.sort((a, b) => {
    if (sortType === 'title') return sortDirection === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    else if (sortType === 'plays') return sortDirection === 'desc' ? (playCounts[b.id] || 0) - (playCounts[a.id] || 0) : (playCounts[a.id] || 0) - (playCounts[b.id] || 0)
    else return sortDirection === 'desc' ? b.modified_at - a.modified_at : a.modified_at - b.modified_at
  })

  const currentPlaylistTracks = currentPlaylist ? tracks.filter(t => playlists[currentPlaylist]?.includes(t.id)) : []

  return (
    <div className="flex h-full w-full flex-col md:flex-row relative">
      {isSortOpen && <div className="absolute inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>}

      <div className="flex w-full shrink-0 flex-col border-r border-border bg-sidebar md:w-[450px] z-10">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <ListMusic className="h-6 w-6 text-primary" /> Kütüphane
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => { setRightPanelMode(prev => prev === 'dash' || prev === 'playlist_detail' ? 'player' : 'dash'); setCurrentPlaylist(null); }} 
              className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", rightPanelMode !== 'player' ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground")}
            >
              <ListVideo className="h-4 w-4" /> {rightPanelMode !== 'player' ? "Oynatıcıya Dön" : "Listelerim"}
            </button>
            <button onClick={handleScanFolder} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors" title="Klasör Seç">
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 px-5 py-2">
          {['Tümü', 'Favoriler'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors", activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary")}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 relative z-50">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Şarkı ara..." className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
          </div>
          
          <div className="relative shrink-0 flex items-center h-[46px]">
            <div className="flex items-center rounded-xl border border-border bg-background h-full transition-colors">
              <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-1.5 h-full px-3 text-sm font-medium text-foreground hover:bg-accent/50 rounded-l-xl transition-colors">
                {sortType === 'title' ? 'İsim' : sortType === 'plays' ? 'Dinlenme' : 'Tarih'}
                <ArrowDown className={cn("h-3 w-3 transition-transform duration-300", isSortOpen && "rotate-180")} />
              </button>
              <div className="w-[1px] h-6 bg-border"></div>
              <button onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')} className="h-full px-3 text-muted-foreground hover:text-primary hover:bg-accent/50 rounded-r-xl transition-colors" title="Yönü Değiştir">
                {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </button>

              <div className={cn("absolute top-[52px] right-0 w-32 bg-sidebar border border-border rounded-xl shadow-xl overflow-hidden transition-all duration-200 origin-top", isSortOpen ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none")}>
                <div className="flex flex-col py-1">
                  <button onClick={() => { setSortType('title'); setIsSortOpen(false); }} className={cn("px-4 py-2 text-left text-sm hover:bg-accent transition-colors", sortType === 'title' && "text-primary font-medium")}>İsim</button>
                  <button onClick={() => { setSortType('plays'); setIsSortOpen(false); }} className={cn("px-4 py-2 text-left text-sm hover:bg-accent transition-colors", sortType === 'plays' && "text-primary font-medium")}>Dinlenme</button>
                  <button onClick={() => { setSortType('date'); setIsSortOpen(false); }} className={cn("px-4 py-2 text-left text-sm hover:bg-accent transition-colors", sortType === 'date' && "text-primary font-medium")}>Tarih</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 mt-1 relative z-0">
          {isLoading ? (
            <div className="text-center mt-10"><p className="text-sm font-medium text-primary animate-pulse">Arşiv taranıyor...</p></div>
          ) : displayedTracks.length === 0 ? (
            <div className="text-center mt-10"><p className="text-sm text-muted-foreground">Şarkı bulunamadı.</p></div>
          ) : (
            displayedTracks.map((track) => (
              <div 
                key={track.id} 
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('trackId', track.id) }}
                className={cn('group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors relative overflow-hidden cursor-grab active:cursor-grabbing', activeTrack?.id === track.id ? 'bg-accent' : 'hover:bg-accent/40')}
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm z-10 pointer-events-none', activeTrack?.id === track.id ? 'bg-primary/20 text-primary' : 'bg-background border border-border text-muted-foreground')}>
                  {activeTrack?.id === track.id && isPlaying ? (
                    <div className="flex gap-0.5 h-3 items-end">
                      <div className="w-0.5 bg-primary h-full animate-[bounce_1s_infinite]"></div>
                      <div className="w-0.5 bg-primary h-2/3 animate-[bounce_1.2s_infinite]"></div>
                      <div className="w-0.5 bg-primary h-1/2 animate-[bounce_0.8s_infinite]"></div>
                    </div>
                  ) : <Music2 className="h-4 w-4" />}
                </div>
                
                <div className="min-w-0 flex-1 pr-10 z-10 pointer-events-none">
                  <p className={cn('truncate text-[15px] font-semibold', activeTrack?.id === track.id ? 'text-primary' : 'text-foreground')}>{track.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="truncate text-[11px] text-muted-foreground font-mono bg-secondary/50 px-1.5 rounded">{track.format}</p>
                    {playCounts[track.id] > 0 && <p className="text-[10px] text-muted-foreground/60">{playCounts[track.id]} oynatma</p>}
                  </div>
                </div>
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center bg-background/80 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button onClick={() => playTrack(track, displayedTracks)} className="p-1.5 transition-colors cursor-pointer text-muted-foreground hover:text-primary" title="Çal">
                    <Play className="h-4 w-4 fill-current" />
                  </button>
                  <button onClick={(e) => toggleFavorite(e, track.id)} className="p-1.5 transition-colors cursor-pointer" title="Favori">
                    <Heart className={cn("h-4 w-4", favorites.includes(track.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500")} fill={favorites.includes(track.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                {favorites.includes(track.id) && <Heart className="absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 text-red-500/50 group-hover:opacity-0 z-10 pointer-events-none" fill="currentColor" />}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background relative overflow-hidden">
        {rightPanelMode === 'dash' ? (
          <div className="h-full w-full flex flex-col p-8 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-border pb-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Listelerim</h2>
                  <p className="text-muted-foreground mt-2">Sol menüden bir şarkıyı tutup kutuların üzerine sürükleyerek anında ekleyin.</p>
                </div>
                <button onClick={exportAllTracks} className="shrink-0 flex items-center gap-2 bg-secondary text-foreground px-4 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors font-medium cursor-pointer shadow-sm">
                  <Download className="h-4 w-4" /> Arşivi TXT Çıkar
                </button>
              </div>

              <form onSubmit={createPlaylist} className="flex items-center gap-3 mb-10 bg-sidebar p-2 pl-4 rounded-2xl border border-border shadow-sm">
                <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Yeni liste adı yazın..." className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground" />
                <button type="submit" disabled={!newListName.trim()} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
                  <Plus className="h-4 w-4" /> Oluştur
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(playlists).length === 0 && <p className="text-muted-foreground col-span-2 text-center py-10">Henüz listeniz yok.</p>}
                {Object.keys(playlists).map(p => (
                  <div 
                    key={p} 
                    onClick={() => { setCurrentPlaylist(p); setRightPanelMode('playlist_detail'); }} 
                    onDragOver={(e) => { e.preventDefault(); setDragOverList(p) }}
                    onDragLeave={() => setDragOverList(null)}
                    onDrop={(e) => { setDragOverList(null); handleDropOnPlaylist(e, p); }}
                    className={cn(
                      "flex flex-col p-5 rounded-2xl shadow-sm transition-all cursor-pointer group border",
                      dragOverList === p ? "bg-primary/10 border-primary scale-105" : "bg-sidebar border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-4 pointer-events-none">
                      <h3 className={cn("font-bold text-lg truncate pr-4 transition-colors", dragOverList === p ? "text-primary" : "group-hover:text-primary")}>{p}</h3>
                      <span className="text-xs font-mono bg-secondary px-2 py-1 rounded-md text-muted-foreground">{playlists[p].length} Şarkı</span>
                    </div>
                    <div className="flex items-center gap-2 mt-auto justify-end">
                      <button onClick={(e) => exportPlaylist(e, p)} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="TXT İndir">
                        <Download className="h-5 w-5" />
                      </button>
                      <button onClick={(e) => deletePlaylist(e, p)} className="p-2 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Sil">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : rightPanelMode === 'playlist_detail' && currentPlaylist ? (
          <div className="h-full w-full flex flex-col p-8 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setRightPanelMode('dash')} className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors cursor-pointer"><ChevronLeft className="h-5 w-5" /></button>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold">{currentPlaylist}</h2>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">Soldan şarkıları tutup bu alana sürükleyerek listeye ekleyebilirsiniz.</p>
                </div>
                <button onClick={() => playTrack(currentPlaylistTracks[0], currentPlaylistTracks)} disabled={currentPlaylistTracks.length === 0} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 cursor-pointer shadow-md">
                  <Play className="h-5 w-5 fill-current" /> Listeyi Çal
                </button>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragOverDetail(true) }}
                onDragLeave={() => setIsDragOverDetail(false)}
                onDrop={(e) => { setIsDragOverDetail(false); handleDropOnPlaylist(e, currentPlaylist); }}
                className={cn("flex-1 overflow-y-auto rounded-2xl p-4 transition-all duration-300 border", isDragOverDetail ? "bg-primary/5 border-primary border-dashed border-2" : "bg-sidebar border-border")}
              >
                {currentPlaylistTracks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 pointer-events-none">
                    <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-muted-foreground flex items-center justify-center mb-4"><Plus className="h-8 w-8" /></div>
                    <p className="text-lg font-medium">Şarkıları Buraya Sürükle</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {currentPlaylistTracks.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-accent/50 transition-all group pointer-events-auto">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <button onClick={() => playTrack(t, currentPlaylistTracks)} className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                             <Play className="h-4 w-4 fill-current ml-0.5" />
                           </button>
                           <div className="flex flex-col truncate">
                              <span className="font-medium text-sm truncate">{t.title}</span>
                              <span className="text-xs text-muted-foreground">{t.format}</span>
                           </div>
                        </div>
                        <button onClick={(e) => removeTrackFromPlaylist(e, t.id, currentPlaylist)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer" title="Listeden Çıkar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="relative flex h-72 w-72 items-center justify-center rounded-full bg-sidebar ring-1 ring-border shadow-2xl overflow-hidden transition-all duration-700 hover:scale-105">
              {isPlaying && (
                <div className="absolute inset-0 flex items-end justify-center gap-2.5 p-10 opacity-50">
                  {[...Array(8)].map((_, i) => (
                    <span key={i} className="w-3 rounded-full bg-primary/80 animate-pulse transition-all" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
              <div className="absolute inset-0 rounded-full border-[20px] border-background/10 pointer-events-none"></div>
              <Music2 className={cn("relative h-24 w-24 transition-colors duration-500", isPlaying ? "text-primary/70" : "text-primary/30")} />
            </div>
            
            <div className="mt-12 text-center max-w-lg px-8">
                <h2 className="text-4xl font-black tracking-tight truncate pb-2">
                {activeTrack ? activeTrack.title : 'Dinlemeye Hazır'}
                </h2>
                <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="font-mono text-sm tracking-widest text-muted-foreground uppercase bg-secondary/50 px-3 py-1 rounded-full">
                        {activeTrack ? (isMidi ? '8-BIT SYNTH' : activeTrack.format) : 'SESSİZLİK'}
                    </span>
                </div>
            </div>
            
            <div className="mt-12 flex items-center gap-10">
              <button onClick={() => setIsShuffle(!isShuffle)} className={cn("transition-colors p-2 cursor-pointer", isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Shuffle className="h-6 w-6" />
              </button>
              
              <div className="flex items-center gap-6">
                <button onClick={playPrev} className="text-foreground hover:text-primary transition-colors cursor-pointer"><SkipBack className="h-10 w-10" fill="currentColor" /></button>
                <button onClick={togglePlay} disabled={!activeTrack} className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer">
                  {isPlaying ? <Pause className="h-10 w-10" fill="currentColor" /> : <Play className="ml-2 h-10 w-10" fill="currentColor" />}
                </button>
                <button onClick={playNext} className="text-foreground hover:text-primary transition-colors cursor-pointer"><SkipForward className="h-10 w-10" fill="currentColor" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}