use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::Command; // İDE'leri başlatmak için gerekli

#[derive(Serialize, Clone)]
pub struct Track {
    id: String,
    title: String,
    format: String,
    path: String,
    modified_at: u64,
}

fn get_all_tracks(dir: &Path, tracks: &mut Vec<Track>, id_counter: &mut usize) {
    let supported_exts = ["mp3", "m4a", "wav", "flac", "ogg", "aac", "wma", "mid", "midi"];
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                get_all_tracks(&path, tracks, id_counter);
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if supported_exts.contains(&ext_lower.as_str()) {
                        let title = path.file_stem().and_then(|n| n.to_str()).unwrap_or("Bilinmeyen Şarkı").to_string();
                        let modified_at = fs::metadata(&path).and_then(|m| m.modified()).ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
                        tracks.push(Track { id: format!("trk_{}", *id_counter), title, format: ext_lower.to_uppercase(), path: path.to_string_lossy().into_owned(), modified_at });
                        *id_counter += 1;
                    }
                }
            }
        }
    }
}

#[tauri::command]
fn scan_music_folder(folder_path: &str) -> Result<Vec<Track>, String> {
    let path = Path::new(folder_path);
    if !path.exists() || !path.is_dir() { return Err("Klasör bulunamadı.".into()); }
    let mut tracks = Vec::new();
    let mut id_counter = 1;
    get_all_tracks(path, &mut tracks, &mut id_counter);
    Ok(tracks)
}

#[tauri::command]
fn read_audio_file(path: &str) -> Result<Vec<u8>, String> {
    std::fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_txt_file(path: &str, content: &str) -> Result<(), String> {
    let mut file = std::fs::OpenOptions::new().write(true).create(true).truncate(true).open(path).map_err(|e| format!("Dosya açılamadı: {}", e))?;
    file.write_all(b"\xEF\xBB\xBF").map_err(|e| format!("BOM yazılamadı: {}", e))?;
    file.write_all(content.as_bytes()).map_err(|e| format!("Dosyaya yazılamadı: {}", e))?;
    Ok(())
}

#[derive(Serialize, Clone)]
pub struct ProjectData {
    name: String,
    path: String,
    ptype: String,
}

#[tauri::command]
fn get_projects(folder_path: &str) -> Result<Vec<ProjectData>, String> {
    let path = Path::new(folder_path);
    let mut projects = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                let mut ptype = "Genel Klasör".to_string();

                if p.join("package.json").exists() { ptype = "Node.js / React".to_string(); }
                else if p.join("build.gradle").exists() || p.join("build.gradle.kts").exists() { ptype = "Android Studio".to_string(); }
                else if p.join("CMakeLists.txt").exists() { ptype = "C / C++".to_string(); }
                else if p.join("pom.xml").exists() { ptype = "Java".to_string(); }
                else if p.join("main.py").exists() { ptype = "Python".to_string(); }
                else {
                    if let Ok(sub_entries) = fs::read_dir(&p) {
                        for sub in sub_entries.flatten() {
                            if let Some(ext) = sub.path().extension() {
                                if ext == "sln" {
                                    ptype = "Visual Studio (C#)".to_string();
                                    break;
                                }
                            }
                        }
                    }
                }

                projects.push(ProjectData { name, path: p.to_string_lossy().to_string(), ptype });
            }
        }
    }
    projects.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(projects)
}

// ==========================================
// KUSURSUZ İDE AÇICI (TÜM İDE'LER EKLENDİ)
// ==========================================
#[tauri::command]
fn open_in_ide(path: &str, ide: &str) -> Result<(), String> {
    let is_win = cfg!(target_os = "windows");

    match ide {
        "vscode" => {
            if is_win { Command::new("cmd").args(["/C", "code", path]).spawn().map_err(|e| e.to_string())?; } 
            else { Command::new("code").arg(path).spawn().map_err(|e| e.to_string())?; }
        }
        "eclipse" => {
            if is_win { Command::new("cmd").args(["/C", "eclipse", path]).spawn().map_err(|e| e.to_string())?; } 
            else { Command::new("eclipse").arg(path).spawn().map_err(|e| e.to_string())?; }
        }
        "android_studio" => {
            if is_win { Command::new("cmd").args(["/C", "studio", path]).spawn().map_err(|e| e.to_string())?; } 
            else { Command::new("studio").arg(path).spawn().map_err(|e| e.to_string())?; }
        }
        "intellij" => {
            if is_win { Command::new("cmd").args(["/C", "idea", path]).spawn().map_err(|e| e.to_string())?; } 
            else { Command::new("idea").arg(path).spawn().map_err(|e| e.to_string())?; }
        }
        "visual_studio" => {
            let mut sln_path = String::new();
            if let Ok(entries) = fs::read_dir(Path::new(path)) {
                for entry in entries.flatten() {
                    if entry.path().extension().and_then(|e| e.to_str()) == Some("sln") {
                        sln_path = entry.path().to_string_lossy().to_string();
                        break;
                    }
                }
            }
            
            let target = if !sln_path.is_empty() { sln_path } else { path.to_string() };
            
            if is_win { Command::new("cmd").args(["/C", "start", "", &target]).spawn().map_err(|e| e.to_string())?; } 
            else { Command::new("open").arg(&target).spawn().map_err(|e| e.to_string())?; }
        }
        "explorer" => {
            if is_win { Command::new("explorer").arg(path).spawn().map_err(|e| e.to_string())?; } 
            else { Command::new("open").arg(path).spawn().map_err(|e| e.to_string())?; }
        }
        _ => return Err("Geçersiz IDE".to_string()),
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init()) 
        .plugin(tauri_plugin_dialog::init()) 
        .invoke_handler(tauri::generate_handler![scan_music_folder, read_audio_file, save_txt_file, get_projects, open_in_ide]) 
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}