import { ServiceKey } from './Service'

export interface GameServer {
  id: number
  name: string
  nodePort: number
  status: string
  serverType: string
  maxPlayers: number
  onlineMode: boolean
  version: string
  difficulty: string
  pvp: boolean
  viewDistance: number
  /**
   * Modrinth projects to install, format: "slug:version_number" or "slug" (for latest)
   * Multiple projects separated by comma, e.g. "sodium:mc1.21.1-0.6.0-fabric,lithium"
   */
  modrinthProjects: string | null
  /**
   * Modrinth modpack project id or slug to install
   */
  modrinthModpack: string | null
  metrics: {
    cpuUsagePercent: number
    memoryUsagePercent: number
    onlinePlayers: number
    maxPlayers: number
  }
}

export interface GameRegion {
  id: number
  name: string
  domain: string
  servers: GameServer[]
}

export interface GameServerListService {
  /**
   * 获取游戏服务器列表
   */
  getServerList(): Promise<GameRegion[]>
}

export const GameServerListServiceKey: ServiceKey<GameServerListService> = 'GameServerListService'
