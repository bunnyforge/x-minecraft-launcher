import { GameRegion, GameServerListServiceKey } from '@xmcl/runtime-api'
import { InjectionKey, Ref } from 'vue'
import { useService } from './service'

export const kGameServerList: InjectionKey<ReturnType<typeof useGameServerList>> = Symbol('GameServerList')

export function useGameServerList() {
  const { getServerList } = useService(GameServerListServiceKey)
  const regions = ref<GameRegion[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      regions.value = await getServerList()
    } catch (e) {
      error.value = e as Error
      console.error('Failed to fetch server list:', e)
    } finally {
      loading.value = false
    }
  }

  function connectToServer(region: GameRegion, server: { name: string; nodePort: number }) {
    const host = `${region.domain}:${server.nodePort}`
    return host
  }

  return {
    regions,
    loading,
    error,
    refresh,
    connectToServer,
  }
}
