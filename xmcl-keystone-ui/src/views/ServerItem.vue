<template>
  <v-card
    hover
    class="server-card transition-all duration-300"
    :class="{ 'server-card-selected': selected }"
    @click="$emit('click')"
  >
    <div class="flex h-full flex-col p-4">
      <!-- Header: Status & Name -->
      <div class="mb-3 flex items-start justify-between">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="relative">
            <v-avatar
              size="48"
              :class="statusClass"
              class="transition-all duration-300"
            >
              <v-icon
                large
                color="white"
              >
                {{ statusIcon }}
              </v-icon>
            </v-avatar>
            <div
              class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white"
              :class="statusIndicatorClass"
            />
          </div>
          
          <div class="flex min-w-0 flex-col">
            <div class="flex items-center gap-2">
              <span class="truncate text-lg font-bold leading-tight">
                {{ server.name }}
              </span>
              <v-chip
                x-small
                label
                outlined
                class="flex-shrink-0 font-mono"
              >
                {{ server.version }}
              </v-chip>
              <v-chip
                x-small
                label
                color="primary"
                outlined
                class="flex-shrink-0 font-mono"
              >
                {{ server.serverType }}
              </v-chip>
            </div>
            
            <div class="flex items-center gap-1 text-sm text-gray-500">
              <v-btn
                text
                x-small
                class="px-1"
                @click.stop="copyAddress"
              >
                <v-icon
                  x-small
                  left
                >
                  content_copy
                </v-icon>
                {{ t('copyAddress') }}
              </v-btn>
            </div>
          </div>
        </div>

        <v-chip
          small
          :color="statusColor"
          text-color="white"
          class="flex-shrink-0 font-bold shadow-sm"
        >
          {{ server.status }}
        </v-chip>
      </div>

      <v-divider class="mb-3" />

      <!-- Metrics -->
      <div class="flex flex-grow flex-col gap-3">
        <!-- Players -->
        <div>
          <div class="mb-1 flex justify-between text-xs font-medium text-gray-500">
            <div class="flex items-center gap-1">
              <v-icon
                x-small
                color="grey"
              >
                people
              </v-icon>
              <span>{{ t('server.players') }}</span>
            </div>
            <span>{{ server.metrics.onlinePlayers }} / {{ server.metrics.maxPlayers }}</span>
          </div>
          <v-progress-linear
            :value="playerPercentage"
            height="6"
            rounded
            :color="playerColor"
            background-opacity="0.1"
          />
        </div>

        <!-- System Stats Grid -->
        <div class="grid grid-cols-2 gap-3">
          <!-- CPU -->
          <div class="rounded bg-gray-50 dark:bg-gray-800 p-2">
            <div class="mb-1 flex justify-between text-xs text-gray-500">
              <span>CPU</span>
              <span>{{ server.metrics.cpuUsagePercent.toFixed(1) }}%</span>
            </div>
            <v-progress-linear
              :value="server.metrics.cpuUsagePercent"
              height="4"
              rounded
              :color="getUsageColor(server.metrics.cpuUsagePercent)"
            />
          </div>

          <!-- RAM -->
          <div class="rounded bg-gray-50 dark:bg-gray-800 p-2">
            <div class="mb-1 flex justify-between text-xs text-gray-500">
              <span>RAM</span>
              <span>{{ server.metrics.memoryUsagePercent.toFixed(1) }}%</span>
            </div>
            <v-progress-linear
              :value="server.metrics.memoryUsagePercent"
              height="4"
              rounded
              :color="getUsageColor(server.metrics.memoryUsagePercent)"
            />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-4 flex justify-end">
        <v-btn
          color="primary"
          block
          depressed
          :loading="connecting"
          @click.stop="$emit('connect')"
        >
          <v-icon left>
            play_arrow
          </v-icon>
          {{ t('gameServer.connect') }}
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<script lang="ts" setup>


const props = defineProps<{
  server: any
  region: any
  selected?: boolean
  connecting?: boolean
}>()

const emit = defineEmits(['click', 'connect'])
const { t } = useI18n()

const serverHost = computed(() => {
  return `${props.region.domain}:${props.server.nodePort}`
})

const statusColor = computed(() => {
  return props.server.status === 'RUNNING' ? 'success' : 'error'
})

const statusClass = computed(() => {
  return props.server.status === 'RUNNING' ? 'success' : 'grey darken-3'
})

const statusIndicatorClass = computed(() => {
  return props.server.status === 'RUNNING' ? 'bg-green-500' : 'bg-red-500'
})

const statusIcon = computed(() => {
  return props.server.status === 'RUNNING' ? 'dns' : 'dns'
})

const playerPercentage = computed(() => {
  return (props.server.metrics.onlinePlayers / props.server.metrics.maxPlayers) * 100
})

const playerColor = computed(() => {
  const p = playerPercentage.value
  if (p >= 90) return 'error'
  if (p >= 70) return 'warning'
  return 'success'
})

function getUsageColor(percentage: number) {
  if (percentage >= 80) return 'error'
  if (percentage >= 60) return 'warning'
  return 'success'
}

function copyAddress() {
  navigator.clipboard.writeText(serverHost.value)
}
</script>

<style scoped>
.server-card {
  border: 1px solid transparent;
}

.server-card:hover {
  transform: translateY(-2px);
  border-color: var(--v-primary-base);
}

.server-card-selected {
  border-color: var(--v-primary-base);
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
