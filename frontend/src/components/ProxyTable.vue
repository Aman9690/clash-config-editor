<template>
  <div class="proxy-table">
    <div class="table-header">
      <el-button type="primary" :icon="Plus" @click="showAddDialog">添加代理</el-button>
      <el-select v-model="selectedProtocol" placeholder="筛选协议" clearable style="width: 200px">
        <el-option
          v-for="protocol in protocols"
          :key="protocol.type"
          :label="protocol.label"
          :value="protocol.type"
        />
      </el-select>
    </div>

    <el-table :data="filteredProxies" style="width: 100%">
      <el-table-column prop="name" label="名称" width="200" />
      <el-table-column prop="type" label="类型" width="120" />
      <el-table-column prop="server" label="服务器" min-width="250" />
      <el-table-column prop="port" label="端口" width="100" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row, $index }">
          <el-button size="small" @click="editProxy(row, $index)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteProxy($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑代理' : '添加代理'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="currentProxy" label-width="120px">
        <el-form-item label="协议类型">
          <el-select v-model="currentProxy.type" @change="onProtocolChange" :disabled="isEdit">
            <el-option
              v-for="protocol in protocols"
              :key="protocol.type"
              :label="protocol.label"
              :value="protocol.type"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-for="field in currentFields"
          :key="field.key"
          :label="field.label"
          :required="field.required"
        >
          <el-input
            v-if="field.type === 'string'"
            v-model="currentProxy[field.key]"
            :placeholder="field.label"
          />
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="currentProxy[field.key]"
            :placeholder="field.label"
            style="width: 100%"
          />
          <el-switch
            v-else-if="field.type === 'boolean'"
            v-model="currentProxy[field.key]"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="currentProxy[field.key]"
            :placeholder="'请选择' + field.label"
          >
            <el-option
              v-for="option in field.options"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProxy">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  category: Object,
  config: Object
})

const emit = defineEmits(['update'])

const protocols = computed(() => props.category.protocols || [])
const selectedProtocol = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentProxy = ref({})
const editIndex = ref(-1)
const currentFields = ref([])

const proxies = computed(() => props.config.proxies || [])

const filteredProxies = computed(() => {
  if (!selectedProtocol.value) return proxies.value
  return proxies.value.filter(p => p.type === selectedProtocol.value)
})

const onProtocolChange = () => {
  const protocol = protocols.value.find(p => p.type === currentProxy.value.type)
  currentFields.value = protocol?.fields || []
  
  const newProxy = { type: currentProxy.value.type }
  currentFields.value.forEach(field => {
    if (field.default !== undefined) {
      newProxy[field.key] = field.default
    }
  })
  currentProxy.value = newProxy
}

const showAddDialog = () => {
  isEdit.value = false
  currentProxy.value = { type: 'ss' }
  onProtocolChange()
  dialogVisible.value = true
}

const editProxy = (row, index) => {
  isEdit.value = true
  editIndex.value = index
  currentProxy.value = { ...row }
  const protocol = protocols.value.find(p => p.type === row.type)
  currentFields.value = protocol?.fields || []
  dialogVisible.value = true
}

const saveProxy = () => {
  const protocol = protocols.value.find(p => p.type === currentProxy.value.type)
  const requiredFields = protocol?.fields.filter(f => f.required) || []
  
  for (const field of requiredFields) {
    if (!currentProxy.value[field.key]) {
      ElMessage.error(`请填写 ${field.label}`)
      return
    }
  }

  const newProxies = [...proxies.value]
  let oldName = null
  
  if (isEdit.value) {
    oldName = newProxies[editIndex.value].name
    newProxies[editIndex.value] = { ...currentProxy.value }
    
    if (oldName !== currentProxy.value.name) {
      updateProxyGroupReferences(oldName, currentProxy.value.name)
      ElMessage.success(`修改成功，已同步更新代理组中的引用`)
    } else {
      ElMessage.success('修改成功')
    }
  } else {
    newProxies.push({ ...currentProxy.value })
    ElMessage.success('添加成功')
  }
  
  emit('update', 'proxies', newProxies)
  dialogVisible.value = false
}

const deleteProxy = async (index) => {
  const deletedProxyName = proxies.value[index].name
  
  try {
    await ElMessageBox.confirm(
      `确定要删除代理 "${deletedProxyName}" 吗？该代理将从所有代理组中移除。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const newProxies = proxies.value.filter((_, i) => i !== index)
    
    emit('update', 'proxies', newProxies)
    
    removeProxyFromGroups(deletedProxyName)
    
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}

const updateProxyGroupReferences = (oldName, newName) => {
  const proxyGroups = props.config['proxy-groups'] || []
  const updatedGroups = proxyGroups.map(group => {
    if (group.proxies && Array.isArray(group.proxies)) {
      return {
        ...group,
        proxies: group.proxies.map(proxy => proxy === oldName ? newName : proxy)
      }
    }
    return group
  })
  
  emit('update', 'proxy-groups', updatedGroups)
}

const removeProxyFromGroups = (proxyName) => {
  const proxyGroups = props.config['proxy-groups'] || []
  const updatedGroups = proxyGroups.map(group => {
    if (group.proxies && Array.isArray(group.proxies)) {
      return {
        ...group,
        proxies: group.proxies.filter(proxy => proxy !== proxyName)
      }
    }
    return group
  })
  
  emit('update', 'proxy-groups', updatedGroups)
}
</script>

<style scoped>
.proxy-table {
  width: 100%;
}

.table-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
