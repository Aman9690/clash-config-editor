<template>
  <div class="basic-config-form">
    <el-form label-width="180px" label-position="left">
      <el-form-item 
        v-for="field in category.fields" 
        :key="field.key"
        :label="field.label"
      >
        <template #label>
          <span>{{ field.label }}</span>
          <el-tooltip :content="field.description" placement="top">
            <el-icon class="info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </template>

        <el-input
          v-if="field.type === 'string'"
          :model-value="getConfigValue(field.key)"
          @input="(val) => updateValue(field.key, val)"
          :placeholder="field.example ? String(field.example) : ''"
          style="max-width: 400px"
        />

        <el-input-number
          v-else-if="field.type === 'number'"
          :model-value="getConfigValue(field.key)"
          @change="(val) => updateValue(field.key, val)"
          :placeholder="field.example ? String(field.example) : ''"
          style="max-width: 400px"
        />

        <el-switch
          v-else-if="field.type === 'boolean'"
          :model-value="getConfigValue(field.key)"
          @change="(val) => updateValue(field.key, val)"
        />

        <el-select
          v-else-if="field.type === 'select'"
          :model-value="getConfigValue(field.key)"
          @change="(val) => updateValue(field.key, val)"
          :placeholder="'请选择' + field.label"
          style="max-width: 400px"
        >
          <el-option
            v-for="option in field.options"
            :key="option"
            :label="option"
            :value="option"
          />
        </el-select>

        <div v-else-if="field.type === 'array'" style="width: 100%">
          <el-tag
            v-for="(item, index) in getConfigValue(field.key) || []"
            :key="index"
            closable
            @close="removeArrayItem(field.key, index)"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            {{ item }}
          </el-tag>
          <el-input
            v-model="arrayInputs[field.key]"
            @keyup.enter="addArrayItem(field.key)"
            placeholder="按Enter添加"
            style="width: 300px"
          >
            <template #append>
              <el-button @click="addArrayItem(field.key)" :icon="Plus">添加</el-button>
            </template>
          </el-input>
        </div>

        <el-input
          v-else-if="field.type === 'object'"
          :model-value="JSON.stringify(getConfigValue(field.key) || {}, null, 2)"
          @input="(val) => updateObjectValue(field.key, val)"
          type="textarea"
          :rows="6"
          placeholder="JSON格式"
          style="font-family: 'Consolas', 'Monaco', monospace; max-width: 600px"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { InfoFilled, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

const arrayInputs = ref({})

const getConfigValue = (key) => {
  if (key.includes('.')) {
    const keys = key.split('.')
    let value = props.config
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) return undefined
    }
    return value
  }
  return props.config[key]
}

const updateValue = (key, value) => {
  emit('update', key, value)
}

const updateObjectValue = (key, value) => {
  try {
    const obj = JSON.parse(value)
    emit('update', key, obj)
  } catch (error) {
    ElMessage.error('JSON格式错误')
  }
}

const addArrayItem = (key) => {
  const value = arrayInputs.value[key]
  if (!value || !value.trim()) return
  
  const arr = getConfigValue(key) || []
  emit('update', key, [...arr, value.trim()])
  arrayInputs.value[key] = ''
}

const removeArrayItem = (key, index) => {
  const arr = getConfigValue(key) || []
  const newArr = arr.filter((_, i) => i !== index)
  emit('update', key, newArr)
}
</script>

<style scoped>
.basic-config-form {
  max-width: 1200px;
}

.info-icon {
  margin-left: 6px;
  color: #909399;
  cursor: help;
  font-size: 14px;
}

.info-icon:hover {
  color: #409eff;
}

:deep(.el-form-item__label) {
  display: flex;
  align-items: center;
}
</style>
