import { ENDPOINT_TYPE } from '@shared/data/types/model'
import { describe, expect, it } from 'vitest'

import { getProviderHostTopology } from '../providerTopology'

describe('getProviderHostTopology', () => {
  it('uses defaultChatEndpoint when present', () => {
    const topology = getProviderHostTopology({
      id: 'openai',
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_RESPONSES,
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://api.example.com/chat' },
        [ENDPOINT_TYPE.OPENAI_RESPONSES]: { baseUrl: 'https://api.example.com/responses' }
      }
    } as any)

    expect(topology.primaryEndpoint).toBe(ENDPOINT_TYPE.OPENAI_RESPONSES)
    expect(topology.primaryBaseUrl).toBe('https://api.example.com/responses')
  })

  it('falls back using the fixed endpoint priority when defaultChatEndpoint is missing', () => {
    const topology = getProviderHostTopology({
      id: 'ollama',
      endpointConfigs: {
        [ENDPOINT_TYPE.OLLAMA_CHAT]: { baseUrl: 'http://localhost:11434' },
        [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: 'https://anthropic.example.com' }
      }
    } as any)

    expect(topology.primaryEndpoint).toBe(ENDPOINT_TYPE.ANTHROPIC_MESSAGES)
    expect(topology.primaryBaseUrl).toBe('https://anthropic.example.com')
  })

  it('treats an anthropic endpoint key with an empty host as existing capability', () => {
    const topology = getProviderHostTopology({
      id: 'custom',
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://api.example.com' },
        [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: '' }
      }
    } as any)

    expect(topology.hasAnthropicEndpoint).toBe(true)
    expect(topology.anthropicBaseUrl).toBe('')
  })
})
