import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, MonitorSmartphone } from 'lucide-react'
import { cn } from '../lib/utils'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Record<string, string[]>>({})
  const [newEventText, setNewEventText] = useState('')
  const [rainmeterPath, setRainmeterPath] = useState<string | null>(localStorage.getItem('rainmeter_event_path'))

  // Kayıtlı etkinlikleri yükle
  useEffect(() => {
    const saved = localStorage.getItem('ultimate_events')
    if (saved) setEvents(JSON.parse(saved))
  }, [])

  // Etkinlikleri kaydet ve Rainmeter'ı güncelle
  useEffect(() => {
    localStorage.setItem('ultimate_events', JSON.stringify(events))
    syncWithRainmeter()
  }, [events, selectedDate])

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  // Pazar = 0 olduğu için Pazartesi'yi 1 yapmak üzere ufak bir matematik:
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
  const dayNames = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  }

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventText.trim()) return
    const key = formatDateKey(selectedDate)
    const dayEvents = events[key] || []
    setEvents({ ...events, [key]: [...dayEvents, newEventText.trim()] })
    setNewEventText('')
  }

  const handleDeleteEvent = (index: number) => {
    const key = formatDateKey(selectedDate)
    const dayEvents = events[key] || []
    const newDayEvents = dayEvents.filter((_, i) => i !== index)
    setEvents({ ...events, [key]: newDayEvents })
  }

  // RAINMETER BAĞLANTISI (Tüm Etkinlikleri Formata Uygun Şekilde Yazar)
  const syncWithRainmeter = async () => {
    if (!rainmeterPath) return
    
    let content = ""
    // Tüm günleri dönüp dosyaya alt alta basıyoruz
    for (const [dateKey, dayEvents] of Object.entries(events)) {
      if (dayEvents.length > 0) {
         content += `[${dateKey}]\n`
         content += dayEvents.map(e => "▪ " + e).join('\n') + "\n\n"
      }
    }

    try {
      // İçerik boş olsa bile txt dosyasını temizlemek için gönderiyoruz
      await invoke('save_txt_file', { path: rainmeterPath, content: content || " " })
    } catch (err) {
      console.error('Rainmeter Sync Hatası:', err)
    }
  }

  const setupRainmeter = async () => {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: 'Rainmeter Ayar Dosyası', extensions: ['inc', 'txt'] }],
        title: "Rainmeter için 'events.inc' veya 'events.txt' dosyasını seçin"
      })
      if (path && typeof path === 'string') {
        setRainmeterPath(path)
        localStorage.setItem('rainmeter_event_path', path)
        alert('Takvim başarıyla Rainmeter widget\'ına bağlandı!')
        syncWithRainmeter()
      }
    } catch(e) { console.error(e) }
  }

  const selectedKey = formatDateKey(selectedDate)
  const currentEvents = events[selectedKey] || []

  return (
    <div className="flex h-full w-full flex-col md:flex-row relative">

      {/* SOL PANEL: TAKVİM */}
      <div className="flex w-full shrink-0 flex-col border-r border-border bg-sidebar md:w-[450px] z-10 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <CalendarDays className="h-7 w-7 text-primary" /> Takvim
          </h1>
          <button
            onClick={setupRainmeter}
            className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-colors cursor-pointer shadow-sm", rainmeterPath ? "bg-green-500/10 text-green-500" : "bg-secondary hover:bg-primary hover:text-primary-foreground")}
            title="Rainmeter'a Bağla"
          >
            <MonitorSmartphone className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"><ChevronLeft className="h-5 w-5 text-primary" /></button>
            <h2 className="text-xl font-black tracking-wider uppercase">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"><ChevronRight className="h-5 w-5 text-primary" /></button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground pb-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 rounded-xl bg-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum)
              const cellKey = formatDateKey(cellDate)
              const hasEvents = events[cellKey] && events[cellKey].length > 0
              const isSelected = selectedDate.getDate() === dayNum && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear()
              const isToday = new Date().getDate() === dayNum && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear()

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(cellDate)}
                  className={cn(
                    "relative h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all cursor-pointer",
                    isSelected ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-sidebar border border-border hover:border-primary/50 text-foreground",
                    isToday && !isSelected && "text-primary border-primary/50"
                  )}
                >
                  {dayNum}
                  {hasEvents && !isSelected && <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-primary rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* SAĞ PANEL: ETKİNLİKLER */}
      <div className="flex min-h-0 flex-1 flex-col bg-background relative p-8 md:p-12 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto flex flex-col h-full">
          <div className="mb-10 border-b border-border pb-6">
            <h2 className="text-4xl font-black tracking-tight text-primary mb-2">
              {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </h2>
            <p className="text-muted-foreground font-medium">Bu güne ait etkinlikleri ve notları yönetin.</p>
          </div>

          <form onSubmit={handleAddEvent} className="flex gap-3 mb-8">
            <input
              type="text"
              value={newEventText}
              onChange={(e) => setNewEventText(e.target.value)}
              placeholder="Yeni etkinlik ekle..."
              className="flex-1 bg-sidebar border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 shadow-inner"
            />
            <button type="submit" disabled={!newEventText.trim()} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md cursor-pointer">
              <Plus className="h-5 w-5" /> Ekle
            </button>
          </form>

          <div className="flex-1 flex flex-col gap-3">
            {currentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-50 border-2 border-dashed border-border rounded-2xl">
                <CalendarDays className="h-10 w-10 mb-3" />
                <p className="font-medium">Bu gün için planlanmış bir etkinlik yok.</p>
              </div>
            ) : (
              currentEvents.map((ev, idx) => (
                <div key={idx} className="flex items-center justify-between bg-sidebar border border-border p-4 rounded-xl group hover:border-primary/50 transition-colors">
                  <span className="font-medium text-foreground text-sm">{ev}</span>
                  <button onClick={() => handleDeleteEvent(idx)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
