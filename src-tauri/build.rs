use std::path::Path;

fn main() {
    // Load GOOGLE_CLIENT_SECRET from ../.env.local if not already set
    if std::env::var("GOOGLE_CLIENT_SECRET").is_err() {
        let env_path = Path::new("../.env.local");
        if env_path.exists() {
            if let Ok(content) = std::fs::read_to_string(env_path) {
                for line in content.lines() {
                    let line = line.trim();
                    if line.starts_with('#') || line.is_empty() {
                        continue;
                    }
                    if let Some((key, value)) = line.split_once('=') {
                        if key.trim() == "GOOGLE_CLIENT_SECRET" {
                            println!("cargo:rustc-env=GOOGLE_CLIENT_SECRET={}", value.trim());
                        }
                    }
                }
            }
        }
    }

    // Re-run if .env.local changes
    println!("cargo:rerun-if-changed=../.env.local");
    println!("cargo:rerun-if-env-changed=GOOGLE_CLIENT_SECRET");

    tauri_build::build()
}
