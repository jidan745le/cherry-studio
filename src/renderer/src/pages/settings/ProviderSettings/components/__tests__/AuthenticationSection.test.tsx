import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuthenticationSection from '../AuthenticationSection'

const useProviderMock = vi.fn()
const useProviderMetaMock = vi.fn()
const useProviderApiKeyMock = vi.fn()
const useProviderEndpointsMock = vi.fn()
const useProviderConnectionCheckMock = vi.fn()
const showApiKeyListMock = vi.fn()
const apiKeyPropsSpy = vi.fn()
const apiHostPropsSpy = vi.fn()
const providerSpecificSettingsPropsSpy = vi.fn()
const checkApiMock = vi.fn()
const commitInputApiKeyNowMock = vi.fn()

vi.mock('@cherrystudio/ui', async (importOriginal) => {
  const actual = await importOriginal<any>()

  return {
    ...actual,
    Button: ({ children, onClick, ...props }: any) => (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    )
  }
})

vi.mock('@renderer/hooks/useProviders', () => ({
  useProvider: (...args: any[]) => useProviderMock(...args)
}))

vi.mock('@renderer/components/Popups/ApiKeyListPopup', () => ({
  ApiKeyListPopup: {
    show: (...args: any[]) => showApiKeyListMock(...args)
  }
}))

vi.mock('../../hooks/providerSetting/useProviderMeta', () => ({
  useProviderMeta: (...args: any[]) => useProviderMetaMock(...args)
}))

vi.mock('../../hooks/providerSetting/useProviderApiKey', () => ({
  useProviderApiKey: (...args: any[]) => useProviderApiKeyMock(...args)
}))

vi.mock('../../hooks/providerSetting/useProviderEndpoints', () => ({
  useProviderEndpoints: (...args: any[]) => useProviderEndpointsMock(...args)
}))

vi.mock('../../hooks/providerSetting/useProviderConnectionCheck', () => ({
  useProviderConnectionCheck: (...args: any[]) => useProviderConnectionCheckMock(...args)
}))

vi.mock('../ApiKey', () => ({
  default: (props: any) => {
    apiKeyPropsSpy(props)
    return <div>api-key</div>
  }
}))

vi.mock('../ApiHost', () => ({
  default: (props: any) => {
    apiHostPropsSpy(props)
    return <div>api-host</div>
  }
}))

vi.mock('../ProviderSpecificSettings', () => ({
  default: (props: any) => {
    providerSpecificSettingsPropsSpy(props)
    return <div>{`provider-specific-${props.placement}`}</div>
  }
}))

describe('AuthenticationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProviderMock.mockReturnValue({
      provider: { id: 'openai', isEnabled: true, name: 'openai' }
    })
    useProviderMetaMock.mockReturnValue({
      fancyProviderName: 'OpenAI',
      apiKeyWebsite: 'https://platform.openai.com/api-keys',
      isApiKeyFieldVisible: true,
      isDmxapi: false
    })
    useProviderApiKeyMock.mockReturnValue({
      inputApiKey: 'draft-key',
      setInputApiKey: vi.fn(),
      serverApiKey: 'server-key',
      commitInputApiKeyNow: commitInputApiKeyNowMock
    })
    useProviderEndpointsMock.mockReturnValue({
      primaryEndpoint: 'openai_chat_completions',
      apiHost: 'https://api.example.com',
      setApiHost: vi.fn(),
      anthropicApiHost: 'https://anthropic.example.com',
      setAnthropicApiHost: vi.fn(),
      apiVersion: '2024-01-01',
      setApiVersion: vi.fn()
    })
    useProviderConnectionCheckMock.mockReturnValue({
      apiKeyConnectivity: { status: 'not_checked', checking: false },
      checkApi: checkApiMock,
      showApiKeyError: vi.fn()
    })
  })

  it('owns the authentication section wiring locally', async () => {
    const provider = { id: 'openai', isEnabled: true, name: 'openai' }
    useProviderMock.mockReturnValue({ provider })

    render(<AuthenticationSection providerId="openai" />)

    expect(screen.getByText('api-key')).toBeInTheDocument()
    expect(screen.getByText('api-host')).toBeInTheDocument()
    expect(screen.getByText('provider-specific-beforeAuth')).toBeInTheDocument()
    expect(screen.getByText('provider-specific-afterAuth')).toBeInTheDocument()

    expect(useProviderMetaMock).toHaveBeenCalledWith('openai')
    expect(useProviderApiKeyMock).toHaveBeenCalledWith('openai')
    expect(useProviderEndpointsMock).toHaveBeenCalledWith(provider)
    expect(useProviderConnectionCheckMock).toHaveBeenCalledWith('openai', {
      inputApiKey: 'draft-key',
      apiHost: 'https://api.example.com',
      openApiKeyList: expect.any(Function)
    })

    fireEvent.click(screen.getByRole('button', { name: /检测/i }))
    expect(checkApiMock).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /API 密钥管理/i }))

    await waitFor(() => {
      expect(commitInputApiKeyNowMock).toHaveBeenCalled()
      expect(showApiKeyListMock).toHaveBeenCalledWith({
        providerId: 'openai',
        title: 'OpenAI API 密钥管理',
        providerType: 'llm'
      })
    })
  })

  it('passes section-local props through to api key and host components', () => {
    render(<AuthenticationSection providerId="openai" />)

    expect(apiKeyPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: expect.objectContaining({ id: 'openai' }),
        inputApiKey: 'draft-key',
        serverApiKey: 'server-key',
        isApiKeyFieldVisible: true
      })
    )
    expect(apiHostPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'openai',
        apiHost: 'https://api.example.com',
        anthropicApiHost: 'https://anthropic.example.com',
        apiVersion: '2024-01-01'
      })
    )
    expect(providerSpecificSettingsPropsSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ providerId: 'openai', placement: 'beforeAuth' })
    )
    expect(providerSpecificSettingsPropsSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ providerId: 'openai', placement: 'afterAuth' })
    )
  })

  it('hides the api key list button for copilot while preserving api key visibility inputs', () => {
    useProviderMock.mockReturnValue({
      provider: { id: 'copilot', isEnabled: true, name: 'copilot' }
    })
    useProviderMetaMock.mockReturnValue({
      fancyProviderName: 'GitHub Copilot',
      apiKeyWebsite: undefined,
      isApiKeyFieldVisible: false,
      isDmxapi: false
    })

    render(<AuthenticationSection providerId="copilot" />)

    expect(apiKeyPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: expect.objectContaining({ id: 'copilot' }),
        isApiKeyFieldVisible: false
      })
    )
    expect(screen.queryByRole('button', { name: /settings.provider.api.key.list.title/i })).not.toBeInTheDocument()
  })

  it('returns nothing when the provider is missing', () => {
    useProviderMock.mockReturnValue({
      provider: undefined
    })

    const { container } = render(<AuthenticationSection providerId="missing" />)

    expect(container).toBeEmptyDOMElement()
  })
})
