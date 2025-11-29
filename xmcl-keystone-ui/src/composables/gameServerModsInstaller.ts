import { clientModrinthV2 } from '@/util/clients'
import { GameServer, InstanceInstallServiceKey, InstanceModsServiceKey, InstanceServiceKey, MarketType, ModpackServiceKey, VersionServiceKey, waitModpackFiles } from '@xmcl/runtime-api'
import { Ref } from 'vue'
import { useService } from './service'
import { kInstances } from './instances'
import { kInstanceVersionInstall } from './instanceVersionInstall'
import { kJavaContext } from './java'
import { injection } from '@/util/inject'
import { InstanceData } from '@xmcl/instance'

export interface ModrinthProjectRef {
  slug: string
  versionNumber?: string
}

/**
 * Parse modrinth projects string to array of project references
 * Format: "slug:version_number" or "slug" (for latest)
 * Multiple projects separated by comma
 * @example "sodium:mc1.21.1-0.6.0-fabric,lithium,iris:1.8.0"
 */
export function parseModrinthProjects(projectsStr: string | null): ModrinthProjectRef[] {
  if (!projectsStr) return []
  
  return projectsStr.split(',').map(p => p.trim()).filter(Boolean).map(p => {
    const [slug, versionNumber] = p.split(':')
    return { slug, versionNumber }
  })
}

/**
 * Parse modrinth modpack URL to extract project slug and version
 * Supports formats:
 * - https://modrinth.com/modpack/fabulously-optimized/version/11.1.0-beta.9
 * - https://modrinth.com/modpack/fabulously-optimized
 * - fabulously-optimized (slug only)
 * - fabulously-optimized:11.1.0-beta.9 (slug:version format)
 */
export function parseModrinthModpackUrl(url: string | null): { slug: string; versionNumber?: string } | null {
  if (!url) return null
  
  // Try to parse as URL
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'modrinth.com') {
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      // Expected: ['modpack', 'slug'] or ['modpack', 'slug', 'version', 'version-number']
      if (pathParts[0] === 'modpack' && pathParts[1]) {
        const slug = pathParts[1]
        const versionNumber = pathParts[2] === 'version' ? pathParts[3] : undefined
        return { slug, versionNumber }
      }
    }
  } catch {
    // Not a URL, try other formats
  }
  
  // Try slug:version format
  if (url.includes(':')) {
    const [slug, versionNumber] = url.split(':')
    return { slug, versionNumber }
  }
  
  // Assume it's just a slug
  return { slug: url }
}

