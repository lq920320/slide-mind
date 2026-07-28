mod documents;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            documents::read_document,
            documents::write_document,
            documents::get_recent_files,
            documents::add_recent_file,
            documents::read_xmind,
            documents::write_binary_base64,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
