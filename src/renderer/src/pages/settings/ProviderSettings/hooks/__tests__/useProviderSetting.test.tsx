import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProviderSetting } from '../useProviderSetting'

const updateProviderMock = vi.fn()
const updateApiKeysMock = vi.fn().mockResolvedValue(undefined)
const moveMock = vi.fn().mockResolvedValue(undefined)
const dispatchMock = vi.fn()
const setTimeoutTimerMock = vi.fn()

let apiKeysData: { keys: Array<{ id: string; key: string; isEnabled: boolean }> } | undefined

vi.mock('@data/hooks/useReorder', () => ({
  useReorder: () => ({
    move: moveMock
  })
}))

vi.mock('@renderer/config/providers', () => ({
  PROVIDER_URLS: {}
}))

vi.mock('@renderer/context/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light'
  })
}))

vi.mock('@renderer/hooks/useModels', () => ({
  useModels: () => ({
    models: []
  })
}))

vi.mock('../useProviderModelSync', () => ({
  useProviderModelSync: () => ({
    syncProviderModels: vi.fn().mockResolvedValue([]),
    isSyncingModels: false
  })
}))

vi.mock('@renderer/hooks/useProviders', () => ({
  useProvider: () => ({
    provider: {
      id: 'openai',
      isEnabled: true,
      endpointConfigs: {},
      settings: {},
      apiKeys: []
    },
    isLoading: false
  }),
  useProviderApiKeys: () => ({
    data: apiKeysData
  }),
  useProviderMutations: () => ({
    updateProvider: updateProviderMock,
    updateApiKeys: updateApiKeysMock
  })
}))

vi.mock('@renderer/hooks/useTimer', () => ({
  useTimer: () => ({
    setTimeoutTimer: setTimeoutTimerMock
  })
}))

vi.mock('@renderer/pages/settings/ProviderSettings/SelectProviderModelPopup', () => ({
  default: {
    show: vi.fn()
  }
}))

vi.mock('@renderer/store', () => ({
  useAppDispatch: () => dispatchMock
}))

vi.mock('@renderer/utils/provider.v2', () => ({
  getFancyProviderName: () => 'OpenAI',
  isAnthropicProvider: () => false,
  isAnthropicSupportedProvider: () => false,
  isAzureOpenAIProvider: () => false,
  isCherryAIProvider: () => false,
  isGeminiProvider: () => false,
  isNewApiProvider: () => false,
  isOllamaProvider: () => false,
  isOpenAICompatibleProvider: () => true,
  isOpenAIResponsesProvider: () => false,
  isPerplexityProvider: () => false,
  isSystemProvider: () => false,
  isVertexProvider: () => false
}))

vi.mock('../adapters/providerCheckApiAdapter', () => ({
  providerCheckApiAdapter: vi.fn()
}))

vi.mock('../adapters/providerSettingsSideEffects', () => ({
  applyProviderApiKeySideEffects: vi.fn()
}))

describe('useProviderSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    apiKeysData = {
      keys: []
    }
  })

  it('keeps the local api key draft when slower server echoes older values', () => {
    const { result, rerender } = renderHook(() => useProviderSetting('openai'))

    expect(result.current.drafts.localApiKey).toBe('')

    act(() => {
      result.current.drafts.setLocalApiKey('sk-latest')
    })

    expect(result.current.drafts.localApiKey).toBe('sk-latest')

    apiKeysData = {
      keys: [{ id: 'k1', key: 'sk-partial', isEnabled: true }]
    }
    rerender()

    expect(result.current.drafts.localApiKey).toBe('sk-latest')

    apiKeysData = {
      keys: [{ id: 'k1', key: 'sk-latest', isEnabled: true }]
    }
    rerender()

    expect(result.current.drafts.localApiKey).toBe('sk-latest')

    apiKeysData = {
      keys: [{ id: 'k1', key: 'sk-remote-change', isEnabled: true }]
    }
    rerender()

    expect(result.current.drafts.localApiKey).toBe('sk-remote-change')
  })
})
