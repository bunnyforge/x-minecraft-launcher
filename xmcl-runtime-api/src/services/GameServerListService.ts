import { ServiceKey } from './Service'

export interface GameServer {
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
