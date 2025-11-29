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
        <span class="text-sm text-gray-500">{{ t('gameServer.subtitle') }}</span>
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
          {{ t('gameServer.emptyHint') }}
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

      <!-- Loading State - Skeleton -->
      <div
        v-else
        class="flex flex-col gap-8"
      >
        <!-- Skeleton Region -->
        <div
          v-for="i in 2"
          :key="i"
          class="animate-fade-in"
        >
          <!-- Skeleton Region Header -->
          <div class="mb-4 flex items-center gap-3">
            <div class="h-5 w-5 animate-pulse rounded bg-gray-700" />
            <div class="h-6 w-32 animate-pulse rounded bg-gray-700" />
            <div class="h-5 w-8 animate-pulse rounded-full bg-gray-700" />
            <div class="h-px flex-grow bg-gray-800" />
          </div>

          <!-- Skeleton Server Grid -->
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div
              v-for="j in 4"
              :key="j"
              class="skeleton-card rounded-lg border border-gray-800 bg-gray-900/50 p-4"
              :style="{ animationDelay: `${(i - 1) * 200 + j * 100}ms` }"
            >
              <!-- Skeleton Header -->
              <div class="mb-3 flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-12 w-12 animate-pulse rounded-full bg-gray-700" />
                  <div class="flex flex-col gap-2">
                    <div class="h-5 w-28 animate-pulse rounded bg-gray-700" />
                    <div class="flex gap-2">
                      <div class="h-4 w-16 animate-pulse rounded bg-gray-700" />
                      <div class="h-4 w-12 animate-pulse rounded bg-gray-700" />
                    </div>
                  </div>
                </div>
                <div class="h-6 w-16 animate-pulse rounded-full bg-gray-700" />
              </div>

              <div class="my-3 h-px bg-gray-800" />

              <!-- Skeleton Metrics -->
              <div class="flex flex-col gap-3">
                <div>
                  <div class="mb-1 flex justify-between">
                    <div class="h-3 w-16 animate-pulse rounded bg-gray-700" />
                    <div class="h-3 w-12 animate-pulse rounded bg-gray-700" />
                  </div>
                  <div class="h-1.5 w-full animate-pulse rounded bg-gray-700" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded bg-gray-800 p-2">
                    <div class="mb-1 flex justify-between">
                      <div class="h-3 w-8 animate-pulse rounded bg-gray-700" />
                      <div class="h-3 w-10 animate-pulse rounded bg-gray-700" />
                    </div>
                    <div class="h-1 w-full animate-pulse rounded bg-gray-700" />
                  </div>
                  <div class="rounded bg-gray-800 p-2">
                    <div class="mb-1 flex justify-between">
                      <div class="h-3 w-8 animate-pulse rounded bg-gray-700" />
                      <div class="h-3 w-10 animate-pulse rounded bg-gray-700" />
                    </div>
                    <div class="h-1 w-full animate-pulse rounded bg-gray-700" />
                  </div>
                </div>
              </div>

              <!-- Skeleton Button -->
              <div class="mt-4 h-9 w-full animate-pulse rounded bg-gray-700" />
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div class="flex items-center justify-center gap-3 py-4">
          <div class="loading-dot h-2 w-2 rounded-full bg-primary" />
          <div
            class="loading-dot h-2 w-2 rounded-full bg-primary"
            style="animation-delay: 0.2s"
          />
          <div
            class="loading-dot h-2 w-2 rounded-full bg-primary"
            style="animation-delay: 0.4s"
          />
        </div>
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
import { kInstances } from '@/composables/instances'
import { kGameServerList } from '@/composables/gameServerList'
import { useGameServerModsInstaller } from '@/composables/gameServerModsInstaller'
import { injection } from '@/util/inject'
import { GameRegion, GameServer, InstanceServiceKey } from '@xmcl/runtime-api'
import { useService } from '@/composables/service'
import ServerItem from './ServerItem.vue'

const { regions, loading, error, refresh, connectToServer } = injection(kGameServerList)
const { instance, runtime } = injection(kInstance)
const { instances, selectedInstance } = injection(kInstances)
const { createInstance, editInstance } = useService(InstanceServiceKey)
const { t } = useI18n()
const router = useRouter()

