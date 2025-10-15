<template>
  <div class="file-selector">
    <el-card class="selector-card">
      <template #header>
        <div class="card-header">
          <el-icon style="margin-right: 8px"><Folder /></el-icon>
          <span>选择或上传Clash配置文件</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="服务器文件" name="server">
          <div class="server-files">
            <el-button 
              type="primary" 
              :icon="Refresh" 
              @click="loadFiles"
              :loading="loading"
              style="margin-bottom: 16px"
            >
              刷新列表
            </el-button>

            <el-table 
              :data="files" 
              v-loading="loading"
              @row-click="selectFile"
              highlight-current-row
              style="width: 100%"
            >
              <el-table-column prop="name" label="文件名" />
              <el-table-column prop="size" label="大小" width="120">
                <template #default="{ row }">
                  {{ formatSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column prop="modified" label="修改时间" width="200">
                <template #default="{ row }">
                  {{ formatDate(row.modified) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180">
                <template #default="{ row }">
                  <el-button 
                    type="primary" 
                    size="small"
                    @click.stop="selectFile(row)"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small"
                    @click.stop="deleteFile(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="上传文件" name="upload">
          <div class="upload-section">
            <el-upload
              drag
              :auto-upload="false"
              :on-change="handleFileChange"
              :limit="1"
              accept=".yaml,.yml"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                拖拽文件到此处或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  只支持 .yaml 或 .yml 格式的文件
                </div>
              </template>
            </el-upload>

            <el-button 
              type="primary" 
              @click="uploadFile"
              :disabled="!selectedUploadFile"
              :loading="uploading"
              style="margin-top: 16px"
            >
              上传并编辑
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Folder, Refresh, UploadFilled } from '@element-plus/icons-vue'
import { fileAPI } from '@/api'
import { useConfigStore } from '@/stores/config'

const router = useRouter()
const configStore = useConfigStore()

const activeTab = ref('server')
const files = ref([])
const loading = ref(false)
const uploading = ref(false)
const selectedUploadFile = ref(null)

const loadFiles = async () => {
  loading.value = true
  try {
    const res = await fileAPI.list()
    if (res.success) {
      files.value = res.files
    }
  } catch (error) {
    ElMessage.error('加载文件列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const selectFile = async (file) => {
  try {
    const res = await fileAPI.read(file.name)
    if (res.success) {
      configStore.setCurrentFile(file.name)
      configStore.setConfig(res.config)
      configStore.setOriginalContent(res.content)
      router.push('/editor')
    }
  } catch (error) {
    ElMessage.error('读取文件失败: ' + error.message)
  }
}

const deleteFile = async (file) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件 "${file.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await fileAPI.delete(file.name)
    if (res.success) {
      ElMessage.success('删除成功')
      loadFiles()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const handleFileChange = (file) => {
  selectedUploadFile.value = file
}

const uploadFile = async () => {
  if (!selectedUploadFile.value) return
  
  uploading.value = true
  try {
    const res = await fileAPI.upload(selectedUploadFile.value.raw)
    if (res.success) {
      ElMessage.success('上传成功')
      await selectFile({ name: res.file.name })
    }
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message)
  } finally {
    uploading.value = false
  }
}

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadFiles()
})
</script>

<style scoped>
.file-selector {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
  padding: 24px;
}

.selector-card {
  width: 100%;
  max-width: 1000px;
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
}

.server-files {
  padding: 16px 0;
}

.upload-section {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

:deep(.el-upload-dragger) {
  width: 480px;
}
</style>
