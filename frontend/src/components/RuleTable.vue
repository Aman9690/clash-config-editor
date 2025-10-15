<template>
  <div class="rule-table">
    <div class="table-header">
      <el-button type="primary" :icon="Plus" @click="showAddDialog">添加规则</el-button>
      <el-input 
        v-model="searchText" 
        placeholder="搜索规则" 
        clearable 
        style="width: 300px"
        :prefix-icon="Search"
      />
    </div>

    <el-table :data="filteredRules" style="width: 100%">
      <el-table-column type="index" label="#" width="60" />
      <el-table-column label="规则" min-width="450">
        <template #default="{ row }">
          <el-tag>{{ row.type }}</el-tag>
          <span v-if="row.value" style="margin: 0 8px">{{ row.value }}</span>
          <el-tag type="success">{{ row.policy }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ $index }">
          <div class="action-buttons">
            <el-button size="small" @click="moveUp($index)" :disabled="$index === 0">
              上移
            </el-button>
            <el-button size="small" @click="moveDown($index)" :disabled="$index === rules.length - 1">
              下移
            </el-button>
            <el-button size="small" type="danger" @click="deleteRule($index)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      title="添加规则"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="currentRule" label-width="100px">
        <el-form-item label="规则类型">
          <el-select v-model="currentRule.type" @change="onRuleTypeChange" style="width: 100%">
            <el-option
              v-for="ruleType in ruleTypes"
              :key="ruleType.type"
              :label="ruleType.label"
              :value="ruleType.type"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="匹配值" v-if="needsValue">
          <el-input v-model="currentRule.value" placeholder="输入匹配值" />
        </el-form-item>

        <el-form-item label="策略">
          <el-select v-model="currentRule.policy" placeholder="选择策略" style="width: 100%">
            <el-option label="DIRECT" value="DIRECT" />
            <el-option label="REJECT" value="REJECT" />
            <el-option
              v-for="group in proxyGroups"
              :key="group.name"
              :label="group.name"
              :value="group.name"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  category: Object,
  config: Object
})

const emit = defineEmits(['update'])

const ruleTypes = computed(() => props.category.ruleTypes || [])
const searchText = ref('')
const dialogVisible = ref(false)
const currentRule = ref({
  type: 'DOMAIN-SUFFIX',
  value: '',
  policy: 'DIRECT'
})

const rules = computed(() => {
  const ruleStrings = props.config.rules || []
  return ruleStrings.map(ruleStr => parseRule(ruleStr))
})

const proxyGroups = computed(() => props.config['proxy-groups'] || [])

const filteredRules = computed(() => {
  if (!searchText.value) return rules.value
  const search = searchText.value.toLowerCase()
  return rules.value.filter(rule => 
    rule.type.toLowerCase().includes(search) ||
    rule.value?.toLowerCase().includes(search) ||
    rule.policy.toLowerCase().includes(search)
  )
})

const needsValue = computed(() => {
  const ruleType = ruleTypes.value.find(rt => rt.type === currentRule.value.type)
  return ruleType?.hasValue !== false
})

const parseRule = (ruleStr) => {
  const parts = ruleStr.split(',')
  const type = parts[0]
  
  const ruleType = ruleTypes.value.find(rt => rt.type === type)
  if (ruleType?.hasValue === false) {
    return {
      type,
      value: null,
      policy: parts[1] || 'DIRECT'
    }
  }
  
  return {
    type,
    value: parts[1] || '',
    policy: parts[2] || 'DIRECT'
  }
}

const formatRule = (rule) => {
  if (rule.value) {
    return `${rule.type},${rule.value},${rule.policy}`
  }
  return `${rule.type},${rule.policy}`
}

const onRuleTypeChange = () => {
  const ruleType = ruleTypes.value.find(rt => rt.type === currentRule.value.type)
  if (ruleType?.hasValue === false) {
    currentRule.value.value = ''
  }
}

const showAddDialog = () => {
  currentRule.value = {
    type: 'DOMAIN-SUFFIX',
    value: '',
    policy: 'DIRECT'
  }
  dialogVisible.value = true
}

const saveRule = () => {
  if (needsValue.value && !currentRule.value.value) {
    ElMessage.error('请输入匹配值')
    return
  }
  
  if (!currentRule.value.policy) {
    ElMessage.error('请选择策略')
    return
  }

  const ruleStr = formatRule(currentRule.value)
  const newRules = [...(props.config.rules || []), ruleStr]
  
  emit('update', 'rules', newRules)
  dialogVisible.value = false
  ElMessage.success('添加成功')
}

const deleteRule = (index) => {
  const newRules = (props.config.rules || []).filter((_, i) => i !== index)
  emit('update', 'rules', newRules)
  ElMessage.success('删除成功')
}

const moveUp = (index) => {
  if (index === 0) return
  const newRules = [...(props.config.rules || [])]
  ;[newRules[index - 1], newRules[index]] = [newRules[index], newRules[index - 1]]
  emit('update', 'rules', newRules)
}

const moveDown = (index) => {
  const rulesList = props.config.rules || []
  if (index === rulesList.length - 1) return
  const newRules = [...rulesList]
  ;[newRules[index], newRules[index + 1]] = [newRules[index + 1], newRules[index]]
  emit('update', 'rules', newRules)
}
</script>

<style scoped>
.rule-table {
  width: 100%;
}

.table-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}
</style>
