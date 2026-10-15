# resources/ — Gömülü Kurulum Dosyaları

Bu klasör, `tauri build` ile üretim (`.exe`/`.msi`) yaparken uygulamanın **içine gömülür**.

## Beklenen dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `Rainmeter-4.5.exe` | Kullanıcıda Rainmeter yoksa sessizce kurmak için resmi kurulum dosyası |
| `Ultimate.rmskin` | Sizin widget'larınızın (Günün Olayı vb.) paketlenmiş hali |

## Nereden alınır

1. **Rainmeter-4.5.exe** → <https://www.rainmeter.net> sayfasından indirilir, adı tam olarak `Rainmeter-4.5.exe` olacak şekilde bu klasöre kopyalanır.
2. **Ultimate.rmskin** → Rainmeter içinde sağ alttaki damla ikonuna tıklayıp
   "Paket Oluştur / Create .rmskin" diyerek mevcut temanız tek tıkla paketlenir.
   Paket adını `Ultimate.rmskin` yapıp bu klasöre koyun.

## Notlar (önemli)

- `tauri.conf.json > bundle > resources` şu anda `resources/**/*` glob'u ile tanımlı.
  Klasörde eşleşen **en az bir** dosya yoksa `tauri dev`/`tauri build`
  hata verir. Klasör şimdilik `.gitkeep` sayesinde doludur; gerçek dosyaları
  eklediğinizde hiçbir yapılandırma değişikliği gerekmez.
- Kod tarafında `src-tauri/src/lib.rs` içindeki `resolve_bundled_resource`
  hem development hem paketlenmiş kurulumda dosyaları bulur:
  1. `$RESOURCE/<dosya>`
  2. `$RESOURCE/resources/<dosya>`
  3. `src-tauri/resources/<dosya>` (geliştirme modu)
- Komut Rust tarafında: `install_rainmeter_widgets` (invoke_handler'a kayıtlı).
  React tarafı: `src/components/SetupWizard.tsx` → `App.tsx` içinde render edilir.
