import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ModelList from '../ModelList'

const manageModelsShowMock = vi.fn()
const addModelShowMock = vi.fn()
const newApiAddModelShowMock = vi.fn()
const downloadModelShowMock = vi.fn()
const updateModelMock = vi.fn()
const syncProviderModelsMock = vi.fn()

const useProviderMock = vi.fn()
const useModelsMock = vi.fn()
const useProviderApiKeysMock = vi.fn()
const useModelMutationsMock = vi.fn()
const useHealthCheckMock = vi.fn()

vi.mock('@cherrystudio/ui', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@renderer/components/CollapsibleSearchBar', () => ({
  default: ({ onSearch, placeholder }: any) => (
    <input placeholder={placeholder} onChange={(event) => onSearch(event.target.value)} />
  )
}))

vi.mock('@renderer/components/Icons', () => ({
  LoadingIcon: () => <div>loading</div>,
  StreamlineGoodHealthAndWellBeing: () => <span>health-icon</span>
}))

vi.mock('@renderer/hooks/useProviders', () => ({
  useProvider: (...args: any[]) => useProviderMock(...args),
  useProviderApiKeys: (...args: any[]) => useProviderApiKeysMock(...args)
}))

vi.mock('@renderer/hooks/useModels', () => ({
  useModels: (...args: any[]) => useModelsMock(...args),
  useModelMutations: (...args: any[]) => useModelMutationsMock(...args)
}))

vi.mock('../useHealthCheck', () => ({
  useHealthCheck: (...args: any[]) => useHealthCheckMock(...args)
}))

vi.mock('../ManageModelsPopup', () => ({
  default: { show: (...args: any[]) => manageModelsShowMock(...args) }
}))

vi.mock('../AddModelPopup', () => ({
  default: { show: (...args: any[]) => addModelShowMock(...args) }
}))

vi.mock('../NewApiAddModelPopup', () => ({
  default: { show: (...args: any[]) => newApiAddModelShowMock(...args) }
}))

vi.mock('../DownloadOVMSModelPopup', () => ({
  default: { show: (...args: any[]) => downloadModelShowMock(...args) }
}))

vi.mock('../../hooks/useProviderModelSync', () => ({
  useProviderModelSync: () => ({
    syncProviderModels: (...args: any[]) => syncProviderModelsMock(...args),
    isSyncingModels: false
  })
}))

vi.mock('../ModelListGroup', () => ({
  default: ({ groupName, models }: any) => (
    <div data-testid="model-group">
      <span>{groupName}</span>
      {models.map((model: any) => (
        <span key={model.id}>{model.name}</span>
      ))}
    </div>
  )
}))

describe('ModelList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateModelMock.mockReset()
    syncProviderModelsMock.mockReset()
    syncProviderModelsMock.mockResolvedValue([])
    useProviderMock.mockImplementation((providerId: string) => ({
      provider: { id: providerId, name: providerId }
    }))
    useModelsMock.mockReturnValue({
      models: [
        { id: 'openai:model-alpha', name: 'Alpha', providerId: 'openai', group: 'chat', isEnabled: true },
        { id: 'openai:model-beta', name: 'Beta', providerId: 'openai', group: 'embedding', isEnabled: false }
      ]
    })
    useProviderApiKeysMock.mockReturnValue({
      data: { keys: [{ key: 'sk-test' }] }
    })
    useModelMutationsMock.mockReturnValue({
      deleteModel: vi.fn(),
      updateModel: updateModelMock
    })
    useHealthCheckMock.mockReturnValue({
      isChecking: false,
      modelStatuses: [],
      runHealthCheck: vi.fn()
    })
  })

  it('filters rendered model groups by search text', () => {
    render(<ModelList providerId="openai" />)

    expect(screen.getByTestId('provider-model-list')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('settings.models.check.enabled')).toBeInTheDocument()
    expect(screen.getByText('settings.models.check.disabled')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('models.search.placeholder'), {
      target: { value: 'beta' }
    })

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('opens manage, refresh and add actions for a regular provider', () => {
    render(<ModelList providerId="openai" />)

    fireEvent.click(screen.getByRole('button', { name: /manage/i }))
    expect(manageModelsShowMock).toHaveBeenCalledWith({ providerId: 'openai' })

    fireEvent.click(screen.getByRole('button', { name: /settings.models.manage.fetch_list/i }))
    expect(syncProviderModelsMock).toHaveBeenCalledWith({ id: 'openai', name: 'openai' })

    fireEvent.click(screen.getByRole('button', { name: /settings.models.add.add_model/i }))
    expect(addModelShowMock).toHaveBeenCalled()
  })

  it('uses the new-api add flow and ovms download flow when applicable', () => {
    const { rerender } = render(<ModelList providerId="new-api" />)
    fireEvent.click(screen.getByRole('button', { name: /settings.models.add.add_model/i }))
    expect(newApiAddModelShowMock).toHaveBeenCalled()

    rerender(<ModelList providerId="ovms" />)
    fireEvent.click(screen.getByRole('button', { name: /button.download/i }))
    expect(downloadModelShowMock).toHaveBeenCalled()
  })

  it('updates enabled state for visible models from toolbar actions', () => {
    render(<ModelList providerId="openai" />)

    fireEvent.click(screen.getByRole('button', { name: /settings.models.check.disabled/i }))
    expect(updateModelMock).toHaveBeenCalledTimes(1)
    expect(updateModelMock).toHaveBeenCalledWith('openai', 'model-alpha', { isEnabled: false })
  })
})