// Mods installer - 使用现有的 installFromMarket 接口
const { installServerMods, installServerModpack } = useGameServerModsInstaller(
  computed(() => instance.value.path)
)

const snackbar = ref(false)
const snackbarText = ref('')
const connectingServer = ref<number | null>(null)

onMounted(() => {
  if (regions.value.length === 0) {
    refresh()
  }
})

/**
 * 生成服务器实例的唯一标识
 * 使用 大区名 + 服务名 生成
 */
function generateServerInstanceId(region: GameRegion, server: GameServer): string {
  return `${region.name}_${server.name}`
}

async function onConnectClick(region: GameRegion, server: GameServer) {
  console.log('[GameServer] Connect clicked, server:', server)
  
  connectingServer.value = server.nodePort
  try {
    const host = connectToServer(region, server)
    const [hostname, port] = host.split(':')
    const portNum = parseInt(port, 10)
    
    // 生成服务器实例的唯一 ID
    const serverInstanceId = generateServerInstanceId(region, server)
    console.log('[GameServer] Server instance ID:', serverInstanceId)
    
    // 查找是否已存在该服务器的实例（通过实例文件夹名称匹配）
    const existingInstance = instances.value.find(inst => inst.path.endsWith(serverInstanceId))
    
    let instancePath: string
    
    if (existingInstance) {
      // 已存在，更新实例配置
      instancePath = existingInstance.path
      await editInstance({
        instancePath,
        name: serverInstanceId,  // 保持名称与目录名一致
        server: {
          host: hostname,
          port: portNum,
        },
      })
      console.log('[GameServer] Updated existing instance:', instancePath)
      
      // 切换到该实例
      selectedInstance.value = instancePath
      
      snackbarText.value = `${t('gameServer.connected')}: ${server.name} (${host})`
      snackbar.value = true
      
      // 跳转到主页
      router.push('/')
    } else if (server.modrinthModpack) {
      // 不存在且有整合包，安装整合包
      console.log('[GameServer] Server has modrinthModpack:', server.modrinthModpack)
      
      instancePath = await installServerModpack(
        server.modrinthModpack,
        serverInstanceId,  // 使用服务器唯一 ID 作为目录名和显示名称
        serverInstanceId,  // 保持名称与目录名一致
        hostname,
        portNum
      ) || ''
      
      if (instancePath) {
        snackbarText.value = `${t('gameServer.connected')}: ${server.name} (${host})`
        snackbar.value = true
        console.log('[GameServer] Modpack installed, instance:', instancePath)
      } else {
        throw new Error('Failed to install modpack')
      }
    } else {
      // 不存在且没有整合包，创建新实例
      const runtimeConfig: any = {
        minecraft: server.version,
      }
      
      instancePath = await createInstance({
        name: serverInstanceId,
        server: {
          host: hostname,
          port: portNum,
        },
        runtime: runtimeConfig,
      })
      // 目录名和实例名称都是 serverInstanceId，无需再更新
      console.log('[GameServer] Created new instance:', instancePath)
      
      // 切换到该实例
      selectedInstance.value = instancePath
      
      snackbarText.value = `${t('gameServer.connected')}: ${server.name} (${host})`
      snackbar.value = true
      
      console.log('[GameServer] Connected to server:', host, 'Version:', server.version)

      // 如果服务器有模组，自动调用安装接口（下载进度会在任务管理器中显示）
      if (server.modrinthProjects) {
        await nextTick()
        installServerMods(server, server.version)
      }

      // 跳转到主页
      router.push('/')
    }
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

/* Skeleton Card Animation */
.skeleton-card {
  animation: skeleton-fade-in 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes skeleton-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading Dots Animation */
.loading-dot {
  animation: loading-bounce 1.4s ease-in-out infinite;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Shimmer Effect for Skeleton */
.animate-pulse {
  animation: shimmer 2s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    rgba(55, 65, 81, 0.5) 0%,
    rgba(75, 85, 99, 0.8) 50%,
    rgba(55, 65, 81, 0.5) 100%
  );
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
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
