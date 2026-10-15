import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Music2, Search, ListMusic, FolderPlus, Shuffle, Heart, Download, Plus, Trash2, ChevronLeft, ArrowDown, ArrowUp, ListVideo, ListPlus, Volume2, VolumeX, Pin, Repeat, Repeat1 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { cn } from '../lib/utils'
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'
import { supabase } from '../lib/supabase'
import { getUserId } from '../lib/auth'

type Track = {
  id: string
  title: string
  format: string
  path: string
  modified_at: number
}

// Akıllı Kuyruk Sistemi için
type QueueItem = {
  qid: number
  track: Track
  pinned: boolean
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
  const [queueSearchQuery, setQueueSearchQuery] = useState('')
  const [activeTrack, setActiveTrack] = useState<Track | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Döngü ve Karıştırma
  const [isShuffle, setIsShuffle] = useState(false)
  const [loopMode, setLoopMode] = useState<'none' | 'all' | 'one'>('none')
  
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  
  // Tam Teşekküllü Kuyruk Sistemi
  const [queue, setQueue] = useState<QueueItem[]>([])

  const [favorites, setFavorites] = useState<string[]>([])
  const [playlists, setPlaylists] = useState<Record<string, string[]>>({})
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({})
  
  const [activeTab, setActiveTab] = useState<'Tümü' | 'Favoriler'>('Tümü')
  const [rightPanelMode, setRightPanelMode] = useState<'player' | 'dash' | 'playlist_detail' | 'playlist_add'>('player')
  const [currentPlaylist, setCurrentPlaylist] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')

  const [dragOverList, setDragOverList] = useState<string | null>(null)
  const [isDragOverDetail, setIsDragOverDetail] = useState(false)

  // Sıralama Hafızası
  const [sortType, setSortType] = useState<'title' | 'plays' | 'date'>((localStorage.getItem('music_sort_type') as any) || 'title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>((localStorage.getItem('music_sort_dir') as any) || 'asc')
  const [isSortOpen, setIsSortOpen] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const synthsRef = useRef<Tone.PolySynth[]>([])
  const [isMidi, setIsMidi] = useState(false)
  
  const currentQueueRef = useRef<Track[]>([]) 
  const playNextRef = useRef<() => void>(() => {})
  const playPrevRef = useRef<() => void>(() => {})
  const togglePlayRef = useRef<() => void>(() => {})

  // Fonksiyon referanslarını güncel tut (Klavye tuşları için)
  useEffect(() => { 
    playNextRef.current = playNext 
    playPrevRef.current = playPrev
    togglePlayRef.current = togglePlay
  })

  // Kulaklık & Medya Tuşları Entegrasyonu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key === 'MediaPlayPause') { e.preventDefault(); togglePlayRef.current(); }
      if (e.key === 'MediaTrackNext') { e.preventDefault(); playNextRef.current(); }
      if (e.key === 'MediaTrackPrevious') { e.preventDefault(); playPrevRef.current(); }
    }

    window.addEventListener('keydown', handleKeyDown)

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayRef.current());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayRef.current());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.onended = () => { if (playNextRef.current) playNextRef.current() }
    
    audioRef.current.ontimeupdate = () => setCurrentTime(audioRef.current?.currentTime || 0)
    audioRef.current.onloadedmetadata = () => setDuration(audioRef.current?.duration || 0)

    const savedFavs = localStorage.getItem('music_favs')
    if (savedFavs) setFavorites(JSON.parse(savedFavs))
    const savedPlaylists = localStorage.getItem('music_playlists')
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists))
    const savedCounts = localStorage.getItem('music_playcounts')
    if (savedCounts) setPlayCounts(JSON.parse(savedCounts))

    // Hatırlanan müzik klasörü varsa açılışta sessizce tara
    const rememberedFolder = localStorage.getItem('music_folder')
    if (rememberedFolder) loadTracks(rememberedFolder, true)

    // Bulut verisini (playlist / favori / dinleme sayısı) çek
    loadCloudMusicData()

    // Diğer cihaz veya pencereden gelen değişiklikleri anında yansıt
    const channel = supabase
      .channel('music-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => { loadCloudMusicData() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_state' }, () => { loadCloudMusicData() })
      .subscribe()

    // YEDEK SENKRON: realtime gecikirse pencere öne geldiğinde bir kez tazele
    const refreshOnFocus = () => { loadCloudMusicData() }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
      supabase.removeChannel(channel)
      stopCurrentTrack()
    }
  }, [])

  // ESKİ ID GÖÇÜ: Sayaç tabanlı "trk_N" ID'leri kararlı yollara çevirir (tek seferlik).
  // Eski veriler tarama sırasına göre üretildiği için aynı sırayla eşleştirmeyi deniyoruz;
  // eşleşmeyen kayıtlar silinmez, olduğu gibi bırakılır.
  const migrateLegacyIds = (scannedTracks: Track[]) => {
    if (localStorage.getItem('music_ids_migrated_v2') === 'done') return
    if (scannedTracks.length === 0) return

    const idMap: Record<string, string> = {}
    scannedTracks.forEach((t, i) => { idMap[`trk_${i + 1}`] = t.id })
    const mapId = (oldId: string) => idMap[oldId] || oldId

    try {
      const savedFavs = localStorage.getItem('music_favs')
      if (savedFavs) {
        const migrated = (JSON.parse(savedFavs) as string[]).map(mapId)
        setFavorites(migrated)
        localStorage.setItem('music_favs', JSON.stringify(migrated))
      }

      const savedPlaylists = localStorage.getItem('music_playlists')
      if (savedPlaylists) {
        const lists = JSON.parse(savedPlaylists) as Record<string, string[]>
        const migrated: Record<string, string[]> = {}
        for (const [name, ids] of Object.entries(lists)) {
          migrated[name] = (ids || []).map(mapId)
        }
        setPlaylists(migrated)
        localStorage.setItem('music_playlists', JSON.stringify(migrated))
      }

      const savedCounts = localStorage.getItem('music_playcounts')
      if (savedCounts) {
        const counts = JSON.parse(savedCounts) as Record<string, number>
        const migrated: Record<string, number> = {}
        for (const [oldId, count] of Object.entries(counts)) {
          const newId = mapId(oldId)
          migrated[newId] = (migrated[newId] || 0) + count
        }
        setPlayCounts(migrated)
        localStorage.setItem('music_playcounts', JSON.stringify(migrated))
      }
    } catch (err) {
      console.error('Eski ID göçü hatası:', err)
    }

    localStorage.setItem('music_ids_migrated_v2', 'done')
  }

  const loadTracks = async (folderPath: string, silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const result = await invoke<Track[]>('scan_music_folder', { folderPath })
      setTracks(result)
      migrateLegacyIds(result)
      pushLocalMusicDataToCloud()
      if (result.length > 0) setActiveTrack(result[0])
    } catch (error) {
      console.error("Hata:", error)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  // ---------------- SUPABASE SENKRONU (playlist + favori + dinleme sayısı) ----------------

  const readLocalJson = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }

  const pushPlaylist = async (name: string, trackIds: string[]) => {
    const userId = await getUserId()
    if (!userId) return
    const { error } = await supabase
      .from('playlists')
      .upsert(
        { user_id: userId, name, track_ids: trackIds, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,name' }
      )
    if (error) console.error('Supabase playlist kaydetme hatası:', error)
  }

  const removePlaylistRemote = async (name: string) => {
    const userId = await getUserId()
    if (!userId) return
    const { error } = await supabase.from('playlists').delete().eq('user_id', userId).eq('name', name)
    if (error) console.error('Supabase playlist silme hatası:', error)
  }

  const pushMusicState = async (key: string, value: unknown) => {
    const userId = await getUserId()
    if (!userId) return
    const { error } = await supabase
      .from('music_state')
      .upsert(
        { user_id: userId, key, value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      )
    if (error) console.error('Supabase müzik verisi kaydetme hatası:', error)
  }

  const loadCloudMusicData = async () => {
    try {
      const { data: listRows, error: listError } = await supabase.from('playlists').select('name, track_ids')
      if (listError) throw listError

      const remotePlaylists: Record<string, string[]> = {}
      for (const row of (listRows || []) as { name: string; track_ids: string[] | null }[]) {
        remotePlaylists[row.name] = row.track_ids || []
      }

      if (Object.keys(remotePlaylists).length > 0) {
        setPlaylists(remotePlaylists)
        localStorage.setItem('music_playlists', JSON.stringify(remotePlaylists))
      }

      const { data: stateRows, error: stateError } = await supabase.from('music_state').select('key, value')
      if (stateError) throw stateError

      const state: Record<string, unknown> = {}
      for (const row of (stateRows || []) as { key: string; value: unknown }[]) {
        state[row.key] = row.value
      }

      if (Array.isArray(state.favorites)) {
        const favs = state.favorites as string[]
        setFavorites(favs)
        localStorage.setItem('music_favs', JSON.stringify(favs))
      }

      if (state.play_counts && typeof state.play_counts === 'object') {
        const counts = state.play_counts as Record<string, number>
        setPlayCounts(counts)
        localStorage.setItem('music_playcounts', JSON.stringify(counts))
      }
    } catch (err) {
      console.error('Supabase müzik verisi çekilemedi:', err)
    }
  }

  // Yereldeki müzik verisini buluta bir kez taşır (ilk kurulum göçü).
  // Bulut zaten doluysa yukarıdaki çekme işlemi yereli bulutla eşitlediği için
  // bu göç sadece aynı veriyi tekrar yazmış olur; zararsız.
  const pushLocalMusicDataToCloud = async () => {
    if (localStorage.getItem('music_cloud_migrated_v2') === 'done') return

    const userId = await getUserId()
    if (!userId) return

    const lists = readLocalJson<Record<string, string[]>>('music_playlists', {})
    const names = Object.keys(lists)
    if (names.length > 0) {
      const { error } = await supabase
        .from('playlists')
        .upsert(
          names.map((name) => ({ user_id: userId, name, track_ids: lists[name], updated_at: new Date().toISOString() })),
          { onConflict: 'user_id,name' }
        )
      if (error) console.error('Playlist göçü hatası:', error)
    }

    const favs = readLocalJson<string[]>('music_favs', [])
    if (favs.length > 0) await pushMusicState('favorites', favs)

    const counts = readLocalJson<Record<string, number>>('music_playcounts', {})
    if (Object.keys(counts).length > 0) await pushMusicState('play_counts', counts)
  }

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
        localStorage.setItem('music_folder', selectedFolder)
        await loadTracks(selectedFolder)
      }
    } catch (error) {
      console.error("Hata:", error)
    }
  }

  const playTrack = async (track: Track, queueContext?: Track[], preserveQueue: boolean = false) => {
    setActiveTrack(track)
    setIsPlaying(false)
    stopCurrentTrack()
    
    const activeQueue = queueContext || currentQueueRef.current || displayedTracks
    currentQueueRef.current = activeQueue

    if (!preserveQueue) {
      const idx = activeQueue.findIndex(t => t.id === track.id)
      if (idx !== -1) {
        setQueue(activeQueue.slice(idx + 1).map((t, i) => ({ qid: Date.now() + i, track: t, pinned: false })))
      } else {
        setQueue([])
      }
    }

    const newCounts = { ...playCounts, [track.id]: (playCounts[track.id] || 0) + 1 }
    setPlayCounts(newCounts)
    localStorage.setItem('music_playcounts', JSON.stringify(newCounts))
    pushMusicState('play_counts', newCounts)

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: 'Ultimate Oynatıcı' })
    }

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
          audioRef.current.volume = volume
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

  const toggleLoop = () => {
    if (loopMode === 'none') setLoopMode('all')
    else if (loopMode === 'all') setLoopMode('one')
    else setLoopMode('none')
  }

  const playNext = () => {
    if (loopMode === 'one' && audioRef.current && activeTrack) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    if (queue.length > 0) {
      let nextItemIdx = 0;
      if (isShuffle) {
        nextItemIdx = Math.floor(Math.random() * queue.length);
      }
      const nextTrack = queue[nextItemIdx].track;
      setQueue(prev => prev.filter((_, i) => i !== nextItemIdx));
      playTrack(nextTrack, currentQueueRef.current, true);
    } else {
      const baseList = currentQueueRef.current.length > 0 ? currentQueueRef.current : tracks;
      if (baseList.length === 0) return;

      if (isShuffle) {
        playTrack(baseList[Math.floor(Math.random() * baseList.length)], baseList, true);
      } else {
        const currentIndex = baseList.findIndex(t => t.id === activeTrack?.id);
        const isLast = currentIndex === baseList.length - 1;
        
        if (isLast && loopMode === 'none') {
          stopCurrentTrack();
          setIsPlaying(false);
          return;
        }
        
        const nextIndex = isLast ? 0 : currentIndex + 1;
        playTrack(baseList[nextIndex], baseList, true);
      }
    }
  }

  const playPrev = () => {
    const baseList = currentQueueRef.current.length > 0 ? currentQueueRef.current : tracks;
    if (baseList.length === 0) return;
    
    const currentIndex = baseList.findIndex(t => t.id === activeTrack?.id);
    const prevIndex = currentIndex <= 0 ? baseList.length - 1 : currentIndex - 1;
    playTrack(baseList[prevIndex], baseList, true); 
  }

  const addToQueue = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation()
    if (!activeTrack) {
      playTrack(track, displayedTracks)
    } else {
      const newItem: QueueItem = { qid: Date.now(), track, pinned: false }
      setQueue(prev => [...prev, newItem])
    }
  }

  const moveQueueItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= queue.length) return;
    const newQueue = [...queue];
    const temp = newQueue[idx];
    newQueue[idx] = newQueue[newIdx];
    newQueue[newIdx] = temp;
    setQueue(newQueue);
  }

  const toggleQueuePin = (qid: number) => {
    setQueue(prev => {
      const updated = prev.map(item => item.qid === qid ? { ...item, pinned: !item.pinned } : item)
      return updated.sort((a, b) => {
        if (a.pinned === b.pinned) return 0
        return a.pinned ? -1 : 1
      })
    })
  }

  const removeFromQueue = (qid: number) => {
    setQueue(prev => prev.filter(item => item.qid !== qid))
  }

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const newFavs = favorites.includes(id) ? favorites.filter(fav => fav !== id) : [...favorites, id]
    setFavorites(newFavs)
    localStorage.setItem('music_favs', JSON.stringify(newFavs))
    pushMusicState('favorites', newFavs)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value)
    if (audioRef.current) audioRef.current.volume = vol
    setVolume(vol)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleSortChange = (type: 'title' | 'plays' | 'date') => {
    setSortType(type)
    localStorage.setItem('music_sort_type', type)
    setIsSortOpen(false)
  }

  const handleSortDirChange = () => {
    const newDir = sortDirection === 'asc' ? 'desc' : 'asc'
    setSortDirection(newDir)
    localStorage.setItem('music_sort_dir', newDir)
  }

  const createPlaylist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return
    if (playlists[newListName.trim()]) { alert("Bu isimde bir liste zaten var!"); return }
    const newPlaylists = { ...playlists, [newListName.trim()]: [] }
    setPlaylists(newPlaylists)
    localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
    pushPlaylist(newListName.trim(), [])
    setNewListName('')
  }

  const deletePlaylist = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    if(!confirm(`"${name}" listesini silmek istediğine emin misin?`)) return
    const newPlaylists = { ...playlists }
    delete newPlaylists[name]
    setPlaylists(newPlaylists)
    localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
    removePlaylistRemote(name)
    if (currentPlaylist === name) { setRightPanelMode('dash'); setCurrentPlaylist(null) }
  }

  const handleDropOnPlaylist = (e: React.DragEvent | any, listName: string) => {
    if(e.preventDefault) e.preventDefault()
    const trackId = e.dataTransfer ? e.dataTransfer.getData('trackId') : e.trackId
    if (!trackId) return
    const currentList = playlists[listName] || []
    if (!currentList.includes(trackId)) {
      const newList = [...currentList, trackId]
      const newPlaylists = { ...playlists, [listName]: newList }
      setPlaylists(newPlaylists)
      localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
      pushPlaylist(listName, newList)
    }
  }

  const removeTrackFromPlaylist = (e: React.MouseEvent | any, trackId: string, listName: string) => {
    if(e.stopPropagation) e.stopPropagation()
    const currentList = playlists[listName] || []
    const newList = currentList.filter(id => id !== trackId)
    const newPlaylists = { ...playlists, [listName]: newList }
    setPlaylists(newPlaylists)
    localStorage.setItem('music_playlists', JSON.stringify(newPlaylists))
    pushPlaylist(listName, newList)
  }

  const downloadTxt = async (filename: string, content: string) => {
    try {
      const savePath = await save({ defaultPath: filename, filters: [{ name: 'Metin Belgesi', extensions: ['txt'] }] });
      if (savePath) {
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
  let filteredQueueSearch = [...tracks]
  if (queueSearchQuery) filteredQueueSearch = filteredQueueSearch.filter(t => t.title.toLowerCase().includes(queueSearchQuery.toLowerCase()))

  return (
    <div className="flex h-full w-full flex-col md:flex-row relative">
      {isSortOpen && <div className="absolute inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>}

      {/* SOL PANEL (KÜTÜPHANE) */}
      <div className="flex w-full shrink-0 flex-col border-r border-border bg-sidebar md:w-[520px] z-10">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <ListMusic className="h-6 w-6 text-primary" /> Kütüphane
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => { setRightPanelMode(prev => prev === 'dash' || prev === 'playlist_detail' || prev === 'playlist_add' ? 'player' : 'dash'); setCurrentPlaylist(null); }} 
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
            <div className="flex items-center rounded-xl border border-border bg-background h-full transition-colors overflow-hidden px-2 relative w-32">
              <select 
                value={sortType} 
                onChange={(e) => handleSortChange(e.target.value as any)}
                className="w-full bg-transparent text-sm font-medium text-foreground outline-none appearance-none cursor-pointer z-10 pl-2"
              >
                <option value="title" className="bg-sidebar text-foreground">İsim</option>
                <option value="plays" className="bg-sidebar text-foreground">Dinlenme</option>
                <option value="date" className="bg-sidebar text-foreground">Tarih</option>
              </select>
              <ArrowDown className="h-3 w-3 absolute right-3 pointer-events-none text-muted-foreground z-0" />
            </div>
            <button onClick={handleSortDirChange} className="h-full px-3 text-muted-foreground hover:text-primary transition-colors bg-background border border-border border-l-0 rounded-r-xl ml-[-1px]" title="Yönü Değiştir">
              {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </button>
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
                onClick={() => playTrack(track, displayedTracks)}
                className={cn('group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors relative overflow-hidden cursor-pointer', activeTrack?.id === track.id ? 'bg-accent' : 'hover:bg-accent/40')}
              >
                <div className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm overflow-hidden transition-colors', activeTrack?.id === track.id ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/50')}>
                  {activeTrack?.id === track.id ? (
                    isPlaying ? (
                      <div className="flex gap-0.5 h-3 items-end">
                        <div className="w-0.5 bg-primary-foreground h-full animate-[bounce_1s_infinite]"></div>
                        <div className="w-0.5 bg-primary-foreground h-2/3 animate-[bounce_1.2s_infinite]"></div>
                        <div className="w-0.5 bg-primary-foreground h-1/2 animate-[bounce_0.8s_infinite]"></div>
                      </div>
                    ) : <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                
                <div className="min-w-0 flex-1 pr-16 z-10 pointer-events-none">
                  <p className={cn('truncate text-[15px] font-semibold', activeTrack?.id === track.id ? 'text-primary' : 'text-foreground')}>{track.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="truncate text-[11px] text-muted-foreground font-mono bg-secondary/50 px-1.5 rounded">{track.format}</p>
                    {playCounts[track.id] > 0 && <p className="text-[10px] text-muted-foreground/60">{playCounts[track.id]} oynatma</p>}
                  </div>
                </div>
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center bg-background/90 backdrop-blur shadow-sm p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-border">
                  <button onClick={(e) => addToQueue(e, track)} className="p-1.5 transition-colors cursor-pointer text-muted-foreground hover:text-primary" title="Sıraya Ekle">
                    <ListPlus className="h-4 w-4" />
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

      <div className="flex min-h-0 flex-1 flex-col items-center justify-start bg-background relative overflow-hidden">
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
                  <div key={p} onClick={() => { setCurrentPlaylist(p); setRightPanelMode('playlist_detail'); }} onDragOver={(e) => { e.preventDefault(); setDragOverList(p) }} onDrop={(e) => { setDragOverList(null); handleDropOnPlaylist(e, p); }} className={cn("flex flex-col p-5 rounded-2xl shadow-sm transition-all cursor-pointer group border", dragOverList === p ? "bg-primary/10 border-primary scale-105" : "bg-sidebar border-border hover:border-primary/50")}>
                    <div className="flex items-center justify-between mb-4 pointer-events-none">
                      <h3 className={cn("font-bold text-lg truncate pr-4 transition-colors", dragOverList === p ? "text-primary" : "group-hover:text-primary")}>{p}</h3>
                      <span className="text-xs font-mono bg-secondary px-2 py-1 rounded-md text-muted-foreground">{playlists[p].length} Şarkı</span>
                    </div>
                    <div className="flex items-center gap-2 mt-auto justify-end">
                      <button onClick={(e) => exportPlaylist(e, p)} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="TXT İndir">
                        <Download className="h-5 w-5" />
                      </button>
                      <button onClick={(e) => deletePlaylist(e, p)} className="p-2 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Sil"><Trash2 className="h-5 w-5" /></button>
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
                <div className="flex-1"><h2 className="text-3xl font-bold">{currentPlaylist}</h2></div>
                
                {/* LİSTEYE YENİ ŞARKI EKLE BUTONU */}
                <button 
                  onClick={() => setRightPanelMode('playlist_add')} 
                  className="flex items-center gap-2 bg-secondary text-foreground px-4 py-3 rounded-xl font-bold hover:bg-secondary/80 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="h-5 w-5" /> Şarkı Ekle
                </button>

                <button 
                  onClick={() => { playTrack(currentPlaylistTracks[0], currentPlaylistTracks, false); setRightPanelMode('player'); }} 
                  disabled={currentPlaylistTracks.length === 0} 
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                >
                  <Play className="h-5 w-5 fill-current" /> Listeyi Çal
                </button>
              </div>
              <div onDragOver={(e) => { e.preventDefault(); setIsDragOverDetail(true) }} onDrop={(e) => { setIsDragOverDetail(false); handleDropOnPlaylist(e, currentPlaylist); }} className={cn("flex-1 overflow-y-auto rounded-2xl p-4 transition-all duration-300 border", isDragOverDetail ? "bg-primary/5 border-primary border-dashed border-2" : "bg-sidebar border-border")}>
                {currentPlaylistTracks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 pointer-events-none">
                    <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-muted-foreground flex items-center justify-center mb-4"><Plus className="h-8 w-8" /></div>
                    <p className="text-lg font-medium">Şarkıları Buraya Sürükle veya Üstteki Butonu Kullan</p>
                  </div>
                ) : (
                  currentPlaylistTracks.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-accent/50 transition-all group pointer-events-auto">
                      <div className="flex items-center gap-3 overflow-hidden">
                         <button onClick={() => { playTrack(t, currentPlaylistTracks, false); setRightPanelMode('player'); }} className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"><Play className="h-4 w-4 fill-current ml-0.5" /></button>
                         <div className="flex flex-col truncate"><span className="font-medium text-sm truncate">{t.title}</span></div>
                      </div>
                      <button onClick={(e) => removeTrackFromPlaylist(e, t.id, currentPlaylist)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer" title="Listeden Çıkar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : rightPanelMode === 'playlist_add' && currentPlaylist ? (
          /* LİSTEYE ŞARKI EKLEME ÖZEL EKRANI */
          <div className="h-full w-full flex flex-col p-8 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setRightPanelMode('playlist_detail')} className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors cursor-pointer"><ChevronLeft className="h-5 w-5" /></button>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-primary">{currentPlaylist}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Bu listeye kütüphanenden şarkı ekle veya çıkar.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto rounded-2xl p-4 bg-sidebar border border-border">
                {displayedTracks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">Kütüphanede şarkı bulunamadı.</p>
                ) : (
                  displayedTracks.map(t => {
                    const isInPlaylist = playlists[currentPlaylist]?.includes(t.id);
                    return (
                      <div key={'add-'+t.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-background transition-all group mb-1">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <Music2 className="h-5 w-5 text-muted-foreground shrink-0" />
                           <div className="flex flex-col truncate pr-4">
                             <span className="font-medium text-sm truncate">{t.title}</span>
                           </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            if (isInPlaylist) {
                              removeTrackFromPlaylist(e, t.id, currentPlaylist);
                            } else {
                              handleDropOnPlaylist({preventDefault: () => {}, dataTransfer: { getData: () => t.id }} as any, currentPlaylist);
                            }
                          }} 
                          className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm shrink-0", isInPlaylist ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" : "bg-primary text-primary-foreground hover:bg-primary/90")}
                        >
                          {isInPlaylist ? 'Çıkar' : 'Ekle'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-start w-full h-full p-8 overflow-y-auto relative">
            
            <div className="flex flex-col items-center flex-shrink-0 mt-4 w-full">
              <div className="relative flex h-64 w-64 items-center justify-center rounded-full bg-sidebar ring-1 ring-border shadow-2xl overflow-hidden transition-all duration-700 hover:scale-105">
                {isPlaying && (
                  <div className="absolute inset-0 flex items-end justify-center gap-2.5 p-10 opacity-50">
                    {[...Array(8)].map((_, i) => (
                      <span key={i} className="w-3 rounded-full bg-primary/80 animate-pulse transition-all" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full border-[20px] border-background/10 pointer-events-none"></div>
                <Music2 className={cn("relative h-20 w-20 transition-colors duration-500", isPlaying ? "text-primary/70" : "text-primary/30")} />
              </div>
              
              <div className="mt-8 text-center max-w-lg px-8 w-full">
                  <h2 className="text-3xl font-black tracking-tight truncate pb-2">
                  {activeTrack ? activeTrack.title : 'Dinlemeye Hazır'}
                  </h2>
                  <div className="flex items-center justify-center gap-3 mt-1">
                      <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase bg-secondary/50 px-3 py-1 rounded-full">
                          {activeTrack ? (isMidi ? '8-BIT SYNTH' : activeTrack.format) : 'SESSİZLİK'}
                      </span>
                  </div>
              </div>

              {activeTrack && !isMidi && (
                <div className="w-full max-w-md mt-8 flex flex-col gap-2 px-4">
                  <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek} 
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono font-medium">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex items-center gap-6 w-full max-w-md justify-between px-6">
                
                <div className="flex items-center gap-1 w-20">
                  <button onClick={() => setIsShuffle(!isShuffle)} className={cn("transition-colors p-2 cursor-pointer", isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")} title="Karıştır">
                    <Shuffle className="h-5 w-5" />
                  </button>
                  <button onClick={toggleLoop} className={cn("transition-colors p-2 cursor-pointer", loopMode !== 'none' ? "text-primary" : "text-muted-foreground hover:text-foreground")} title={loopMode === 'none' ? 'Döngü Kapalı' : loopMode === 'all' ? 'Tümünü Tekrarla' : 'Geçerli Şarkıyı Tekrarla'}>
                    {loopMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="flex items-center gap-6">
                  <button onClick={playPrev} className="text-foreground hover:text-primary transition-colors cursor-pointer"><SkipBack className="h-8 w-8" fill="currentColor" /></button>
                  <button onClick={togglePlay} disabled={!activeTrack} className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer">
                    {isPlaying ? <Pause className="h-8 w-8" fill="currentColor" /> : <Play className="ml-1.5 h-8 w-8" fill="currentColor" />}
                  </button>
                  <button onClick={playNext} className="text-foreground hover:text-primary transition-colors cursor-pointer"><SkipForward className="h-8 w-8" fill="currentColor" /></button>
                </div>

                <div className="flex items-center gap-2 w-20 group">
                  <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={volume} 
                    onChange={handleVolume}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary opacity-50 group-hover:opacity-100 transition-opacity" 
                  />
                </div>
              </div>
            </div>

            <div className="w-full max-w-2xl mt-16 flex flex-col pb-10">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ListMusic className="h-4 w-4"/> Sıradaki Şarkılar
                </h3>
                
                <div className="flex items-center gap-2 bg-sidebar border border-border px-3 py-1.5 rounded-lg focus-within:border-primary/50 transition-colors w-64">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input 
                    type="text" 
                    value={queueSearchQuery} 
                    onChange={(e) => setQueueSearchQuery(e.target.value)} 
                    placeholder="Sıraya şarkı ekle..." 
                    className="bg-transparent text-xs text-foreground focus:outline-none w-full placeholder:text-muted-foreground/50" 
                  />
                </div>
              </div>

              {queueSearchQuery && (
                <div className="mb-6 bg-sidebar border border-border rounded-xl p-2 max-h-48 overflow-y-auto z-50">
                  {filteredQueueSearch.length === 0 ? (
                     <p className="text-xs text-center text-muted-foreground py-4">Şarkı bulunamadı.</p>
                  ) : (
                    filteredQueueSearch.slice(0, 10).map((t: Track) => (
                      <div key={'qs-'+t.id} className="flex items-center justify-between p-2 hover:bg-accent/50 rounded-lg group">
                        <span className="text-sm truncate max-w-[300px]">{t.title}</span>
                        <button onClick={(e) => { addToQueue(e, t); setQueueSearchQuery(''); }} className="text-primary hover:text-primary-foreground hover:bg-primary px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer">
                          Ekle
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {queue.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-10 opacity-50">Sırada bekleyen şarkı yok.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {queue.map((item, idx) => (
                    <div key={'q-'+item.qid} className={cn("flex items-center gap-4 p-3 rounded-xl border shadow-sm transition-colors group", item.pinned ? "bg-accent/40 border-border" : "bg-sidebar border-border hover:border-primary/30")}>
                      <span className="text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
                        {item.pinned ? <Pin className="h-3 w-3 text-primary mx-auto" fill="currentColor" /> : idx + 1}
                      </span>
                      
                      <div className="flex-1 truncate pr-2">
                        <p className={cn("text-sm font-medium truncate transition-colors", item.pinned ? "text-primary" : "text-foreground group-hover:text-primary")}>{item.track.title}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveQueueItem(idx, -1)} className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer rounded-md bg-background border border-border" title="Yukarı Taşı">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => moveQueueItem(idx, 1)} className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer rounded-md bg-background border border-border mr-2" title="Aşağı Taşı">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>

                        <button onClick={() => toggleQueuePin(item.qid)} className={cn("p-1.5 transition-colors cursor-pointer rounded-md border border-border", item.pinned ? "text-primary hover:text-muted-foreground bg-primary/10" : "text-muted-foreground hover:text-primary bg-background")} title={item.pinned ? "Sabitlemeyi Kaldır" : "Üste Sabitle"}>
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { setQueue(prev => prev.filter(q => q.qid !== item.qid)); playTrack(item.track, currentQueueRef.current, true); }} className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer rounded-md bg-background border border-border" title="Hemen Çal">
                          <Play className="h-3.5 w-3.5 fill-current ml-0.5"/>
                        </button>
                        <button onClick={() => removeFromQueue(item.qid)} className="p-1.5 text-muted-foreground hover:text-red-500 cursor-pointer rounded-md bg-background border border-border" title="Sıradan Çıkar">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
