/**
 * Hesap bazlı yerel depolama.
 *
 * Sorun: Notlar, takvim ve müzik verileri `localStorage`'ta hesaptan bağımsız
 * (öneksiz) tutuluyordu. Aynı bilgisayarda farklı bir hesapla giriş yapıldığında
 * önceki hesabın verileri ekranda görünüyor ve üstelik yeni hesabın bulutuna
 * yazılabiliyordu.
 *
 * Çözüm: Bulutla senkronize edilen tüm anahtarlar `user:<kullanici-id>:<anahtar>`
 * biçiminde saklanır. Böylece her hesap yalnızca kendi yerel önbelleğini görür.
 *
 * Cihaza özel ayarlar (müzik klasörü yolu, sıralama tercihi, Rainmeter yolu,
 * proje klasörleri, CV bilgileri, ilk kurulum bayrağı) bilinçli olarak global
 * bırakılmıştır; bunlar veri değil, makine yapılandırmasıdır.
 */

let currentUserId: string | null = null

/** Giriş/çıkış anında App tarafından çağrılır. */
export function setCurrentUserId(id: string | null): void {
  currentUserId = id
}

export function getActiveUserId(): string | null {
  return currentUserId
}

function prefix(): string {
  return currentUserId ? `user:${currentUserId}:` : 'user:anon:'
}

export function uGet(key: string): string | null {
  try {
    return localStorage.getItem(prefix() + key)
  } catch {
    return null
  }
}

export function uSet(key: string, value: string): void {
  try {
    localStorage.setItem(prefix() + key, value)
  } catch (err) {
    console.error('Yerel kayıt hatası:', err)
  }
}

export function uRemove(key: string): void {
  try {
    localStorage.removeItem(prefix() + key)
  } catch {
    /* yoksay */
  }
}

export function uGetJson<T>(key: string, fallback: T): T {
  const raw = uGet(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function uSetJson(key: string, value: unknown): void {
  uSet(key, JSON.stringify(value))
}

/**
 * Bulutla senkronize edilen anahtarlar. Bunlar hesap bazlı olmalıdır.
 */
export const SYNCED_KEYS = [
  'ultimate_notes',
  'ultimate_events',
  'music_favs',
  'music_playlists',
  'music_playcounts',
  'music_ids_migrated_v2',
  'music_cloud_migrated_v2',
] as const

/** Eski (hesap öneki olmayan) yerel veri duruyor mu? */
export function hasLegacyKeys(): boolean {
  for (const key of SYNCED_KEYS) {
    try {
      if (localStorage.getItem(key) !== null) return true
    } catch {
      /* yoksay */
    }
  }
  return false
}

/**
 * Eski (öneksiz) yerel veriyi aktif hesaba devreder ve öneksiz kopyaları siler.
 *
 * Sadece "kurulu" hesap için çağrılmalıdır (bulutunda verisi olan hesap).
 * Aksi halde yeni açılmış boş bir hesap, başka bir hesabın verisini sahiplenirdi.
 */
export function claimLegacyKeys(): void {
  for (const key of SYNCED_KEYS) {
    let legacy: string | null = null
    try {
      legacy = localStorage.getItem(key)
    } catch {
      continue
    }
    if (legacy === null) continue

    if (uGet(key) === null) uSet(key, legacy)
    try {
      localStorage.removeItem(key)
    } catch {
      /* yoksay */
    }
  }
}
