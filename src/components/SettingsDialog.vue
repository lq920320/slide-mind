<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SlideAppearance } from '@/core/types'
import { setLocale } from '@/i18n'
import type { AppLocale } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'

defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const settings = useSettingsStore()

function switchLocale(e: Event) {
  setLocale((e.target as HTMLSelectElement).value as AppLocale)
}

function changeDelay(e: Event) {
  settings.setAutosaveDelaySec(Number((e.target as HTMLInputElement).value))
}

function changeAppearance(e: Event) {
  settings.setDefaultAppearance((e.target as HTMLSelectElement).value as SlideAppearance)
}
</script>

<template>
  <div class="settings-mask" @click.self="$emit('close')">
    <div class="settings-dialog" role="dialog" :aria-label="t('settings.title')">
      <header>
        <strong>{{ t('settings.title') }}</strong>
        <button class="close" :title="t('settings.close')" @click="$emit('close')">✕</button>
      </header>

      <label>
        <span>{{ t('toolbar.language') }}</span>
        <select :value="locale" @change="switchLocale">
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </label>

      <label>
        <span>{{ t('settings.autosaveInterval') }}</span>
        <span class="control">
          <input
            type="number"
            min="1"
            max="60"
            :value="settings.autosaveDelaySec"
            @change="changeDelay"
          />
          {{ t('settings.seconds') }}
        </span>
      </label>

      <label>
        <span>{{ t('settings.defaultAppearance') }}</span>
        <select :value="settings.defaultAppearance" @change="changeAppearance">
          <option value="dark">{{ t('settings.dark') }}</option>
          <option value="light">{{ t('settings.light') }}</option>
        </select>
      </label>
    </div>
  </div>
</template>

<style scoped>
.settings-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-dialog {
  width: 340px;
  background: #2b2d31;
  color: #e6e6e6;
  border: 1px solid #4a4d55;
  border-radius: 10px;
  padding: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close {
  border: none;
  background: transparent;
  color: #9aa0a8;
  cursor: pointer;
  font-size: 14px;
}

.close:hover {
  color: #fff;
}

label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.control {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9aa0a8;
}

select,
input[type='number'] {
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid #4a4d55;
  border-radius: 5px;
  background: #383b41;
  color: #e6e6e6;
}

input[type='number'] {
  width: 64px;
}
</style>
