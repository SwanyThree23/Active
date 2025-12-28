export { claudeClient } from './claude'
export { elevenLabsClient } from './elevenlabs'
export { heygenClient } from './heygen'
export { whisperflowClient } from './whisperflow'
export { llmlinguaClient } from './llmlingua'
export { descriptClient } from './descript'
export { beehiivClient } from './beehiiv'
export { productHuntClient } from './producthunt'
export { n8nClient } from './n8n'

// Integration service type
export type IntegrationService =
  | 'claude'
  | 'elevenlabs'
  | 'heygen'
  | 'whisperflow'
  | 'llmlingua'
  | 'descript'
  | 'beehiiv'
  | 'producthunt'
  | 'n8n'

// Integration status checker
export async function checkIntegrationStatus(
  service: IntegrationService
): Promise<{
  service: IntegrationService
  status: 'connected' | 'disconnected' | 'error'
  message?: string
}> {
  try {
    switch (service) {
      case 'claude':
        // Claude doesn't have a health check, so we verify API key exists
        if (!process.env.CLAUDE_API_KEY) {
          return { service, status: 'disconnected', message: 'API key not configured' }
        }
        return { service, status: 'connected' }

      case 'elevenlabs':
        if (!process.env.ELEVENLABS_API_KEY) {
          return { service, status: 'disconnected', message: 'API key not configured' }
        }
        return { service, status: 'connected' }

      case 'heygen':
        if (!process.env.HEYGEN_API_KEY) {
          return { service, status: 'disconnected', message: 'API key not configured' }
        }
        return { service, status: 'connected' }

      case 'whisperflow':
        if (!process.env.WHISPERFLOW_API_KEY) {
          return { service, status: 'disconnected', message: 'API key not configured' }
        }
        return { service, status: 'connected' }

      case 'llmlingua':
        if (!process.env.LLMLINGUA_API_KEY) {
          return { service, status: 'disconnected', message: 'API key not configured' }
        }
        return { service, status: 'connected' }

      case 'descript':
        if (!process.env.DESCRIPT_API_KEY) {
          return { service, status: 'disconnected', message: 'API key not configured' }
        }
        return { service, status: 'connected' }

      case 'beehiiv':
        if (!process.env.BEEHIIV_API_KEY || !process.env.BEEHIIV_PUBLICATION_ID) {
          return { service, status: 'disconnected', message: 'API key or publication ID not configured' }
        }
        return { service, status: 'connected' }

      case 'producthunt':
        if (!process.env.PRODUCTHUNT_API_KEY) {
          return { service, status: 'disconnected', message: 'API key not configured' }
        }
        return { service, status: 'connected' }

      case 'n8n':
        if (!process.env.N8N_WEBHOOK_URL) {
          return { service, status: 'disconnected', message: 'Webhook URL not configured' }
        }
        return { service, status: 'connected' }

      default:
        return { service, status: 'error', message: 'Unknown service' }
    }
  } catch (error) {
    return {
      service,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Check all integrations
export async function checkAllIntegrations(): Promise<
  Array<{
    service: IntegrationService
    status: 'connected' | 'disconnected' | 'error'
    message?: string
  }>
> {
  const services: IntegrationService[] = [
    'claude',
    'elevenlabs',
    'heygen',
    'whisperflow',
    'llmlingua',
    'descript',
    'beehiiv',
    'producthunt',
    'n8n',
  ]

  return Promise.all(services.map((service) => checkIntegrationStatus(service)))
}
