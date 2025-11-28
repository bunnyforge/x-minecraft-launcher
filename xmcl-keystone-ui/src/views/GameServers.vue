<template>
  <div class="game-servers-page h-full overflow-auto">
    <!-- Header -->
    <div class="sticky top-0 z-10 flex items-center gap-4 bg-[#121212]/95 px-8 py-6 backdrop-blur-md transition-all duration-300">
      <div class="rounded-xl bg-primary/10 p-3">
        <v-icon
          large
          color="primary"
        >
          dns
        </v-icon>
      </div>
      <div class="flex flex-col">
        <span class="text-h5 font-bold tracking-tight">{{ t('gameServer.title') }}</span>
        <span class="text-sm text-gray-500">Manage and connect to your game servers</span>
      </div>
      <v-spacer />
      <v-btn
        icon
        large
        :loading="loading"
        class="transition-transform hover:rotate-180"
        @click="refresh"
      >
        <v-icon>refresh</v-icon>
      </v-btn>
    </div>

    <div class="px-8 pb-8">
      <v-alert
        v-if="error"
        type="error"
        dismissible
        border="left"
        elevation="2"
        colored-border
        class="mb-6"
        @input="error = null"
      >
        {{ t('gameServer.error') }}: {{ error.message }}
      </v-alert>

      <div
        v-if="regions.length > 0"
        class="flex flex-col gap-8"
      >
        <div
          v-for="region in regions"
          :key="region.id"
          class="animate-fade-in"
        >
          <!-- Region Header -->
          <div class="mb-4 flex items-center gap-3">
            <v-icon
              color="primary"
              small
            >
              public
            </v-icon>
            <span class="text-xl font-bold tracking-wide">{{ region.name }}</span>
            <v-chip
              x-small
              outlined
              class="font-mono font-bold"
            >
              {{ region.servers.length }}
            </v-chip>
            <div class="h-px flex-grow bg-gray-200 dark:bg-gray-800" />
          </div>

          <!-- Server Grid -->
          <div v-if="region.servers.length > 0">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <ServerItem
                v-for="server in region.servers"
                :key="server.nodePort"
                :server="server"
                :region="region"
                :connecting="connectingServer === server.nodePort"
                @connect="onConnectClick(region, server)"
              />
            </div>
          </div>

          <div
            v-else
            class="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-800"
          >
            <v-icon
              large
              color="grey lighten-2"
              class="mb-2"
            >
              dns
            </v-icon>
            <div class="text-gray-500">
              {{ t('gameServer.noServers') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!loading"
        class="flex h-[60vh] flex-col items-center justify-center text-center"
      >
        <div class="mb-6 rounded-full bg-gray-50 p-8 dark:bg-gray-800">
          <v-icon
            size="64"
            color="grey lighten-1"
          >
            dns
          </v-icon>
        </div>
        <h3 class="text-h5 font-bold text-gray-700 dark:text-gray-300">
          {{ t('gameServer.empty') }}
        </h3>
        <p class="mt-2 text-gray-500">
          No game servers found. Try refreshing the list.
        </p>
        <v-btn
          color="primary"
          large
          class="mt-6 px-8"
          rounded
          elevation="2"
          @click="refresh"
        >
          <v-icon left>
            refresh
          </v-icon>
          {{ t('refresh') }}
        </v-btn>
      </div>

      <!-- Loading State -->
      <div
        v-else
        class="flex h-[60vh] flex-col items-center justify-center"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          width="6"
        />
        <p class="mt-4 animate-pulse text-lg font-medium text-gray-500">
          {{ t('loading') }}
        </p>
      </div>
    </div>

    <v-snackbar
      v-model="snackbar"
      :timeout="3000"
      color="success"
      rounded="pill"
      content-class="text-center font-bold"
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
import { kInstance } from '@/composables/instance'
import { kGameServerList } from '@/composables/gameServerList'
import { injection } from '@/util/inject'
import { GameRegion, InstanceServiceKey } from '@xmcl/runtime-api'
import { useService } from '@/composables/service'
import ServerItem from './ServerItem.vue'

const { regions, loading, error, refresh, connectToServer } = injection(kGameServerList)
const { instance } = injection(kInstance)
const { editInstance } = useService(InstanceServiceKey)
const { t } = useI18n()
const router = useRouter()

const snackbar = ref(false)
const snackbarText = ref('')
const connectingServer = ref<number | null>(null)

onMounted(() => {
  if (regions.value.length === 0) {
    refresh()
  }
})

async function onConnectClick(region: GameRegion, server: any) {
  connectingServer.value = server.nodePort
  try {
    const host = connectToServer(region, server)
    const [hostname, port] = host.split(':')
    
    // 保存服务器信息到实例配置
    await editInstance({
      instancePath: instance.value.path,
      name: server.name, // 使用服务器名称作为实例名称
      server: {
        host: hostname,
        port: parseInt(port, 10),
      },
      runtime: {
        minecraft: server.version,
      }
    })
    
    snackbarText.value = `${t('gameServer.connected')}: ${server.name} (${host})`
    snackbar.value = true
    
    console.log('Connected to server:', host, 'Version:', server.version)

    // 跳转到主页，让用户可以配置模组等内容
    router.push('/')
  } catch (e) {
    console.error('Failed to connect to server:', e)
    error.value = e as Error
  } finally {
    connectingServer.value = null
  }
}
</script>

<style scoped>
.game-servers-page {
  background: transparent;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.4);
}
</style>
