import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { MonitorSmartphone, CheckCircle2, DownloadCloud } from 'lucide-react'

type WizardStatus = 'idle' | 'installing' | 'awaiting' | 'done'

export function SetupWizard() {
  const [showWizard, setShowWizard] = useState(false)
  const [status, setStatus] = useState<WizardStatus>('idle')

  useEffect(() => {
    // Uygulama ilk kez mi açılıyor kontrolü
    if (!localStorage.getItem('ultimate_first_launch')) {
      setShowWizard(true)
    }
  }, [])

  const closeWizard = () => {
    localStorage.setItem('ultimate_first_launch', 'done')
    setShowWizard(false)
  }

  const handleInstall = async () => {
    setStatus('installing')
    try {
      const result = await invoke<string>('install_rainmeter_widgets')

      // Rainmeter makinede kurulu değilse resmi kurulum başlatıldı ve bize
      // RAINMETER_SETUP_STARTED döndü. Kullanıcı kurulumu bitirip "Devam Et"
      // diyene kadar bekliyoruz; sonra tekrar çağırınca .rmskin kurulacak.
      if (result === 'RAINMETER_SETUP_STARTED') {
        setStatus('awaiting')
        return
      }

      setStatus('done')
      setTimeout(closeWizard, 2000)
    } catch (err) {
      alert('Kurulum hatası: ' + err)
      setStatus('idle')
    }
  }

  if (!showWizard) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
      <div className="bg-sidebar border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">

        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <MonitorSmartphone className="h-10 w-10 text-primary" />
        </div>

        <h2 className="text-2xl font-black mb-2">Masaüstü Deneyimini Yükselt</h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Ultimate Asistan, gücünü masaüstüne taşımak için özel widget'larla gelir. Kurulumu otomatik yapmamızı ister misin?
        </p>

        {status === 'idle' && (
          <div className="flex gap-3 w-full">
            <button onClick={closeWizard} className="flex-1 py-3 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
              Atla
            </button>
            <button onClick={handleInstall} className="flex-[2] py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md">
              <DownloadCloud className="h-5 w-5" /> Kurulumu Başlat
            </button>
          </div>
        )}

        {status === 'installing' && (
          <div className="w-full flex flex-col items-center text-primary animate-pulse font-bold">
            <DownloadCloud className="h-8 w-8 mb-2" />
            Sistem Entegre Ediliyor...
          </div>
        )}

        {status === 'awaiting' && (
          <div className="w-full flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ekrana gelen <span className="font-bold text-foreground">Rainmeter 4.5</span> kurulumunu tamamlayın.
              Bittiğinde aşağıdaki butona basın; widget'lar otomatik olarak devreye alınacaktır.
            </p>
            <button onClick={handleInstall} className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md">
              <DownloadCloud className="h-5 w-5" /> Kurulumu Tamamladım, Devam Et
            </button>
          </div>
        )}

        {status === 'done' && (
          <div className="w-full flex flex-col items-center text-green-500 font-bold">
            <CheckCircle2 className="h-8 w-8 mb-2" />
            Kurulum Tamamlandı!
          </div>
        )}
      </div>
    </div>
  )
}