export function useGameServerModsInstaller(instancePath: Ref<string>) {
  const { installFromMarket } = useService(InstanceModsServiceKey)
  const { openModpack, installModapckFromMarket } = useService(ModpackServiceKey)
  const { installInstanceFiles } = useService(InstanceInstallServiceKey)
  const { resolveLocalVersion } = useService(VersionServiceKey)
  const { createInstance, editInstance } = useService(InstanceServiceKey)
  const { selectedInstance } = injection(kInstances)
  const { getInstanceLock, getInstallInstruction, handleInstallInstruction } = injection(kInstanceVersionInstall)
  const { all: allJava } = injection(kJavaContext)
  const { currentRoute, push } = useRouter()
  
  const installing = ref(false)
  const error = ref<Error | null>(null)
  const progress = ref<{ current: number; total: number; currentProject: string }>({ current: 0, total: 0, currentProject: '' })

  /**
   * Resolve modrinth project slug to version id
   */
  async function resolveModrinthVersion(slug: string, versionNumber?: string, gameVersion?: string, loader?: string): Promise<string | null> {
    try {
      // Get project versions
      const versions = await clientModrinthV2.getProjectVersions(slug, {
        loaders: loader ? [loader.toLowerCase()] : undefined,
        gameVersions: gameVersion ? [gameVersion] : undefined,
      })
      
      if (versions.length === 0) {
        console.warn(`No versions found for project ${slug}`)
        return null
      }
      
      if (versionNumber) {
        // Find specific version by version_number
        const version = versions.find(v => v.version_number === versionNumber)
        if (version) {
          return version.id
        }
        console.warn(`Version ${versionNumber} not found for project ${slug}, using latest`)
      }
      
      // Return the first (latest) version
      return versions[0].id
    } catch (e) {
      console.error(`Failed to resolve version for project ${slug}:`, e)
      return null
    }
  }

  /**
   * Install mods from modrinth projects string
   */
  async function installModrinthMods(
    projectsStr: string | null,
    gameVersion: string,
    loader: string
  ): Promise<boolean> {
    const projects = parseModrinthProjects(projectsStr)
    console.log('[GameServerMods] Parsed projects:', projects, 'gameVersion:', gameVersion, 'loader:', loader)
    if (projects.length === 0) return true
    
    installing.value = true
    error.value = null
    progress.value = { current: 0, total: projects.length, currentProject: '' }
    
    try {
      const versionsToInstall: { versionId: string; icon?: string }[] = []
      
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i]
        progress.value = { current: i, total: projects.length, currentProject: project.slug }
        console.log('[GameServerMods] Resolving project:', project.slug, 'version:', project.versionNumber)
        
        const versionId = await resolveModrinthVersion(
          project.slug,
          project.versionNumber,
          gameVersion,
          loader
        )
        
        console.log('[GameServerMods] Resolved versionId:', versionId)
        
        if (versionId) {
          // Try to get project icon
          try {
            const projectInfo = await clientModrinthV2.getProject(project.slug)
            versionsToInstall.push({ versionId, icon: projectInfo.icon_url })
          } catch {
            versionsToInstall.push({ versionId })
          }
        }
      }
      
      console.log('[GameServerMods] Installing versions:', versionsToInstall, 'to path:', instancePath.value)
      
      if (versionsToInstall.length > 0) {
        await installFromMarket({
          market: MarketType.Modrinth,
          version: versionsToInstall,
          instancePath: instancePath.value,
        })
        console.log('[GameServerMods] Installation completed')
      }
      
      progress.value = { current: projects.length, total: projects.length, currentProject: '' }
      return true
    } catch (e) {
      error.value = e as Error
      console.error('[GameServerMods] Failed to install modrinth mods:', e)
      return false
    } finally {
      installing.value = false
    }
  }

  /**
   * Install modpack from modrinth
   * Note: Modpack installation typically creates a new instance, 
   * so this returns the modpack info for the caller to handle
   */
  async function getModpackInfo(modpackSlug: string | null) {
    if (!modpackSlug) return null
    
    try {
      const project = await clientModrinthV2.getProject(modpackSlug)
      if (project.project_type !== 'modpack') {
        console.warn(`Project ${modpackSlug} is not a modpack`)
        return null
      }
      
      const versions = await clientModrinthV2.getProjectVersions(modpackSlug, { featured: true })
      if (versions.length === 0) {
        console.warn(`No versions found for modpack ${modpackSlug}`)
        return null
      }
      
      return {
        project,
        latestVersion: versions[0],
      }
    } catch (e) {
      console.error(`Failed to get modpack info for ${modpackSlug}:`, e)
      return null
    }
  }

  /**
   * Install modpack from modrinth URL and return the created instance path
   * @param modpackUrl The modrinth modpack URL or slug
   * @param instanceName The name for the instance (used as folder name)
   * @param serverName Display name for the server
   * @param serverHost Optional server host to set for the instance
   * @param serverPort Optional server port to set for the instance
   * @returns The created instance path, or null if failed
   */
  async function installServerModpack(
    modpackUrl: string | null,
    instanceName: string,
    serverName: string,
    serverHost?: string,
    serverPort?: number
  ): Promise<string | null> {
    const parsed = parseModrinthModpackUrl(modpackUrl)
    if (!parsed) {
      console.warn('[GameServerModpack] Invalid modpack URL:', modpackUrl)
      return null
    }

    console.log('[GameServerModpack] Installing modpack:', parsed.slug, 'version:', parsed.versionNumber, 'instanceName:', instanceName)

    try {
      // Get project info
      const project = await clientModrinthV2.getProject(parsed.slug)
      if (project.project_type !== 'modpack') {
        console.warn(`[GameServerModpack] Project ${parsed.slug} is not a modpack`)
        return null
      }

      // Get versions
      const versions = await clientModrinthV2.getProjectVersions(parsed.slug)
      if (versions.length === 0) {
        console.warn(`[GameServerModpack] No versions found for modpack ${parsed.slug}`)
        return null
      }

      // Find the specific version or use latest
      let targetVersion = versions[0]
      if (parsed.versionNumber) {
        const found = versions.find(v => v.version_number === parsed.versionNumber)
        if (found) {
          targetVersion = found
        } else {
          console.warn(`[GameServerModpack] Version ${parsed.versionNumber} not found, using latest`)
        }
      }

      console.log('[GameServerModpack] Target version:', targetVersion.id, targetVersion.version_number)

      // Download modpack file from market
      const [modpackFile] = await installModapckFromMarket({
        market: MarketType.Modrinth,
        version: { versionId: targetVersion.id, icon: project.icon_url },
      })

      // Open modpack to get config and files
      const modpackState = await openModpack(modpackFile)
      const files = await waitModpackFiles(modpackState)
      const config = modpackState.config

      // Build upstream info
      const upstream: InstanceData['upstream'] = {
        type: 'modrinth-modpack',
        projectId: project.id,
        versionId: targetVersion.id,
      }

      // Check if files have shaderpacks or resourcepacks
      const hasShaderpacks = files.some(f => f.path.startsWith('shaderpacks/'))
      const hasResourcepacks = files.some(f => f.path.startsWith('resourcepacks/'))

      // Create instance with our custom name (folder name = instanceName)
      const instancePath = await createInstance({
        name: instanceName,  // This will be used as folder name
        runtime: config.runtime,
        icon: project.icon_url,
        upstream,
        server: serverHost && serverPort ? { host: serverHost, port: serverPort } : undefined,
        shaderpacks: hasShaderpacks,
        resourcepacks: hasResourcepacks,
      })

      console.log('[GameServerModpack] Created instance:', instancePath)

      // 目录名和实例名称都是 instanceName，无需再更新

      // Install modpack files to the instance
      installInstanceFiles({
        path: instancePath,
        files,
        upstream,
      }).catch((e) => {
        console.error('[GameServerModpack] Failed to install instance files:', e)
      })

      // Select the new instance
      selectedInstance.value = instancePath

      // Navigate to home page
      if (currentRoute.path !== '/') {
        push('/')
      }

      // Install version dependencies (like modpackInstaller does)
      const lock = getInstanceLock(instancePath)
      lock.runExclusive(async () => {
        const resolved = config.version ? await resolveLocalVersion(config.version) : undefined
        const instruction = await getInstallInstruction(instancePath, config.runtime, '', resolved, allJava.value)
        await handleInstallInstruction(instruction)
      })

      return instancePath
    } catch (e) {
      console.error('[GameServerModpack] Failed to install modpack:', e)
      error.value = e as Error
      return null
    }
  }

  /**
   * Install mods for a game server
   */
  async function installServerMods(server: GameServer, gameVersion: string): Promise<boolean> {
    // Determine loader from serverType
    const loader = server.serverType?.toLowerCase() || 'fabric'
    
    // Parse version from server.version if it's like "latest" or specific version
    const version = server.version === 'latest' ? gameVersion : server.version
    
    return installModrinthMods(server.modrinthProjects, version, loader)
  }

  return {
    installing,
    error,
    progress,
    installModrinthMods,
    installServerMods,
    installServerModpack,
    getModpackInfo,
    resolveModrinthVersion,
  }
}
