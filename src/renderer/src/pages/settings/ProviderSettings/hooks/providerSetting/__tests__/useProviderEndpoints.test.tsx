import { ENDPOINT_TYPE } from '@shared/data/types/model'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useProviderEndpoints } from '../useProviderEndpoints'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

describe('useProviderEndpoints', () => {
  it('keeps the openai endpoint as primary and still exposes the anthropic host draft', () => {
    const { result } = renderHook(() =>
      useProviderEndpoints({
        id: 'custom',
        endpointConfigs: {
          [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://api.example.com' },
          [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: 'https://anthropic.example.com' }
        }
      } as any)
    )

    expect(result.current.primaryEndpoint).toBe(ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS)
    expect(result.current.providerApiHost).toBe('https://api.example.com')
    expect(result.current.providerAnthropicHost).toBe('https://anthropic.example.com')
  })

  it('uses the anthropic endpoint as primary when the provider default endpoint is anthropic', () => {
    const { result } = renderHook(() =>
      useProviderEndpoints({
        id: 'anthropic',
        defaultChatEndpoint: ENDPOINT_TYPE.ANTHROPIC_MESSAGES,
        endpointConfigs: {
          [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: 'https://api.anthropic.com' }
        }
      } as any)
    )

    expect(result.current.primaryEndpoint).toBe(ENDPOINT_TYPE.ANTHROPIC_MESSAGES)
    expect(result.current.providerAnthropicHost).toBe('https://api.anthropic.com')
  })

  it('falls back to the first supported runtime chat endpoint when defaultChatEndpoint is missing', () => {
    const { result } = renderHook(() =>
      useProviderEndpoints({
        id: 'ollama',
        endpointConfigs: {
          [ENDPOINT_TYPE.OLLAMA_CHAT]: { baseUrl: 'http://localhost:11434' }
        }
      } as any)
    )

    expect(result.current.primaryEndpoint).toBe(ENDPOINT_TYPE.OLLAMA_CHAT)
    expect(result.current.providerApiHost).toBe('http://localhost:11434')
  })

  it('keeps the anthropic host draft even for cherryin', () => {
    const { result } = renderHook(() =>
      useProviderEndpoints({
        id: 'cherryin',
        endpointConfigs: {
          [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://api.example.com' },
          [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: 'https://anthropic.example.com' }
        }
      } as any)
    )

    expect(result.current.providerAnthropicHost).toBe('https://anthropic.example.com')
  })
})
