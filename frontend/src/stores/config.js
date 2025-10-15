import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const currentFile = ref(null)
  const config = ref(null)
  const originalContent = ref('')
  const metadata = ref(null)

  const setCurrentFile = (file) => {
    currentFile.value = file
  }

  const setConfig = (newConfig) => {
    config.value = newConfig
  }

  const setOriginalContent = (content) => {
    originalContent.value = content
  }

  const setMetadata = (data) => {
    metadata.value = data
  }

  const reset = () => {
    currentFile.value = null
    config.value = null
    originalContent.value = ''
  }

  return {
    currentFile,
    config,
    originalContent,
    metadata,
    setCurrentFile,
    setConfig,
    setOriginalContent,
    setMetadata,
    reset
  }
})
