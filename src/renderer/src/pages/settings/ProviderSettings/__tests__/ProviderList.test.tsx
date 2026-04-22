import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProviderList from '../ProviderList'

const reorderSpy = vi.fn()

vi.mock('@cherrystudio/ui', () => {
  return {
    Badge: ({ children }: any) => <span>{children}</span>,
    Button: ({ children, onClick, ...props }: any) => (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    InputGroup: ({ children }: any) => <div>{children}</div>,
    InputGroupAddon: ({ children }: any) => <div>{children}</div>,
    InputGroupButton: ({ children, onClick, ...props }: any) => (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    InputGroupInput: ({ ...props }: any) => <input {...props} />,
    MenuList: ({ children }: any) => <div>{children}</div>,
    MenuItem: ({ label, onClick, children, ...props }: any) => (
      <button type="button" onClick={onClick} {...props}>
        {label}
        {children}
      </button>
    ),
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverAnchor: ({ children }: any) => <>{children}</>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    ReorderableList: ({ visibleItems, renderItem, onReorder }: any) => (
      <div>
        {visibleItems.map((item: any, index: number) => (
          <div key={item.id}>{renderItem(item, index, { dragging: false })}</div>
        ))}
        <button type="button" onClick={() => onReorder([...visibleItems].reverse())}>
          trigger-reorder
        </button>
      </div>
    )
  }
})

vi.mock('../components/ProviderListItem', () => ({
  default: ({ provider, selected, onClick }: any) => (
    <button
      type="button"
      data-testid={`provider-list-item-${provider.id}`}
      data-selected={selected ? 'true' : 'false'}
      onClick={onClick}>
      {provider.name}
    </button>
  )
}))

vi.mock('../ModelNotesPopup', () => ({
  default: { show: vi.fn() }
}))

describe('ProviderList', () => {
  const providers = [
    { id: 'openai', name: 'OpenAI', isEnabled: true },
    { id: 'anthropic', name: 'Anthropic', isEnabled: false }
  ] as any

  beforeEach(() => {
    vi.clearAllMocks()
    reorderSpy.mockClear()
  })

  it('filters providers by search text and forwards selection', () => {
    const onSelectProvider = vi.fn()

    render(
      <ProviderList
        providers={providers}
        selectedProviderId="openai"
        providerLogos={{}}
        isOvmsSupported
        agentFilterEnabled={false}
        onAgentFilterEnabledChange={vi.fn()}
        onSelectProvider={onSelectProvider}
        onAddProvider={vi.fn()}
        onEditProvider={vi.fn()}
        onDeleteProvider={vi.fn()}
        onReorder={reorderSpy}
      />
    )

    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByTestId('provider-list-item-openai')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('provider-list-item-anthropic')).toHaveAttribute('data-selected', 'false')

    fireEvent.change(screen.getByPlaceholderText('settings.provider.search'), {
      target: { value: 'anth' }
    })

    expect(screen.queryByText('OpenAI')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Anthropic'))
    expect(onSelectProvider).toHaveBeenCalledWith('anthropic')
  })

  it('triggers add and reorder actions', () => {
    const onAddProvider = vi.fn()

    render(
      <ProviderList
        providers={providers}
        selectedProviderId="openai"
        providerLogos={{}}
        isOvmsSupported
        agentFilterEnabled={false}
        onAgentFilterEnabledChange={vi.fn()}
        onSelectProvider={vi.fn()}
        onAddProvider={onAddProvider}
        onEditProvider={vi.fn()}
        onDeleteProvider={vi.fn()}
        onReorder={reorderSpy}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /button.add/i }))
    expect(onAddProvider).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'trigger-reorder' }))
    expect(reorderSpy).toHaveBeenCalledWith([providers[1], providers[0]])
  })
})
