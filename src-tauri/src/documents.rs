use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use base64::Engine;
use tauri::Manager;

const RECENT_FILE_NAME: &str = "recent.json";
const MAX_RECENT: usize = 10;

/// 读取 .smind 文档内容
#[tauri::command]
pub fn read_document(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("读取文件失败 {path}: {e}"))
}

/// 写入 .smind 文档：
/// 1. 目标已存在时，先复制为 `<path>.bak` 作为崩溃恢复备份
/// 2. 先写临时文件再 rename，保证写入原子性
#[tauri::command]
pub fn write_document(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);

    if target.exists() {
        let backup = format!("{path}.bak");
        fs::copy(target, &backup).map_err(|e| format!("创建备份失败 {backup}: {e}"))?;
    }

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }

    let tmp = target.with_extension("smind.tmp");
    fs::write(&tmp, content).map_err(|e| format!("写入临时文件失败: {e}"))?;
    fs::rename(&tmp, target).map_err(|e| format!("替换目标文件失败: {e}"))?;
    Ok(())
}

/// 获取最近文件列表（自动过滤已不存在的文件）
#[tauri::command]
pub fn get_recent_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let list = load_recent(&app)?;
    Ok(list.into_iter().filter(|p| Path::new(p).exists()).collect())
}

/// 将文件加入最近文件列表头部（去重，最多保留 10 条）
#[tauri::command]
pub fn add_recent_file(app: tauri::AppHandle, path: String) -> Result<Vec<String>, String> {
    let mut list = load_recent(&app)?;
    list.retain(|p| p != &path);
    list.insert(0, path);
    list.truncate(MAX_RECENT);
    save_recent(&app, &list)?;
    Ok(list)
}

/// 读取 .xmind（zip 容器）中的 content.json（XMind 2020+ 格式）
#[tauri::command]
pub fn read_xmind(path: String) -> Result<String, String> {
    let file = fs::File::open(&path).map_err(|e| format!("打开文件失败 {path}: {e}"))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("不是有效的 XMind 文件（zip）: {e}"))?;
    let mut entry = archive
        .by_name("content.json")
        .map_err(|_| "XMind 文件缺少 content.json（仅支持 XMind 2020+ 格式）".to_string())?;
    let mut content = String::new();
    entry
        .read_to_string(&mut content)
        .map_err(|e| format!("读取 content.json 失败: {e}"))?;
    Ok(content)
}

/// 写入二进制文件（前端传 base64，用于 PDF/PNG 导出）
#[tauri::command]
pub fn write_binary_base64(path: String, data: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("base64 解码失败: {e}"))?;
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }
    fs::write(&path, bytes).map_err(|e| format!("写入文件失败 {path}: {e}"))
}

fn recent_store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取配置目录: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("创建配置目录失败: {e}"))?;
    Ok(dir.join(RECENT_FILE_NAME))
}

fn load_recent(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = recent_store_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取最近文件列表失败: {e}"))?;
    Ok(serde_json::from_str(&content).unwrap_or_default())
}

fn save_recent(app: &tauri::AppHandle, list: &[String]) -> Result<(), String> {
    let path = recent_store_path(app)?;
    let content =
        serde_json::to_string_pretty(list).map_err(|e| format!("序列化最近文件列表失败: {e}"))?;
    fs::write(&path, content).map_err(|e| format!("保存最近文件列表失败: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn write_document_creates_backup_and_replaces_content() {
        let dir = std::env::temp_dir().join("slide-mind-test-docs");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("a.smind");
        let path = file.to_string_lossy().to_string();

        write_document(path.clone(), "v1".into()).unwrap();
        assert_eq!(read_document(path.clone()).unwrap(), "v1");
        assert!(!dir.join("a.smind.bak").exists());

        write_document(path.clone(), "v2".into()).unwrap();
        assert_eq!(read_document(path).unwrap(), "v2");
        assert_eq!(
            fs::read_to_string(dir.join("a.smind.bak")).unwrap(),
            "v1",
            "备份应保留上一版内容"
        );
    }

    #[test]
    fn read_xmind_extracts_content_json() {
        let dir = std::env::temp_dir().join("slide-mind-test-xmind");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("a.xmind");

        let file = fs::File::create(&path).unwrap();
        let mut writer = zip::ZipWriter::new(file);
        let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default();
        writer.start_file("content.json", options).unwrap();
        writer
            .write_all(br#"[{"rootTopic":{"title":"hi"}}]"#)
            .unwrap();
        writer.finish().unwrap();

        let content = read_xmind(path.to_string_lossy().to_string()).unwrap();
        assert!(content.contains("rootTopic"));
    }

    #[test]
    fn read_xmind_rejects_non_zip() {
        let dir = std::env::temp_dir().join("slide-mind-test-xmind2");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("bad.xmind");
        fs::write(&path, "not a zip").unwrap();
        assert!(read_xmind(path.to_string_lossy().to_string()).is_err());
    }

    #[test]
    fn write_binary_base64_roundtrip() {
        let dir = std::env::temp_dir().join("slide-mind-test-bin");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("out.bin");
        let encoded = base64::engine::general_purpose::STANDARD.encode([1u8, 2, 3]);
        write_binary_base64(path.to_string_lossy().to_string(), encoded).unwrap();
        assert_eq!(fs::read(&path).unwrap(), vec![1u8, 2, 3]);
    }
}
