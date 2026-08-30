import { useState } from 'react'
import { Sparkles, GitBranch, Code, Briefcase, Globe, Download, Loader2, File, Folder, ArrowLeft, ChevronRight, Lock, Server, FileText, GraduationCap, Wrench, Languages } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'

export function GithubView() {
  const [github, setGithub] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [website, setWebsite] = useState('')
  
  const [school, setSchool] = useState(localStorage.getItem('cv_school') || '')
  const [skills, setSkills] = useState(localStorage.getItem('cv_skills') || 'C, Kotlin, TypeScript, C#, React, Node.js')
  const [spokenLangs, setSpokenLangs] = useState(localStorage.getItem('cv_langs') || 'İngilizce (B2), Türkçe (Ana Dil)')
  
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('custom_api_url') || '') 
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [repos, setRepos] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const [editingRepo, setEditingRepo] = useState<any | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const [viewingRepo, setViewingRepo] = useState<any | null>(null)
  const [repoFiles, setRepoFiles] = useState<any[]>([])
  const [currentPath, setCurrentPath] = useState<string>('')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isFetchingFiles, setIsFetchingFiles] = useState(false)

  const [cvPreview, setCvPreview] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!github.trim()) {
      setStatus('error')
      setErrorMsg('Lütfen en azından bir GitHub kullanıcı adı girin.')
      return
    }
    
    if (apiUrl.trim()) localStorage.setItem('custom_api_url', apiUrl.trim())
    if (school.trim()) localStorage.setItem('cv_school', school.trim())
    if (skills.trim()) localStorage.setItem('cv_skills', skills.trim())
    if (spokenLangs.trim()) localStorage.setItem('cv_langs', spokenLangs.trim())
    
    setStatus('loading')
    
    try {
      const res = await fetch(`https://api.github.com/users/${github.trim()}/repos?per_page=100`)
      
      if (!res.ok) throw new Error('Kullanıcı bulunamadı veya GitHub API limiti aşıldı.')

      const data = await res.json()

      const mappedRepos = data.filter((r: any) => !r.fork).map((r: any) => ({
        name: r.name,
        desc: r.description || 'Bu proje için henüz bir açıklama girilmemiş.',
        lang: r.language || 'Çeşitli',
        stars: r.stargazers_count,
        archived: r.archived 
      }))

      if (mappedRepos.length === 0) {
        mappedRepos.push({ name: 'C_Deneme', desc: 'C ile geliştirilmiş örnek otomasyon.', lang: 'C', stars: 12, archived: false })
      }

      mappedRepos.sort((a: any, b: any) => b.stars - a.stars)

      setRepos(mappedRepos)
      setStatus('success')
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Bağlantı sırasında bir hata oluştu.')
    }
  }

  const handleUpdateRepo = async () => {
    if (!apiUrl.trim()) return alert("Projeyi düzenlemek için lütfen kendi dış 'API Sunucu Linkini' girin!");
    setIsUpdating(true);
    
    try {
      let cleanUrl = apiUrl.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) cleanUrl = `https://${cleanUrl}`;
      if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
      
      const res = await fetch(`${cleanUrl}/api/update-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: github.trim(), repo: editingRepo.name, description: editDesc })
      });

      if (!res.ok) throw new Error('Dış sunucunuz isteği reddetti! Sunucu loglarını kontrol edin.');

      setRepos(repos.map(r => r.name === editingRepo.name ? { ...r, desc: editDesc } : r));
      setEditingRepo(null);
    } catch (err: any) {
      if (err.message === "Failed to fetch") alert("Sunucuya ulaşılamadı. Linkin doğru olduğundan emin ol.");
      else alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  }

  const openEditModal = (repo: any) => {
    if (!apiUrl.trim()) return alert("Lütfen aracı görevi görecek 'API Sunucu Linkini' doldurun.");
    if (repo.archived) return alert("Bu proje arşivlenmiş! Arşivlenmiş projeler salt okunurdur ve düzenlenemez.");
    
    setEditingRepo(repo);
    setEditDesc(repo.desc === 'Bu proje için henüz bir açıklama girilmemiş.' ? '' : repo.desc);
  }

  const openRepoExplorer = async (repo: any, path: string = '') => {
    setViewingRepo(repo);
    setCurrentPath(path);
    setIsFetchingFiles(true);
    setFileContent(null);

    try {
      const res = await fetch(`https://api.github.com/repos/${github.trim()}/${repo.name}/contents/${path}`)
      if (!res.ok) throw new Error('Dosyalar okunamadı.')
      const data = await res.json()

      if (Array.isArray(data)) {
        const sorted = data.sort((a, b) => {
          if (a.type === 'dir' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        setRepoFiles(sorted);
      } else if (data.type === 'file' && data.download_url) {
        const fileRes = await fetch(data.download_url)
        const text = await fileRes.text()
        setFileContent(text)
      }
    } catch (err: any) {
      console.error(err);
      alert('Dosyalar çekilirken hata oluştu.');
    } finally {
      setIsFetchingFiles(false);
    }
  }

  const navigateBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.join('/');
    openRepoExplorer(viewingRepo, newPath);
  }

  const handlePreviewATS = () => {
    const cleanLinkedin = linkedin ? linkedin.replace('https://', '').replace('www.', '') : 'linkedin.com/in/kullaniciadi';
    const cleanWebsite = website ? website.replace('https://', '').replace('www.', '') : 'Web Siteniz Yok';
    const cleanSchool = school.trim() ? school : 'Üniversite ve Bölüm Bilgisi Girilmedi';

    const achievementsList = [
      "Temiz kod (Clean Code) prensipleri benimsendi ve modüler bir mimari kurgulandı.",
      "Asenkron veri işleme ve performans optimizasyonları yapılarak sistem verimliliği artırıldı.",
      "Kullanıcı deneyimi (UX) göz önünde bulundurularak modern ve duyarlı bir arayüz geliştirildi.",
      "Hata ayıklama (debugging) süreçleri titizlikle yürütüldü ve kod kararlılığı sağlandı.",
      "Versiyon kontrol sistemleri (Git) ile sürdürülebilir geliştirme standartları uygulandı.",
      "Güvenli kodlama pratikleri izlendi ve sistemin altyapısı güçlendirildi.",
      "Geliştirilebilir ve ölçeklenebilir (scalable) bir sistem tasarımı oluşturuldu."
    ];

    const generatedContent = `=================================================================\r
                          BİLAL HABEŞ ŞİMŞEK\r
=================================================================\r
📧 [Email Adresiniz] | 📱 [Telefon Numaranız] | 📍 Ankara, Türkiye\r
🔗 github.com/${github || 'bilalhabessimsek'}\r
🔗 ${cleanLinkedin}\r
🔗 ${cleanWebsite}\r
\r
--- PROFESYONEL ÖZET ---\r
Modern masaüstü teknolojileri (Tauri, React, TypeScript), sistem programlama (C) ve mobil uygulama geliştirme (Kotlin) alanlarında tutkulu Yazılım Geliştirici. Temiz mimari, donanım optimizasyonu ve kullanıcı odaklı UI/UX tasarımı konularında deneyimli. Sürekli öğrenmeye ve yerel yapay zeka entegrasyonlarına açık.\r
\r
--- YETENEKLER VE DİLLER ---\r
Teknolojiler : ${skills}\r
Yabancı Dil  : ${spokenLangs}\r
Kavramlar    : Çapraz Platform Geliştirme, Sistem Performans Takibi, UI/UX Tasarım, Asenkron Mimari\r
\r
--- TEKNİK PROJELER ---\r
\r
${repos.map((repo, index) => {
  // TÜRKÇE DOSTU İSİM DÜZELTİCİ (Tireleri boşluk yap, baş harfleri büyüt)
  const formattedName = repo.name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
    
  const techStack = repo.lang !== 'Çeşitli' && repo.lang !== null ? `${repo.lang}, Git/GitHub` : 'Çeşitli Teknolojiler, Git/GitHub';
  
  return `🔹 Proje Adı: ${formattedName} ${repo.archived ? '(Arşivlenmiş)' : ''}\r
   Teknoloji: ${techStack}\r
   Detaylar : ${repo.desc}\r
   Başarılar: ${achievementsList[index % achievementsList.length]}`;
}).join('\r\n\r\n')}\r
\r
--- DENEYİM & GELİŞİM ---\r
• Çeşitli cross-platform uygulamalarının arayüz modernizasyonları ve performans iyileştirmeleri.\r
• Android cihazlarda sistem kaynaklarını (FPS, RAM, Hafıza) arka planda asenkron olarak izleyen Overlay servisleri geliştirimi.\r
• C dilinde yapılandırılmış karmaşık veri algoritmalarının entegrasyonu ve yönetimi.\r
\r
--- EĞİTİM ---\r
🎓 ${cleanSchool}\r
\r
=================================================================\r
NOT: Bu CV, ATS (Yapay Zeka Aday Takip Sistemleri) okuyucularından \r
maksimum puan almak üzere anahtar kelime optimizasyonuyla hazırlanmıştır.\r
=================================================================\r
`;
    setCvPreview(generatedContent);
  }

  const downloadCV = async () => {
    if (!cvPreview) return;
    try {
      const savePath = await save({ 
        defaultPath: `${github || 'Profil'}_ATS_CV`, 
        filters: [
          { name: 'Word Belgesi (PDF Yapılabilir)', extensions: ['doc'] },
          { name: 'Markdown Metni', extensions: ['md'] },
          { name: 'Düz Metin', extensions: ['txt'] }
        ] 
      });

      if (savePath) {
        await invoke('save_txt_file', { path: savePath, content: cvPreview });
        alert('🚀 ATS Uyumlu CV Başarıyla Oluşturuldu ve Kaydedildi!');
        setCvPreview(null);
      }
    } catch (err) {
      console.error("CV Kaydetme Hatası:", err);
      alert('❌ CV kaydedilirken bir sorun oluştu.');
    }
  }

  return (
    <div className="flex h-full w-full flex-col p-8 md:p-12 overflow-y-auto relative">
      
      {cvPreview !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-sidebar border border-border rounded-2xl p-6 w-full max-w-4xl shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 h-[85vh]">
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> CV Önizleme & Düzenleme
              </h3>
              <button onClick={() => setCvPreview(null)} className="text-muted-foreground hover:text-foreground font-bold text-xl cursor-pointer">✕</button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col gap-2">
              <p className="text-sm text-muted-foreground shrink-0">İndirmeden önce özgeçmişinde dilediğin gibi ekleme ve çıkarma yapabilirsin.</p>
              <textarea
                value={cvPreview}
                onChange={e => setCvPreview(e.target.value)}
                className="w-full flex-1 bg-[#0d1117] border border-border rounded-xl p-5 text-sm leading-relaxed text-[#c9d1d9] font-mono focus:outline-none focus:border-primary resize-none scrollbar-hide"
                spellCheck="false"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-3 border-t border-border shrink-0">
              <button onClick={() => setCvPreview(null)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">İptal</button>
              <button
                onClick={downloadCV}
                className="px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer shadow-md hover:scale-105 active:scale-95"
              >
                <Download className="h-4 w-4" /> CV'yi İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-sidebar border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" /> {editingRepo.name}
              </h3>
              <button onClick={() => setEditingRepo(null)} className="text-muted-foreground hover:text-foreground font-bold text-xl cursor-pointer">✕</button>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Proje Açıklaması (Description)</label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-primary min-h-[120px] resize-none"
                placeholder="Bu proje ne işe yarıyor?"
              />
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Server className="h-3 w-3" /> Düzenleme isteği belirttiğiniz dış sunucuya iletilecektir.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setEditingRepo(null)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">İptal</button>
              <button
                onClick={handleUpdateRepo}
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sunucuya Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRepo ? (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (currentPath === '' && fileContent === null) setViewingRepo(null)
                  else navigateBack() 
                }} 
                className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" /> {viewingRepo.name}
                  {viewingRepo.archived && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded ml-2 flex items-center gap-1"><Lock className="h-3 w-3"/> Arşivli</span>}
                </h2>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 font-mono">
                  <span>root</span>
                  {currentPath && (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      <span>{currentPath}</span>
                    </>
                  )}
                  {fileContent !== null && (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      <span className="text-primary">dosya okuyucu</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-sidebar border border-border rounded-2xl overflow-hidden flex flex-col relative">
            {isFetchingFiles ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            ) : null}

            {fileContent !== null ? (
              <div className="p-6 overflow-auto w-full h-full bg-[#0d1117] text-[#c9d1d9] font-mono text-sm leading-relaxed">
                <pre><code>{fileContent}</code></pre>
              </div>
            ) : (
              <div className="overflow-auto w-full h-full divide-y divide-border">
                {repoFiles.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => openRepoExplorer(viewingRepo, item.path)}
                    className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    {item.type === 'dir' ? (
                      <Folder className="h-5 w-5 text-blue-400 group-hover:text-blue-300" fill="currentColor" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-[15px] group-hover:text-primary transition-colors">
                      {item.name}
                    </span>
                  </div>
                ))}
                {repoFiles.length === 0 && !isFetchingFiles && (
                  <div className="p-10 text-center text-muted-foreground">Bu klasör boş.</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto w-full h-full pb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Kariyer & Proje Yönetimi</h1>
              <p className="text-muted-foreground mt-2">Projelerini canlı düzenle, kodları incele ve ATS uyumlu özgeçmişini indir.</p>
            </div>
            
            <div className="flex gap-3">
              {status === 'success' && (
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-4 py-3 rounded-xl font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  Çıkış Yap
                </button>
              )}
              <button 
                type="button" 
                onClick={handlePreviewATS}
                disabled={status !== 'success'}
                className="shrink-0 group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-md"
              >
                <Sparkles className="h-4 w-4" />
                ATS CV İndir
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>
          </div>

          {status === 'idle' || status === 'error' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative group">
              <div className="rounded-2xl border border-border bg-sidebar p-8 shadow-sm flex flex-col z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 bg-background rounded-full border border-border flex items-center justify-center shadow-sm">
                    <Code className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Ağlarını Bağla</h3>
                    <p className="text-sm text-muted-foreground mt-1">GitHub API üzerinden projelerini çek.</p>
                  </div>
                </div>
                
                {status === 'error' && (
                  <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-lg mb-4">
                    <span className="text-sm font-medium">{errorMsg}</span>
                  </div>
                )}
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-inner">
                    <Code className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground font-mono text-sm hidden sm:inline">github.com/</span>
                    <input 
                      type="text" 
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="Kullanıcı Adı" 
                      className="w-full bg-transparent font-medium text-foreground focus:outline-none" 
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-background px-4 py-3 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-inner">
                    <Server className="h-5 w-5 text-blue-500/80 shrink-0" />
                    <input 
                      type="text" 
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="API Linki (Örn: github-api-proxy...)" 
                      className="w-full bg-transparent font-medium text-foreground focus:outline-none placeholder:text-muted-foreground/60 text-sm" 
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-1 focus-within:ring-[#0077b5]/50 transition-all shadow-inner mt-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground font-mono text-sm hidden sm:inline">linkedin.com/in/</span>
                    <input 
                      type="text" 
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="Kullanıcı Adı (Opsiyonel)" 
                      className="w-full bg-transparent font-medium text-foreground focus:outline-none text-sm" 
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-inner">
                    <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                    <input 
                      type="text" 
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="Kişisel Web Sitesi (Opsiyonel)" 
                      className="w-full bg-transparent font-medium text-foreground focus:outline-none text-sm" 
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-sidebar p-8 shadow-sm flex flex-col z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 bg-background rounded-full border border-border flex items-center justify-center shadow-sm">
                    <FileText className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Özgeçmiş Bilgileri</h3>
                    <p className="text-sm text-muted-foreground mt-1">CV için dil, okul ve yeteneklerini tanımla.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5"/> Üniversite / Okul</label>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-inner">
                      <input 
                        type="text" 
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="Örn: X Üniversitesi, Bilgisayar Müh." 
                        className="w-full bg-transparent font-medium text-foreground focus:outline-none text-sm" 
                        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Languages className="h-3.5 w-3.5"/> Yabancı Diller</label>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-inner">
                      <input 
                        type="text" 
                        value={spokenLangs}
                        onChange={(e) => setSpokenLangs(e.target.value)}
                        placeholder="Örn: İngilizce (B2), Türkçe (Ana Dil)" 
                        className="w-full bg-transparent font-medium text-foreground focus:outline-none text-sm" 
                        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5"/> Yetenekler & Teknolojiler</label>
                    <textarea 
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="C, C#, React, Kotlin..." 
                      className="w-full flex-1 min-h-[80px] bg-background border border-border rounded-xl p-4 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none shadow-inner" 
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2 mt-2">
                <button 
                  type="button" 
                  onClick={handleConnect}
                  className="rounded-xl bg-foreground text-background px-6 py-4 font-bold hover:bg-foreground/90 transition-colors cursor-pointer w-full text-lg shadow-md"
                >
                  Sistemi Doğrula ve Analiz Et
                </button>
              </div>
            </div>
          ) : status === 'loading' ? (
            <div className="rounded-2xl border border-border bg-sidebar p-16 flex flex-col items-center justify-center text-center gap-5 shadow-sm">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <h3 className="text-xl font-bold">Ağlar Analiz Ediliyor...</h3>
              <p className="text-muted-foreground animate-pulse">GitHub API üzerinden kodlar, depolar ve yetenekler taranıyor.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 p-5 rounded-2xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold shrink-0">✓</div>
                <div>
                  <h3 className="font-bold text-green-500 text-lg">Analiz Tamamlandı!</h3>
                  <p className="text-sm text-green-500/80 mt-0.5">Sistem, GitHub'dan {repos.length} projeni başarıyla çekti ve kod okumaya hazır.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {repos.map((repo, idx) => (
                  <div key={idx} className="bg-sidebar border border-border p-5 rounded-2xl flex flex-col hover:border-primary/50 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg group-hover:text-primary transition-colors flex items-center gap-2 truncate pr-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" /> {repo.name.replace(/[-_]/g, ' ')}
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-1 rounded-md shrink-0">
                        {repo.lang}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                      {repo.desc}
                    </p>
                    
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">⭐ {repo.stars} Stars</span>
                      
                      <div className="flex gap-4 items-center">
                        <button 
                          onClick={() => openRepoExplorer(repo)} 
                          className="text-blue-400 hover:text-blue-300 transition-colors font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1"
                        >
                          <Code className="h-3 w-3" /> Kodu İncele
                        </button>
                        
                        {repo.archived ? (
                          <span className="text-red-400/80 font-bold uppercase tracking-wider flex items-center gap-1" title="Arşivlenmiş projeler düzenlenemez">
                            <Lock className="h-3 w-3"/> Kilitli
                          </span>
                        ) : (
                          <button 
                            onClick={() => openEditModal(repo)} 
                            className="text-primary hover:text-primary/70 transition-colors font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Düzenle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}