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
                        {{ server.metrics.onlinePlayers }} / {{ server.metrics.maxPlayers }}
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn
                    color="primary"
                    small
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
import { GameRegion, InstanceServiceKey } from '@xmcl/runtime-api'
import { useService } from '@/composables/service'

const { regions, loading, error, refresh, connectToServer } = useGameServerList()
const { instance } = injection(kInstance)
const { editInstance } = useService(InstanceServiceKey)
const { t } = useI18n()

onMounted(() => {
  refresh()
})

function getServerStatusColor(status: string) {
  return status === 'RUNNING' ? 'success' : 'error'
}

function getServerStatusIcon(status: string) {
  return status === 'RUNNING' ? 'check_circle' : 'cancel'
}

function onServerClick(region: GameRegion, server: any) {
  console.log('Server clicked:', region.name, server.name)
}

async function onConnectClick(region: GameRegion, server: any) {
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
  
  // 可以在这里添加通知
  console.log('Connected to server:', host)
}
</script>

<style scoped>
.game-server-list {
  background: transparent;
}
</style>
