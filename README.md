# 🚀 ULTIMATE - Geliştirici Asistanı & Medya İstasyonu

![Tauri](https://img.shields.io/badge/Tauri-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**ULTIMATE**, geliştiricilerin günlük iş akışlarını hızlandırmak ve multimedya ihtiyaçlarını tek bir merkezden yönetmek için tasarlanmış, **Tauri ve Rust** tabanlı yüksek performanslı bir masaüstü (Desktop) uygulamasıdır[cite: 3]. 

Sistem kaynaklarını minimum düzeyde tüketirken; akıllı müzik çalar, proje başlatıcı stüdyo, GitHub destekli ATS CV oluşturucu ve Rainmeter entegreli not defteri modüllerini modern bir arayüzde sunar[cite: 3].

---

## ✨ Temel Modüller ve Özellikler

### 🎵 1. Akıllı Medya Oynatıcı (Player)
* **Kapsamlı Format Desteği:** Klasik ses formatlarının (MP3, WAV, FLAC vb.) yanı sıra `@tonejs/midi` altyapısı sayesinde yerel **MIDI (.mid)** dosyalarını çok sesli sentezleyici (PolySynth) ile çalar[cite: 3].
* **Gelişmiş Kuyruk Yönetimi:** Şarkıları sıraya alma, yukarı/aşağı taşıma, sıranın en üstüne sabitleme (Pin) ve özel listeler (Playlist) oluşturma[cite: 3].
* **Sürükle-Bırak:** Yerel klasörleri tarayıp arşivi oluşturduktan sonra şarkıları sürükleyerek çalma listelerine ekleme[cite: 3].

| Müzik Çalar & Kuyruk Yönetimi | Özel Çalma Listeleri |
| :---: | :---: |
| <img src="docs/screenshots/muzik-calar.png" width="100%" alt="Oynatıcı Modülü"/> | <img src="docs/screenshots/calma-listeleri.png" width="100%" alt="Çalma Listeleri"/> |
| *MIDI destekli, gelişmiş kuyruk ve oynatma yönetimi sunan entegre müzik çalar.* | *Sürükle-bırak destekli sınırsız oynatma listesi (playlist) ve arşiv txt/dışa aktarım yönetimi.* |

---

### 💻 2. Geliştirme Stüdyosu (Projects)
* **Otomatik Keşif:** Belirlenen ana dizinlerdeki projeleri tarar ve içindeki dosyalara (`package.json`, `pom.xml`, `CMakeLists.txt`, `.sln`) bakarak projenin teknolojisini (React, Java, C++, C#, Python, Android) otomatik tespit eder[cite: 3].
* **Tek Tıkla IDE Başlatma:** Projeleri doğrudan bulundukları dizin üzerinden işletim sistemi komutlarıyla **VS Code, Visual Studio, Eclipse veya Android Studio**'da anında ayağa kaldırır[cite: 3].

| IDE Başlatıcı & Kayıtlı Dizinler | Repo Dosya İnceleyici |
| :---: | :---: |
| <img src="docs/screenshots/gelistirme-studyosu.png" width="100%" alt="Projeler Modülü"/> | <img src="docs/screenshots/repo-gezgini.png" width="100%" alt="Repo Gezgini"/> |
| *Yerel projeleri otomatik tanıyıp VS Code, Visual Studio ve Android Studio gibi IDE'lerde başlatma ekranı.* | *GitHub depolarını uygulama içinden klasör/dosya ağacıyla anlık olarak inceleme.* |

---

### 📄 3. Kariyer & GitHub Yöneticisi
* **GitHub Entegrasyonu:** Kullanıcı adı ile açık kaynaklı depoları çeker, yıldız sayısına göre sıralar ve depo içeriklerini (kodları) uygulama içinden canlı okutur[cite: 3].
* **ATS Uyumlu CV Üretici:** GitHub verilerini, girilen eğitim ve yetenek setlerini harmanlayarak ATS okuyucularından %100 geçecek saf bir CV oluşturur[cite: 3]. Bu CV, **Markdown (.md) veya TXT** formatlarında dışa aktarılabilir[cite: 3].

| Özgeçmiş & GitHub Bağlantısı | Depo (Repo) Analizi |
| :---: | :---: |
| <img src="docs/screenshots/cv-olusturucu.png" width="100%" alt="CV Bağlantı Ekranı"/> | <img src="docs/screenshots/github-repolar.png" width="100%" alt="GitHub Repoları"/> |
| *ATS uyumlu Markdown/TXT özgeçmiş oluşturmak için okul, dil ve yetenek giriş paneli.* | *Kullanıcının GitHub depolarının canlı analizi ve yıldız sayılarına göre sıralı listesi.* |

---

### 📝 4. Rainmeter Uyumlu Not Defteri
* **Anlık Senkronizasyon:** Alınan notları (Ctrl+S) anında belirtilen bir yerel `.txt` dosyasına yazar[cite: 3]. Bu sayede masaüstündeki **Rainmeter** widget'ları notları anlık olarak ekranda gösterebilir[cite: 3].
* Hızlı etiketleme, sabitleme (Pin), içe/dışa dosya aktarımı ve anlık arama özellikleri[cite: 3].

| Rainmeter Widget & Not Senkronizasyonu |
| :---: |
| <img src="docs/screenshots/Notlar-ve-Rainmeter.png" width="100%" alt="Notlar ve Rainmeter"/> |
| *Uygulama üzerinden alınan notların (Ctrl+S) anlık olarak masaüstündeki özel Rainmeter widget'ına aktarılması.* |

---

### ☁️ 5. Bulut Senkronu (Supabase)
* **Hesaba Bağlı Güvenlik:** Giriş e-posta + şifre ile yapılır; tüm tablolar **RLS** ile korunur (`auth.uid() = user_id`). Uygulamanın içindeki publishable key'i ele geçiren biri, senin hesabına giriş yapmadıkça verilerine erişemez.
* **Anlık Yedekleme:** Notlar `Ctrl+S` ile hem yerel dosyaya hem **Supabase** `notes` tablosuna yazılır.
* **Takvim Senkronu:** Takvim etkinlikleri `calendar_events` tablosunda tutulur; uygulama ilk açılışta yereldeki (`localStorage`) eski etkinlikleri otomatik olarak buluta taşır.
* **Müzik Senkronu:** Çalma listeleri (`playlists`), favoriler ve dinleme sayıları (`music_state`) bulutta tutulur; başka bir cihazda aynı liste ve favoriler hazır gelir.
* **Kararlı Şarkı Kimlikleri:** Şarkıların kimliği taranan kök klasöre göre göreli yoldur (ör. `rock/parca.mp3`). Böylece müzik klasörü yeniden tarandığında favori ve listeler **yanlış şarkıya işaret etmez**; klasör hatırlanır ve açılışta otomatik taranır.
* **Realtime:** Aynı hesaptan açılan diğer pencereler/cihazlar, veritabanı olaylarını (**INSERT/UPDATE/DELETE**) kanal üzerinden dinleyerek listeleri anında günceller.
* **Offline-first:** Bağlantı yoksa uygulama `localStorage`'a düşer; takvim başlığında küçük bir "yerel" rozeti görünür ve kullanım kesintisiz devam eder.
* **Şema:** Tüm tablolar, RLS politikaları ve realtime ayarları `supabase/schema.sql` dosyasındadır.

---

## 🛠️ Kullanılan Teknolojiler

* **Backend & Çekirdek:** Rust, Tauri 2.0 API, Native OS Commands (`std::process::Command`)[cite: 3]
* **Frontend:** React 19, TypeScript, Vite[cite: 3]
* **Stil & UI:** Tailwind CSS v4, Lucide React Icons[cite: 3]
* **Ses Motoru:** Web Audio API, Tone.js[cite: 3]

---

## 🚀 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak veya derlemek için Node.js ve Rust (Cargo) ortamlarının kurulu olması gerekmektedir[cite: 3].

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/bilalhabessimsek/ULTIMATE.git
   cd ULTIMATE
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Ortam değişkenlerini ayarlayın:
   ```bash
   cp .env.example .env
   ```
   `.env` içine Supabase **Project URL** ve **Publishable key**'ini girin (aşağıya bakın).

4. Geliştirme modunda çalıştırın:
   ```bash
   npm run tauri dev
   ```

5. Üretim derlemesi (Windows `.msi` / `.exe` dahil):
   ```bash
   npm run tauri build
   ```

---

## ☁️ Supabase Kurulumu (Bulut Senkronu)

Notların bulutta senkronize olması için tek seferlik kurulum gerekir:

1. [supabase.com/dashboard](https://supabase.com/dashboard) adresinden projenizi açın.
2. Proje ana sayfasındaki **`Connect`** butonuna tıklayın → **Project URL** ve **Publishable key**'i kopyalayın.
3. Kopyaladıklarınızı `.env` dosyasına yazın:
   ```env
   VITE_SUPABASE_URL=https://<20-haneli-proje-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
   > ⚠️ **Project URL'deki ref'i birebir kopyalayın.** Tek bir harf hatası (ör. `g` ↔ `q`) DNS kaydını tamamen kırar ve hata "DNS adı yok" olarak görünür.

4. **Tablolar + politikalar + realtime:** `supabase/schema.sql` dosyasının **tamamını** SQL editöründe çalıştırın. Script;
   - `notes`, `calendar_events`, `playlists`, `music_state` tablolarını,
   - **hesaba bağlı** RLS politikalarını (`auth.uid() = user_id`),
   - not resimleri için **`note-images` Storage bucket'ını** ve yazma/silme politikalarını (9. bölüm),
   - realtime yayın üyeliğini
   
   tek seferde kurar. Ayrıca 7. bölümü sahipsiz eski satırları ilk kullanıcıya bağlar ve bileşik anahtarları (`user_id + name/key`) oluşturur.

   > ⚠️ Önce **Authentication → Users** ekranından bir kullanıcı oluşturun. Kullanıcı yoksa script uyarı verip durur (bilinçli koruma).
   > ⚠️ Elle **`using (true)` politikası eklemeyin.** Postgres politikaları varsayılan olarak **VEYA** ile birleşir; tek bir gevşek politika tüm RLS korumasını geçersiz kılar.

**Hızlı doğrulama (terminal):**
```bash
curl -s -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  "https://<proje-ref>.supabase.co/rest/v1/notes?select=id&limit=1"
```
Oturum açılmadığı için `[]` dönmesi **beklenen** davranıştır (RLS veriyi kapatıyor). Yazma denemesi `42501` ile reddedilmeli.

### 🖼️ Not Resimleri (Supabase Storage)

Notlara eklenen resimler artık **base64 olarak veritabanına gömülmez**. Resim Supabase Storage'daki `note-images` bucket'ına yüklenir, nota yalnızca kısa bir genel URL yazılır.

**Neden?** Base64 gömme resmi ~%33 şişirir ve `notes.content` kolonunu megabaytlara çıkarır; ayrıca resim yalnızca o bilgisayarda kalırdı. Storage ile veritabanı küçük kalır ve resim **tüm cihazlarda** görünür.

Üç yolla resim eklenebilir:

| Yöntem | Nasıl |
|---|---|
| **Buton** | Araç çubuğundaki 🖼️ ikonu → dosya seçici |
| **Yapıştır** | Ekran görüntüsünü kopyala → editörde **Ctrl+V** |
| **Sürükle-bırak** | Resim dosyasını editörün üzerine bırak |

Yükleme sırasında araç çubuğunda "Resim yükleniyor..." göstergesi çıkar; hata olursa kırmızı bir uyarı bandı görünür.

**Kurulum:** `supabase/schema.sql` **9. bölümünü** (bucket + politikalar) bir kez çalıştırmak yeterlidir — dosyanın tamamını çalıştırdıysanız zaten kurulmuştur. Bucket'ı Dashboard'dan elle de açabilirsiniz:

1. **Storage → New bucket** → ad: **`note-images`** → **Public bucket** açık → *Create*.
2. **Policies** için yukarıdaki SQL'i çalıştırın (yazma/silme yalnızca kendi `<user_id>/` klasörüne izinlidir).

> 🔒 Bucket **public** olduğu için bağlantıyı bilen resmi görüntüleyebilir (URL'ler rastgele ve tahmin edilemez). Kişisel kullanım için pratiktir; tam gizlilik istersen bucket'ı private yapıp imzalı URL üretimine geçebiliriz.
> 📦 Ücretsiz plan Storage kotası 1 GB'dır. Tek resim üst sınırı uygulama tarafında **10 MB**.

---

## 🔐 Kimlik Doğrulama (Auth)

Notlar, takvim ve listeler artık **hesaba bağlı**. Satır Düzeyi Güvenlik (RLS) politikaları `auth.uid() = user_id` şeklinde olduğu için publishable key'e sahip başka biri **kendi hesabı olmadan verilerini göremez**.

Kurulum sırası önemli:

1. Dashboard → **Authentication → Users** → *Add user* → e-posta + şifre gir, **Auto Confirm** işaretli olsun.
2. `supabase/schema.sql` dosyasının tamamını SQL editöründe çalıştır (7. bölüm sahipsiz eski satırları otomatik olarak bu kullanıcıya bağlar).
3. Uygulamayı aç → giriş ekranı gelir → aynı e-posta/şifre ile giriş yap.

> E-posta onayı zorunlu olsun istemiyorsan: Authentication → Sign In / Providers → Email → **Confirm email** kapalı olabilir. Kapalıysa hesap oluşturur oluşturmaz giriş yapılır.

Oturum yerelde saklandığı için uygulama her açılışta tekrar giriş istemez; çıkış için sol menüdeki **çıkış (LogOut)** butonu kullanılır.

### 🔁 Şifre Sıfırlama (bağlantı yapıştırma)

Masaüstü uygulamasında e-posta bâglantısına tıklamak işe yaramaz (tarayıcıya `http://localhost:3000`'e gider). Bu yüzden uygulama, e-postadaki bağlantının **içindeki token**'ı okur:

1. Giriş ekranı → **Şifremi unuttum** → e-postanı gir → *Sıfırlama Bağlantısı Gönder*.
2. Gelen e-postada **"Reset password"** yazısına sağ tık → **Bağlantıyı kopyala**.
3. Uygulamadaki kutuya yapıştır + yeni şifreyi belirle → *Şifreyi Güncelle*.

Uygulama yapıştırılan metinden `token=` değerini ayıklar ve `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` ile oturumu açar, ardından şifreyi günceller.

> **Neden kod (OTP) değil?** 6 haneli kod yöntemi e-posta şablonuna `{{ .Token }}` eklemeyi gerektirir; ancak Supabase ücretsiz planında **varsayılan mail servisi kullanılırken şablon düzenlenemez** (custom SMTP veya Pro plan gerekir). Bağlantı yapıştırma yöntemi hiçbir ayar gerektirmez ve varsayılan şablonla çalışır.
>
> Kod alanı da desteklenir: e-postada 6 haneli kod varsa (custom SMTP + `{{ .Token }}` şablonu kuruluysa) doğrudan o kod girilebilir.
> Bağlantının geçerlilik süresi: Authentication → Providers → Email → *Email OTP Expiry* (varsayılan 3600 sn).

---

## 📅 Sürüm Geçmişi

Güncel sürüm: **1.3.0**. Ayrıntılı sürüm notları için [CHANGELOG.md](CHANGELOG.md) dosyasına bakın.

| Sürüm | Tarih | Öne çıkan değişiklik |
| :---: | :---: | --- |
| **1.3.0** | 16.10.2026 | Not resimleri Supabase Storage'a yükleniyor (base64 gömme kaldırıldı) |
| 1.2.1 | 16.10.2026 | Şifre sıfırlama: bağlantı yapıştırma (SMTP gerekmez) |
| 1.2.0 | 15.10.2026 | 6 haneli kodla şifre sıfırlama akışı |
| 1.1.1 | 15.10.2026 | Hesap bazlı yerel depolama (hesaplar arası veri sızması giderildi) |
| 1.1.0 | 15.10.2026 | Hesaba bağlı Supabase senkronu ve RLS koruması |
| 1.0.0 | 30.08.2026 | İlk sürüm (Player, Projects, CV, Notlar, Takvim) |

