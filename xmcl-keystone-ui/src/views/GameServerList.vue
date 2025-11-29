<template>
  <v-card class="game-server-list h-full flex flex-col">
    <v-card-title class="flex items-center gap-2">
      <v-icon left>
        dns
      </v-icon>
      {{ t('gameServer.title') }}
      <v-spacer />
      <v-btn
        icon
        :loading="loading"
        @click="refresh"
      >
        <v-icon>refresh</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text class="flex-1 overflow-auto">
      <!-- Installing mods overlay -->
      <v-overlay
        :value="installing"
        absolute
        class="flex items-center justify-center"
      >
        <div class="text-center">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
          />
          <p class="mt-4 text-white">
            {{ t('gameServer.installingMods') }}
          </p>
          <p
            v-if="progress.currentProject"
            class="text-grey-lighten-1"
          >
            {{ progress.current }} / {{ progress.total }} - {{ progress.currentProject }}
          </p>
        </div>
      </v-overlay>

      <v-alert
        v-if="error"
        type="error"
        dismissible
        @input="error = null"
      >
        {{ t('gameServer.error') }}: {{ error.message }}
      </v-alert>

      <v-expansion-panels
        v-if="regions.length > 0"
        accordion
        multiple
      >
        <v-expansion-panel
          v-for="region in regions"
          :key="region.id"
        >
          <v-expansion-panel-header>
            <div class="flex items-center gap-2">
              <v-icon>public</v-icon>
              <span class="text-lg font-bold">{{ region.name }}</span>
              <v-chip
                small
                outlined
              >
                {{ region.servers.length }} {{ t('gameServer.servers') }}
              </v-chip>
            </div>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-list v-if="region.servers.length > 0">
              <v-list-item
                v-for="server in region.servers"
                :key="server.nodePort"
                @click="onServerClick(region, server)"
              >
                <v-list-item-avatar>
                  <v-icon
                    :color="getServerStatusColor(server.status)"
                  >
                    {{ getServerStatusIcon(server.status) }}
                  </v-icon>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title class="font-bold">
                    {{ server.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <div class="flex gap-2 flex-wrap mt-1">
                      <v-chip
                        x-small
                        label
                      >
                        {{ server.serverType }}
                      </v-chip>
                      <v-chip
                        x-small
                        label
                      >
                        {{ server.version }}
                      </v-chip>
                      <v-chip
                        x-small
                        label
                      >
                        <v-icon
                          x-small
                          left
                        >
                          people
                        </v-icon>
                        {{ server.metrics.onlinePlayers ?? 0 }} / {{ server.metrics.maxPlayers }}
                      </v-chip>
                      <!-- Mods indicator -->
                      <v-chip
                        v-if="hasModsOrModpack(server)"
                        x-small
                        label
                        color="primary"
                      >
                        <v-icon
                          x-small
                          left
                        >
                          extension
                        </v-icon>
                        <template v-if="server.modrinthModpack">
                          {{ t('gameServer.modpack') }}
                        </template>
                        <template v-else>
                          {{ getModsCount(server) }} {{ t('gameServer.mods') }}
                        </template>
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn
                    color="primary"
                    small
                    :loading="installing"
                    @click.stop="onConnectClick(region, server)"
                  >
                    <v-icon left>
                      play_arrow
                    </v-icon>
                    {{ t('gameServer.connect') }}
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            <v-alert
              v-else
              type="info"
              text
            >
              {{ t('gameServer.noServers') }}
            </v-alert>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>

      <div
        v-else-if="!loading"
        class="text-center py-8"
      >
        <v-icon
          size="64"
          color="grey"
        >
          dns
        </v-icon>
        <p class="text-grey mt-4">
          {{ t('gameServer.empty') }}
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { kInstance } from '@/composables/instance'
import { injection } from '@/util/inject'
import { useGameServerList } from '../composables/gameServerList'
import { useGameServerModsInstaller, parseModrinthProjects } from '../composables/gameServerModsInstaller'
import { GameRegion, GameServer, InstanceServiceKey } from '@xmcl/runtime-api'
import { useService } from '@/composables/service'

const { regions, loading, error, refresh, connectToServer } = useGameServerList()
const { instance, runtime } = injection(kInstance)
const { editInstance } = useService(InstanceServiceKey)
const { t } = useI18n()
const { push } = useRouter()

// Mods installer
const { installing, progress, installServerMods, getModpackInfo } = useGameServerModsInstaller(
  computed(() => instance.value.path)
)

onMounted(() => {
  refresh()
})

function getServerStatusColor(status: string) {
  return status === 'RUNNING' ? 'success' : 'error'
}

function getServerStatusIcon(status: string) {
  return status === 'RUNNING' ? 'check_circle' : 'cancel'
}

function hasModsOrModpack(server: GameServer) {
  return !!(server.modrinthProjects || server.modrinthModpack)
}

function getModsCount(server: GameServer) {
  if (!server.modrinthProjects) return 0
  return parseModrinthProjects(server.modrinthProjects).length
}

function onServerClick(region: GameRegion, server: GameServer) {
  console.log('Server clicked:', region.name, server.name)
}

async function onConnectClick(region: GameRegion, server: GameServer) {
  console.log('[GameServer] Connect clicked, server:', server)
  console.log('[GameServer] modrinthProjects:', server.modrinthProjects)
  console.log('[GameServer] modrinthModpack:', server.modrinthModpack)
  
  const host = connectToServer(region, server)
  const [hostname, port] = host.split(':')
  
  // 更新当前实例的服务器设置
  await editInstance({
    instancePath: instance.value.path,
    server: {
      host: hostname,
      port: parseInt(port, 10),
    },
  })
  
  // 如果服务器有整合包，跳转到整合包页面
  if (server.modrinthModpack) {
    const modpackInfo = await getModpackInfo(server.modrinthModpack)
    if (modpackInfo) {
      // 跳转到 Store 页面查看整合包
      push(`/store/modrinth/${modpackInfo.project.id}`)
      return
    }
  }
  
  // 如果服务器有模组，先安装模组再跳转到 Mods 页面
  if (server.modrinthProjects) {
    console.log('[GameServer] Installing mods for server...')
    const gameVersion = runtime.value.minecraft || '1.21.1'
    console.log('[GameServer] Using gameVersion:', gameVersion, 'runtime:', runtime.value)
    const success = await installServerMods(server, gameVersion)
    console.log('[GameServer] Install result:', success)
    // 跳转到 Mods 页面
    push('/mods')
    return
  }
  
  console.log('Connected to server:', host)
}
</script>

<style scoped>
.game-server-list {
  background: transparent;
}
</style>
