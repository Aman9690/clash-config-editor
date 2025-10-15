<template>
  <div class="config-editor">
    <div class="editor-header">
      <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
      <span class="current-file">
        <el-icon><Document /></el-icon>
        {{ configStore.currentFile }}
      </span>
      <div class="actions">
        <el-button :icon="View" @click="previewYAML">预览YAML</el-button>
        <el-button type="primary" :icon="Check" @click="saveConfig" :loading="saving">
          保存配置
        </el-button>
      </div>
    </div>

    <div class="editor-content" v-loading="!metadata">
      <el-tabs v-model="activeTab" v-if="metadata">
        <el-tab-pane 
          v-for="category in metadata.categories" 
          :key="category.id"
          :label="category.name"
          :name="category.id"
        >
          <component 
            :is="getComponentForCategory(category)"
            :category="category"
            :config="configStore.config"
            @update="updateConfig"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog 
      v-model="previewVisible" 
      title="YAML预览" 
      width="70%"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="yamlPreview"
        type="textarea"
        :rows="20"
        readonly
        style="font-family: 'Consolas', 'Monaco', monospace"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Document, View, Check } from '@element-plus/icons-vue'
import yaml from 'js-yaml'
import { fileAPI, configAPI } from '@/api'
import { useConfigStore } from '@/stores/config'
import BasicConfigForm from '@/components/BasicConfigForm.vue'
import ProxyTable from '@/components/ProxyTable.vue'
import ProxyGroupTable from '@/components/ProxyGroupTable.vue'
import RuleTable from '@/components/RuleTable.vue'

const router = useRouter()
const configStore = useConfigStore()

const activeTab = ref('basic')
const metadata = ref(null)
const saving = ref(false)
const previewVisible = ref(false)
const yamlPreview = ref('')

const goBack = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要返回吗？未保存的更改将丢失。',
      '确认返回',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    router.push('/')
  } catch {
  }
}

const getComponentForCategory = (category) => {
  if (category.id === 'proxies') return ProxyTable
  if (category.id === 'proxy-groups') return ProxyGroupTable
  if (category.id === 'rules') return RuleTable
  return BasicConfigForm
}

const updateConfig = (key, value) => {
  const config = { ...configStore.config }
  if (key.includes('.')) {
    const keys = key.split('.')
    let obj = config
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {}
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value
  } else {
    config[key] = value
  }
  configStore.setConfig(config)
}

const saveConfig = async () => {
  saving.value = true
  try {
    const validateRes = await configAPI.validate(configStore.config)
    
    if (validateRes.errors && validateRes.errors.length > 0) {
      await ElMessageBox.confirm(
        `配置验证发现 ${validateRes.errors.length} 个错误：\n\n${validateRes.errors.slice(0, 5).join('\n')}${validateRes.errors.length > 5 ? '\n...' : ''}\n\n是否仍要保存？`,
        '配置验证失败',
        {
          confirmButtonText: '仍要保存',
          cancelButtonText: '取消',
          type: 'error'
        }
      )
    } else if (validateRes.warnings && validateRes.warnings.length > 0) {
      await ElMessageBox.confirm(
        `配置验证发现 ${validateRes.warnings.length} 个警告：\n\n${validateRes.warnings.slice(0, 3).join('\n')}${validateRes.warnings.length > 3 ? '\n...' : ''}\n\n是否继续保存？`,
        '配置验证警告',
        {
          confirmButtonText: '继续保存',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }
    
    const res = await fileAPI.save(configStore.currentFile, configStore.config)
    if (res.success) {
      ElMessage.success('保存成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('保存失败: ' + error.message)
    }
  } finally {
    saving.value = false
  }
}

const previewYAML = () => {
  try {
    yamlPreview.value = yaml.dump(configStore.config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    })
    previewVisible.value = true
  } catch (error) {
    ElMessage.error('生成YAML失败: ' + error.message)
  }
}

const loadMetadata = async () => {
  try {
    const response = await fetch('/config-metadata.json')
    metadata.value = await response.json()
    configStore.setMetadata(metadata.value)
  } catch (error) {
    ElMessage.error('加载配置元数据失败')
  }
}

onMounted(() => {
  if (!configStore.currentFile) {
    router.push('/')
    return
  }
  loadMetadata()
})
</script>

<style scoped>
.config-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  height: 64px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
}

.current-file {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.actions {
  display: flex;
  gap: 12px;
}

.editor-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
  background: #f5f7fa;
}

.editor-content :deep(.el-tabs) {
  background: white;
  border-radius: 4px;
  padding: 16px;
}

.editor-content :deep(.el-tabs__content) {
  padding: 16px 0;
}
</style>
