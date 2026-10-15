import { supabase } from './supabase'

/**
 * Aktif oturumun kullanıcı id'sini döndürür.
 * Oturum yoksa null döner; çağıran taraf bu durumda bulut yazmasını atlar.
 * Supabase istemcisi oturumu yerelde tuttuğu için ağ isteği yapılmaz.
 */
export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function getSessionEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.email ?? null
}
