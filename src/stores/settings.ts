import { defineStore } from 'pinia'
import type { SlideAppearance } from '@/core/types'

const STORAGE_KEY = 'slide-mind-settings'

interface Settings {
  /** 自动保存防抖间隔（秒） */
  autosaveDelaySec: number
  /** 新文档的默认演示外观 */
  defaultAppearance: SlideAppearance
}

const DEFAULTS: Settings = {
  autosaveDelaySec: 3,
  defaultAppearance: 'dark',
}

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>
    return {
      autosaveDelaySec: clampDelay(Number(raw.autosaveDelaySec ?? DEFAULTS.autosaveDelaySec)),
      defaultAppearance: raw.defaultAppearance === 'light' ? 'light' : 'dark',
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function clampDelay(sec: number): number {
  if (!Number.isFinite(sec)) return DEFAULTS.autosaveDelaySec
  return Math.min(60, Math.max(1, Math.round(sec)))
}

export const useSettingsStore = defineStore('settings', {
  state: (): Settings => load(),

  getters: {
    autosaveDelayMs: (state) => state.autosaveDelaySec * 1000,
  },

  actions: {
    setAutosaveDelaySec(sec: number) {
      this.autosaveDelaySec = clampDelay(sec)
      this.persist()
    },
    setDefaultAppearance(appearance: SlideAppearance) {
      this.defaultAppearance = appearance
      this.persist()
    },
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          autosaveDelaySec: this.autosaveDelaySec,
          defaultAppearance: this.defaultAppearance,
        }),
      )
    },
  },
})
