import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ModelList from '../ModelList'

const manageModelsShowMock = vi.fn()
const addModelShowMock = vi.fn()
const newApiAddModelShowMock = vi.fn()
const downloadModelShowMock = vi.fn()
const updateModelMock = vi.fn()
const syncProviderModelsMock = vi.fn()

const useProviderApiKeysMock = vi.fn()
const useProviderPresetMetadataMock = vi.fn()
const useModelMutationsMock = vi.fn()
const useHealthCheckMock = vi.fn()

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key
    })
  }
})

vi.mock('@cherrystudio/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cherrystudio/ui')>()

  return {
    ...actual,
    Badge: ({ children }: any) => <span>{children}</span>,
    Button: ({ children, onClick, ...props }: any) => (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Tooltip: ({ children }: any) => <div>{children}</div>
  }
})

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
  useProviderApiKeys: (...args: any[]) => useProviderApiKeysMock(...args),
  useProviderPresetMetadata: (...args: any[]) => useProviderPresetMetadataMock(...args)
}))

vi.mock('@renderer/hooks/useModels', () => ({
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
    ;(window as any).api.getAppInfo = vi.fn().mockResolvedValue({})
    updateModelMock.mockReset()
    syncProviderModelsMock.mockReset()
    syncProviderModelsMock.mockResolvedValue([])
    useProviderApiKeysMock.mockReturnValue({
      data: { keys: [{ key: 'sk-test' }] }
    })
    useProviderPresetMetadataMock.mockReturnValue({
      data: {}
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
    render(
      <ModelList
        providerId="openai"
        provider={{ id: 'openai', name: 'openai' } as any}
        models={[
          { id: 'openai::model-alpha', name: 'Alpha', providerId: 'openai', group: 'chat', isEnabled: true } as any,
          {
            id: 'openai::model-beta',
            name: 'Beta',
            providerId: 'openai',
            group: 'embedding',
            isEnabled: false
          } as any
        ]}
      />
    )

    expect(screen.getByTestId('provider-model-list')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getAllByText('settings.models.check.enabled')).not.toHaveLength(0)
    expect(screen.getAllByText('settings.models.check.disabled')).not.toHaveLength(0)

    fireEvent.change(screen.getByPlaceholderText('models.search.placeholder'), {
      target: { value: 'beta' }
    })

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('opens manage, refresh and add actions for a regular provider', () => {
    render(
      <ModelList
        providerId="openai"
        provider={{ id: 'openai', name: 'openai' } as any}
        models={[
          { id: 'openai::model-alpha', name: 'Alpha', providerId: 'openai', group: 'chat', isEnabled: true } as any
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /^manage$/i }))
    expect(manageModelsShowMock).toHaveBeenCalledWith({ providerId: 'openai' })

    fireEvent.click(screen.getByRole('button', { name: /^settings\.models\.manage\.fetch_list$/i }))
    expect(syncProviderModelsMock).toHaveBeenCalledWith({ id: 'openai', name: 'openai' })

    fireEvent.click(screen.getByRole('button', { name: /^settings\.models\.add\.add_model$/i }))
    expect(addModelShowMock).toHaveBeenCalled()
  })

  it('uses the new-api add flow and ovms download flow when applicable', () => {
    const { rerender } = render(
      <ModelList
        providerId="new-api"
        provider={{ id: 'new-api', name: 'new-api' } as any}
        models={[
          { id: 'new-api::model-alpha', name: 'Alpha', providerId: 'new-api', group: 'chat', isEnabled: true } as any
        ]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /^settings\.models\.add\.add_model$/i }))
    expect(newApiAddModelShowMock).toHaveBeenCalled()

    rerender(
      <ModelList
        providerId="ovms"
        provider={{ id: 'ovms', name: 'ovms' } as any}
        models={[{ id: 'ovms::model-alpha', name: 'Alpha', providerId: 'ovms', group: 'chat', isEnabled: true } as any]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /^button\.download$/i }))
    expect(downloadModelShowMock).toHaveBeenCalled()
  })

  it('updates enabled state for visible models from toolbar actions', async () => {
    render(
      <ModelList
        providerId="openai"
        provider={{ id: 'openai', name: 'openai' } as any}
        models={[
          { id: 'openai::model-alpha', name: 'Alpha', providerId: 'openai', group: 'chat', isEnabled: true } as any,
          {
            id: 'openai::model-beta',
            name: 'Beta',
            providerId: 'openai',
            group: 'embedding',
            isEnabled: false
          } as any
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /^settings\.models\.check\.enabled$/i }))
    await waitFor(() => {
      expect(updateModelMock).toHaveBeenCalledTimes(1)
    })
    expect(updateModelMock).toHaveBeenCalledWith('openai', 'model-beta', { isEnabled: true })
  })
})
