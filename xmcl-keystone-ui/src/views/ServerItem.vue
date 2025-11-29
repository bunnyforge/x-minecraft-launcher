<template>
  <v-card
    hover
    class="server-card transition-all duration-300"
    :class="{ 'server-card-selected': selected }"
    @click="$emit('click')"
  >
    <div class="flex h-full flex-col p-4">
      <!-- Header: Status & Name -->
      <div class="mb-3 flex flex-col gap-2">
        <!-- Top row: Avatar, Name, Status -->
        <div class="flex items-center gap-3">
          <div class="relative flex-shrink-0">
            <v-avatar
              size="40"
              :class="statusClass"
              class="transition-all duration-300"
            >
              <v-icon color="white">
                {{ statusIcon }}
              </v-icon>
            </v-avatar>
            <div
              class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white"
              :class="statusIndicatorClass"
            />
          </div>
          
          <span class="min-w-0 flex-1 truncate text-base font-bold leading-tight">
            {{ server.name }}
          </span>

          <v-chip
            x-small
            :color="statusColor"
            text-color="white"
            class="flex-shrink-0 font-bold"
          >
            {{ server.status }}
          </v-chip>
        </div>

        <!-- Second row: Version, Type -->
        <div class="flex flex-wrap items-center gap-2 pl-[52px]">
          <v-chip
            x-small
            label
            outlined
            class="font-mono"
          >
            {{ server.version }}
          </v-chip>
          <v-chip
            x-small
            label
            color="primary"
            outlined
            class="font-mono"
          >
            {{ server.serverType }}
          </v-chip>
        </div>

        <!-- Modpack or Mods info -->
        <div
          v-if="modpackName || modsCount > 0"
          class="flex flex-wrap items-center gap-2 pl-[52px]"
        >
          <v-chip
            v-if="modpackName"
            x-small
            label
            color="deep-purple"
            outlined
            class="max-w-full"
          >
            <v-icon
              x-small
              left
            >
              inventory_2
            </v-icon>
            <span class="truncate">{{ modpackName }}</span>
          </v-chip>
          <v-chip
            v-else-if="modsCount > 0"
            x-small
            label
            color="teal"
            outlined
          >
            <v-icon
              x-small
              left
            >
              extension
            </v-icon>
            {{ modsCount }} {{ t('mod.name', modsCount) }}
          </v-chip>
        </div>
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
              <span>{{ t('gameServer.players') }}</span>
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

// Modpack name extracted from URL
const modpackName = computed(() => {
  const url = props.server.modrinthModpack
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'modrinth.com') {
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (pathParts[0] === 'modpack' && pathParts[1]) {
        // Convert slug to readable name
        return pathParts[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      }
    }
  } catch {
    // Not a URL, might be slug
    if (url.includes(':')) {
      return url.split(':')[0].split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
    return url.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  return null
})

// Count of mods from modrinthProjects
const modsCount = computed(() => {
  const projects = props.server.modrinthProjects
  if (!projects) return 0
  return projects.split(',').filter((p: string) => p.trim()).length
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
