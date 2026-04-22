import { Button, HelpTooltip, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@cherrystudio/ui'
import CherryINSettings from '@renderer/pages/settings/ProviderSettings/CherryINSettings'
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { UseProviderSettingResult } from '../hooks/useProviderSetting'
import ProviderActions from './ProviderActions'
import ProviderField from './ProviderField'
import ProviderSection from './ProviderSection'

interface ConnectionSectionProps {
  viewModel: UseProviderSettingResult
  onOpenCustomHeaders: () => void
}

export default function ConnectionSection({ viewModel, onOpenCustomHeaders }: ConnectionSectionProps) {
  const { t } = useTranslation()
  const { provider, drafts, derived, actions } = viewModel

  if (!provider || !derived.isConnectionFieldVisible) {
    return derived.isAzureOpenAI ? (
      <ProviderSection>
        <ProviderField
          title={t('settings.provider.api_version')}
          help={
            <div className="pt-1 text-(--color-text) text-xs opacity-60">
              {t('settings.provider.azure.apiversion.tip')}
            </div>
          }>
          <InputGroup className="rounded-3xs border-border/30 bg-foreground/[0.03] shadow-none">
            <InputGroupInput
              value={drafts.apiVersion}
              placeholder="2024-xx-xx-preview"
              onChange={(event) => drafts.setApiVersion(event.target.value)}
              onBlur={actions.commitApiVersion}
            />
          </InputGroup>
        </ProviderField>
      </ProviderSection>
    ) : null
  }

  return (
    <ProviderSection>
      <ProviderField
        title={
          <div className="flex items-center gap-1">
            <span>
              {drafts.activeHostField === 'anthropicApiHost'
                ? t('settings.provider.anthropic_api_host')
                : `${t('settings.provider.api_host')} (Endpoint URL)`}
            </span>
            <HelpTooltip title={t('settings.provider.api.url.tip')} />
          </div>
        }
        action={
          <ProviderActions>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-3xs border border-border/40 bg-transparent text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
              onClick={onOpenCustomHeaders}>
              <Settings2 size={14} />
            </Button>
          </ProviderActions>
        }
        help={
          drafts.activeHostField === 'apiHost' ? (
            <div className="space-y-1 pt-1">
              {provider.id === 'vertexai' && (
                <div className="text-(--color-text) text-xs opacity-60">
                  {t('settings.provider.vertex_ai.api_host_help')}
                </div>
              )}
              <div className="break-all text-(--color-text) text-xs opacity-60">
                {t('settings.provider.api_host_preview', { url: derived.hostPreview })}
              </div>
            </div>
          ) : (
            <div className="break-all pt-1 text-(--color-text) text-xs opacity-60">
              {t('settings.provider.anthropic_api_host_preview', {
                url: derived.anthropicHostPreview || '—'
              })}
            </div>
          )
        }>
        {drafts.activeHostField === 'apiHost' ? (
          derived.isCherryIN && derived.isChineseUser ? (
            <CherryINSettings providerId={provider.id} />
          ) : (
            <InputGroup className="rounded-3xs border-border/30 bg-foreground/[0.03] shadow-none">
              <InputGroupInput
                className="text-sm"
                value={drafts.apiHost}
                placeholder={t('settings.provider.api_host')}
                onChange={(event) => drafts.setApiHost(event.target.value)}
                onBlur={actions.commitApiHost}
              />
              {derived.isApiHostResettable && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant="destructive"
                    size="sm"
                    className="rounded-3xs"
                    onClick={actions.resetApiHost}>
                    {t('settings.provider.api.url.reset')}
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          )
        ) : (
          <InputGroup className="rounded-3xs border-border/30 bg-foreground/[0.03] shadow-none">
            <InputGroupInput
              className="text-sm"
              value={drafts.anthropicApiHost}
              placeholder={t('settings.provider.anthropic_api_host')}
              onChange={(event) => drafts.setAnthropicApiHost(event.target.value)}
              onBlur={actions.commitAnthropicApiHost}
            />
          </InputGroup>
        )}
      </ProviderField>
      {derived.isAzureOpenAI && (
        <ProviderField
          className="mt-4"
          title={t('settings.provider.api_version')}
          help={
            <div className="pt-1 text-(--color-text) text-xs opacity-60">
              {t('settings.provider.azure.apiversion.tip')}
            </div>
          }>
          <InputGroup className="rounded-3xs border-border/30 bg-foreground/[0.03] shadow-none">
            <InputGroupInput
              className="text-sm"
              value={drafts.apiVersion}
              placeholder="2024-xx-xx-preview"
              onChange={(event) => drafts.setApiVersion(event.target.value)}
              onBlur={actions.commitApiVersion}
            />
          </InputGroup>
        </ProviderField>
      )}
    </ProviderSection>
  )
}
