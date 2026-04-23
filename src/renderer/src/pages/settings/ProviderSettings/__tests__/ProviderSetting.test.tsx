import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProviderSetting from '../ProviderSetting'

const useProviderSettingMock = vi.fn()
const showApiOptionsMock = vi.fn()
const showCustomHeaderMock = vi.fn()
const toggleProviderEnabledMock = vi.fn()

vi.mock('@cherrystudio/ui', () => ({
  Divider: (props: any) => <div data-testid="divider" {...props} />,
  Button: ({ children, onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Flex: ({ children }: any) => <div>{children}</div>,
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      data-testid="provider-enabled-switch"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Tooltip: ({ children }: any) => <div>{children}</div>
}))

vi.mock('../hooks/useProviderSetting', () => ({
  useProviderSetting: (...args: any[]) => useProviderSettingMock(...args)
}))

vi.mock('../ApiOptionsSettings/ApiOptionsSettingsPopup', () => ({
  default: { show: (...args: any[]) => showApiOptionsMock(...args) }
}))

vi.mock('../CustomHeaderPopup', () => ({
  default: { show: (...args: any[]) => showCustomHeaderMock(...args) }
}))

vi.mock('../components/ProviderHeader', () => ({
  default: ({ name, onOpenApiOptions, enabled, onEnabledChange }: any) => (
    <div>
      <span>{name}</span>
      <button type="button" onClick={onOpenApiOptions}>
        open-api-options
      </button>
      <input
        type="checkbox"
        data-testid="provider-enabled-switch"
        checked={enabled}
        onChange={(event) => onEnabledChange?.(event.target.checked)}
      />
    </div>
  )
}))

vi.mock('../components/AuthenticationSection', () => ({
  default: () => <div>authentication-section</div>
}))

vi.mock('../components/ProviderSpecificSettings', () => ({
  default: ({ placement }: any) => <div>{`provider-specific-${placement}`}</div>
}))

vi.mock('../components/ConnectionSection', () => ({
  default: ({ onOpenCustomHeaders }: any) => (
    <button type="button" onClick={onOpenCustomHeaders}>
      open-custom-headers
    </button>
  )
}))

vi.mock('../ModelList', () => ({
  ModelList: ({ providerId }: any) => <div>{`model-list-${providerId}`}</div>
}))

describe('ProviderSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProviderSettingMock.mockReturnValue({
      provider: { id: 'openai', isEnabled: true },
      theme: 'light',
      computed: {
        fancyProviderName: 'OpenAI',
        officialWebsite: undefined,
        showApiOptionsButton: true
      },
      actions: {
        toggleProviderEnabled: toggleProviderEnabledMock
      }
    })
  })

  it('renders main sections and triggers page-level actions', () => {
    render(<ProviderSetting providerId="openai" />)

    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByTestId('provider-detail-shell')).toBeInTheDocument()
    expect(screen.getByTestId('provider-endpoint-tabs')).toBeInTheDocument()
    expect(screen.getByText('authentication-section')).toBeInTheDocument()
    expect(screen.getByText('provider-specific-before')).toBeInTheDocument()
    expect(screen.getByText('provider-specific-after')).toBeInTheDocument()
    expect(screen.getByText('model-list-openai')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'open-api-options' }))
    expect(showApiOptionsMock).toHaveBeenCalledWith({ providerId: 'openai' })

    fireEvent.change(screen.getByTestId('provider-enabled-switch'), { target: { checked: false } })
    expect(toggleProviderEnabledMock).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: /common.settings/i }))
    expect(showCustomHeaderMock).toHaveBeenCalledWith({ providerId: 'openai' })

    fireEvent.click(screen.getByRole('button', { name: 'open-custom-headers' }))
    expect(showCustomHeaderMock).toHaveBeenCalledWith({ providerId: 'openai' })
  })

  it('renders nothing when the provider is missing', () => {
    useProviderSettingMock.mockReturnValue({
      provider: undefined
    })

    const { container } = render(<ProviderSetting providerId="missing" />)
    expect(container).toBeEmptyDOMElement()
  })
})
