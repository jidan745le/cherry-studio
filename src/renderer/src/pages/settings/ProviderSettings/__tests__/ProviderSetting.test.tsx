import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProviderSetting from '../ProviderSetting'

const useProviderMock = vi.fn()
const useModelsMock = vi.fn()
const useProviderEnableMock = vi.fn()
const useProviderAutoModelSyncMock = vi.fn()
const useProviderOnboardingAutoEnableMock = vi.fn()
const useProviderLegacyWebSearchSyncMock = vi.fn()
const toggleProviderEnabledMock = vi.fn()

vi.mock('@renderer/context/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light'
  })
}))

vi.mock('@renderer/hooks/useModels', () => ({
  useModels: (...args: any[]) => useModelsMock(...args)
}))

vi.mock('@renderer/hooks/useProviders', () => ({
  useProvider: (...args: any[]) => useProviderMock(...args)
}))

vi.mock('../hooks/providerSetting/useProviderEnable', () => ({
  useProviderEnable: (...args: any[]) => useProviderEnableMock(...args)
}))

vi.mock('../hooks/providerSetting/useProviderAutoModelSync', () => ({
  useProviderAutoModelSync: (...args: any[]) => useProviderAutoModelSyncMock(...args)
}))

vi.mock('../hooks/providerSetting/useProviderOnboardingAutoEnable', () => ({
  useProviderOnboardingAutoEnable: (...args: any[]) => useProviderOnboardingAutoEnableMock(...args)
}))

vi.mock('../hooks/providerSetting/useProviderLegacyWebSearchSync', () => ({
  useProviderLegacyWebSearchSync: (...args: any[]) => useProviderLegacyWebSearchSyncMock(...args)
}))

vi.mock('../components/ProviderHeader', () => ({
  default: ({ provider, onEnabledChange }: any) => (
    <div>
      <span>{provider.id}</span>
      <input
        type="checkbox"
        data-testid="provider-enabled-switch"
        checked={provider.isEnabled}
        onChange={(event) => onEnabledChange?.(event.target.checked)}
      />
    </div>
  )
}))

vi.mock('../components/AuthenticationSection', () => ({
  default: ({ providerId }: any) => <div>{`authentication-section-${providerId}`}</div>
}))

vi.mock('../ModelList', () => ({
  ModelList: ({ providerId }: any) => <div>{`model-list-${providerId}`}</div>
}))

describe('ProviderSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProviderMock.mockReturnValue({
      provider: { id: 'openai', isEnabled: true, name: 'openai' }
    })
    useModelsMock.mockReturnValue({
      models: []
    })
    useProviderEnableMock.mockReturnValue({
      toggleProviderEnabled: toggleProviderEnabledMock
    })
  })

  it('renders header, authentication section, and model list', async () => {
    render(<ProviderSetting providerId="openai" />)

    expect(screen.getByTestId('provider-detail-shell')).toBeInTheDocument()
    expect(screen.getByText('openai')).toBeInTheDocument()
    expect(screen.getByText('authentication-section-openai')).toBeInTheDocument()
    expect(screen.getByText('model-list-openai')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('provider-enabled-switch'))

    await waitFor(() => {
      expect(toggleProviderEnabledMock).toHaveBeenCalledWith(false)
    })
  })

  it('keeps page-level coordination hooks at the page boundary', () => {
    render(<ProviderSetting providerId="openai" isOnboarding />)

    expect(useProviderAutoModelSyncMock).toHaveBeenCalledWith('openai')
    expect(useProviderOnboardingAutoEnableMock).toHaveBeenCalledWith({
      providerId: 'openai',
      isOnboarding: true
    })
    expect(useProviderLegacyWebSearchSyncMock).toHaveBeenCalledWith('openai')
  })

  it('passes only providerId into useProviderEnable', () => {
    render(<ProviderSetting providerId="openai" />)

    expect(useProviderEnableMock).toHaveBeenCalledWith('openai')
  })

  it('renders nothing when the provider is missing', () => {
    useProviderMock.mockReturnValue({
      provider: undefined
    })

    const { container } = render(<ProviderSetting providerId="missing" />)

    expect(container).toBeEmptyDOMElement()
  })
})
