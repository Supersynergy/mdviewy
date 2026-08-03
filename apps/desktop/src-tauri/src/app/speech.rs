use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;

use lazy_static::lazy_static;

lazy_static! {
    /// The process currently reading text aloud, so `stop_speaking` can end it.
    static ref CURRENT: Mutex<Option<Child>> = Mutex::new(None);
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SpeechEngine {
    pub id: String,
    pub label: String,
    /// Short note the menu shows next to the entry.
    pub detail: String,
}

struct EngineSpec {
    id: &'static str,
    label: &'static str,
    detail: &'static str,
    /// Candidate binary locations, first hit wins.
    candidates: &'static [&'static str],
    /// Arguments before the spoken text.
    args: &'static [&'static str],
}

/// Ordered by how little they need: the system voice always works, the local
/// models only show up when their binary is installed.
const ENGINES: &[EngineSpec] = &[
    EngineSpec {
        id: "system",
        label: "System voice",
        detail: "macOS say, offline",
        candidates: &["/usr/bin/say"],
        args: &[],
    },
    EngineSpec {
        id: "jarvis_de",
        label: "Jarvis · German",
        detail: "Piper / Thorsten",
        candidates: &[
            "~/.local/bin/jarvis",
            "/opt/homebrew/bin/jarvis",
            "/usr/local/bin/jarvis",
        ],
        args: &["say"],
    },
    EngineSpec {
        id: "jarvis_en",
        label: "Jarvis · English",
        detail: "Kokoro",
        candidates: &[
            "~/.local/bin/jarvis",
            "/opt/homebrew/bin/jarvis",
            "/usr/local/bin/jarvis",
        ],
        args: &["say", "--en"],
    },
];

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = std::env::var_os("HOME") {
            return Path::new(&home).join(rest);
        }
    }
    PathBuf::from(path)
}

fn resolve(spec: &EngineSpec) -> Option<PathBuf> {
    spec.candidates
        .iter()
        .map(|candidate| expand_home(candidate))
        .find(|path| path.is_file())
}

/// Text long enough to be worth speaking, short enough to stay responsive.
const MAX_SPOKEN_CHARS: usize = 20_000;

pub fn available_engines() -> Vec<SpeechEngine> {
    ENGINES
        .iter()
        .filter(|spec| resolve(spec).is_some())
        .map(|spec| SpeechEngine {
            id: spec.id.to_string(),
            label: spec.label.to_string(),
            detail: spec.detail.to_string(),
        })
        .collect()
}

fn stop_current() {
    if let Ok(mut guard) = CURRENT.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

pub fn speak(engine_id: &str, text: &str) -> Result<(), String> {
    let spec = ENGINES
        .iter()
        .find(|spec| spec.id == engine_id)
        .ok_or_else(|| format!("unknown speech engine: {engine_id}"))?;
    let binary = resolve(spec).ok_or_else(|| format!("{} is not installed", spec.label))?;

    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("nothing to speak".to_string());
    }

    let spoken: String = trimmed.chars().take(MAX_SPOKEN_CHARS).collect();

    stop_current();

    // Text is passed as a single argument, never through a shell.
    let child = Command::new(binary)
        .args(spec.args)
        .arg(spoken)
        .spawn()
        .map_err(|err| format!("could not start {}: {err}", spec.label))?;

    if let Ok(mut guard) = CURRENT.lock() {
        *guard = Some(child);
    }

    Ok(())
}

pub fn stop() {
    stop_current();

    // Jarvis owns its own playback process, so ask it to stop as well.
    if let Some(jarvis) = ENGINES
        .iter()
        .find(|spec| spec.id == "jarvis_de")
        .and_then(resolve)
    {
        let _ = Command::new(jarvis).arg("stop").spawn();
    }
}

pub mod cmd {
    use super::{available_engines, speak, stop, SpeechEngine};
    use tauri::command;

    #[command]
    pub fn speech_engines() -> Vec<SpeechEngine> {
        available_engines()
    }

    #[command]
    pub fn speech_speak(engine: String, text: String) -> Result<(), String> {
        speak(&engine, &text)
    }

    #[command]
    pub fn speech_stop() {
        stop()
    }
}

#[cfg(test)]
mod tests {
    use super::{available_engines, expand_home, speak, ENGINES};

    #[test]
    fn expands_home_relative_candidates() {
        unsafe { std::env::set_var("HOME", "/Users/tester") };

        assert_eq!(
            expand_home("~/.local/bin/jarvis").to_string_lossy(),
            "/Users/tester/.local/bin/jarvis"
        );
        assert_eq!(
            expand_home("/usr/bin/say").to_string_lossy(),
            "/usr/bin/say"
        );
    }

    #[test]
    fn every_engine_declares_at_least_one_candidate() {
        for spec in ENGINES {
            assert!(!spec.candidates.is_empty(), "{} has no binary", spec.id);
            assert!(!spec.label.is_empty());
        }
    }

    #[test]
    fn only_installed_engines_are_offered() {
        // The list is filtered by binary existence, so it can never contain an
        // engine whose binary is missing on this machine.
        for engine in available_engines() {
            let spec = ENGINES.iter().find(|spec| spec.id == engine.id).unwrap();
            assert!(super::resolve(spec).is_some());
        }
    }

    #[test]
    fn rejects_unknown_engines_and_empty_text() {
        assert!(speak("nope", "hello").is_err());
        assert!(speak("system", "   ").is_err());
    }
}
