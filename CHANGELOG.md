# Değişiklik Günlüğü (Changelog)

**ULTIMATE** masaüstü uygulamasının sürüm geçmişi. Biçim: [Semantic Versioning](https://semver.org/lang/tr/).

---

## [1.3.0] - 16.10.2026

### Değişti
- Not resimleri artık **Supabase Storage** üzerindeki `note-images` bucket'ına yükleniyor; veritabanına **base64 gömme kaldırıldı**. Böylece `notes` tablosu küçük kalıyor ve resimler **tüm cihazlarda** görünüyor.
- Resim ekleme üç yolla: araç çubuğu 🖼️ butonu, **Ctrl+V** yapıştırma ve **sürükle-bırak**.

### Veritabanı
- `supabase/schema.sql`: `note-images` Storage bucket'ı ve yazma/silme RLS politikaları eklendi (9. bölüm).

### Dokümantasyon
- `fullcode.txt` (tam kaynak dökümü) güncel kodla eşitlendi.
- `README.md`: Storage tabanlı resim yükleme ve kurulum adımları eklendi.

---

## [1.2.1] - 16.10.2026

### Değişti
- Şifre sıfırlama, e-postadaki **sıfırlama bağlantısını yapıştırma** yöntemine geçti. Böylece **özel SMTP gerekmez** ve ücretsiz planın varsayılan e-posta şablonuyla çalışır.
- 6 haneli kod girişi de (custom SMTP + `{{ .Token }}` şablonu kuruluysa) desteklenmeye devam ediyor.

---

## [1.2.0] - 15.10.2026

### Eklendi
- **6 haneli kod** ile şifre sıfırlama akışı.

---

## [1.1.1] - 15.10.2026

### Düzeltildi
- **Hesap bazlı yerel depolama:** farklı hesaplar arasında veri sızması giderildi. Eski (hesap öneki olmayan) yerel veriler yalnızca bulutunda verisi olan "kurulu" hesaba devrediliyor; yeni/boş bir hesap onları sahiplenemiyor.

---

## [1.1.0] - 15.10.2026

### Eklendi
- E-posta + şifre ile **giriş** ve hesaba bağlı Supabase senkronu.
- Tüm tablolar için **RLS** koruması (`auth.uid() = user_id`).
- Kullanıcı bazlı veri senkronu ve yeni kurulum paketi (`.msi` / `-setup.exe`).

---

## [1.0.0] - 30.08.2026

### Eklendi
- İlk sürüm: **Akıllı Medya Oynatıcı** (MIDI destekli), **Geliştirme Stüdyosu** (IDE başlatıcı), **GitHub destekli ATS CV oluşturucu**, **Rainmeter uyumlu not defteri** ve **Takvim** modülü.

---

[1.3.0]: https://github.com/bilalhabessimsek/ULTIMATE/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/bilalhabessimsek/ULTIMATE/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/bilalhabessimsek/ULTIMATE/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/bilalhabessimsek/ULTIMATE/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/bilalhabessimsek/ULTIMATE/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/bilalhabessimsek/ULTIMATE/releases/tag/v1.0.0
