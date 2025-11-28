<template>
  <v-dialog
    v-model="isShown"
    width="800"
    persistent
  >
    <v-card class="rounded-lg">
      <v-toolbar
        flat
        color="transparent"
      >
        <v-toolbar-title>{{ t('baseSetting.title') }}</v-toolbar-title>
        <v-spacer />
        <v-btn
          icon
          @click="isShown = false"
        >
          <v-icon>close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-text class="h-[60vh] overflow-auto">
        <BaseSettingJava />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="isShown = false"
        >
          {{ t('cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="onSave"
        >
          {{ t('save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { useDialog } from '@/composables/dialog'
import { kInstance } from '@/composables/instance'
import { InstanceEditInjectionKey, useInstanceEdit } from '@/composables/instanceEdit'
import { InstanceServiceKey } from '@xmcl/runtime-api'
import { injection } from '@/util/inject'
import BaseSettingJava from './BaseSettingJava.vue'
import { useService } from '@/composables/service'

const { t } = useI18n()
const { isShown } = useDialog('HomeLaunchConfigDialog')
const { instance } = injection(kInstance)
const { editInstance } = useService(InstanceServiceKey)

const { data, save, load } = useInstanceEdit(instance, editInstance)

provide(InstanceEditInjectionKey, {
  ...useInstanceEdit(instance, editInstance),
  data,
  save,
  load,
})

const loading = computed(() => data.loading)

watch(isShown, (v) => {
  if (v) {
    load()
  }
})

async function onSave() {
  await save()
  isShown.value = false
}
</script>
