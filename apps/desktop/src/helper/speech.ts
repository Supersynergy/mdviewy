import { logger } from '@/helper/logger'
import { invoke } from '@tauri-apps/api/core'

export type SpeechEngine = {
  id: string
  label: string
  /** Short note shown next to the entry, e.g. the model behind it. */
  detail: string
}

let cached: SpeechEngine[] | undefined

/**
 * Voices installed on this machine, newest-first by setup cost: the system
 * voice always works, local models only appear when their binary exists.
 * Nothing is listed that cannot speak, so the menu has no dead entries.
 */
export const speechEngines = async (): Promise<SpeechEngine[]> => {
  if (cached) return cached

  try {
    cached = await invoke<SpeechEngine[]>('speech_engines')
  } catch (error) {
    logger.debug('speech engine lookup failed', error)
    cached = []
  }

  return cached
}

/** Forgets the cache, e.g. after the user installs a voice CLI. */
export const resetSpeechEngines = () => {
  cached = undefined
}

export const speak = async (engine: string, text: string) => {
  await invoke('speech_speak', { engine, text })
}

export const stopSpeaking = async () => {
  await invoke('speech_stop')
}
