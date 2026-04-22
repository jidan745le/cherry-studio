import { Button, InputGroup, InputGroupAddon, InputGroupInput, Tooltip, WarnTooltip } from '@cherrystudio/ui'
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { UseProviderSettingResult } from '../hooks/useProviderSetting'
import ProviderActions from './ProviderActions'
import ProviderField from './ProviderField'
import ProviderSection from './ProviderSection'

interface AuthenticationSectionProps {
  viewModel: UseProviderSettingResult
}

export default function AuthenticationSection({ viewModel }: AuthenticationSectionProps) {
  const { t } = useTranslation()
  const { provider, drafts, derived, status, actions } = viewModel

  if (!provider || !derived.isApiKeyFieldVisible) {
    return null
  }

  return (
    <ProviderSection>
      <ProviderField
        title={t('settings.provider.api_key.label')}
        action={
          provider.id !== 'copilot' ? (
            <ProviderActions>
              <Tooltip content={t('settings.provider.api.key.list.open')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 rounded-3xs border border-border/40 bg-transparent text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
                  onClick={() => void actions.openApiKeyList()}>
                  <Settings2 size={14} />
                </Button>
              </Tooltip>
            </ProviderActions>
          ) : undefined
        }
        help={
          <div className="flex items-center justify-between gap-3 pt-1 text-(--color-text) text-xs opacity-60">
            <div>
              {derived.apiKeyWebsite && !derived.isDmxapi && (
                <a
                  href={derived.apiKeyWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-2 text-(--color-primary) hover:underline">
                  {t('settings.provider.get_api_key')}
                </a>
              )}
            </div>
            <div>{t('settings.provider.api_key.tip')}</div>
          </div>
        }>
        <InputGroup className="rounded-3xs border-border/30 bg-foreground/[0.03] shadow-none">
          <InputGroupInput
            type="password"
            className="text-sm"
            value={drafts.localApiKey}
            placeholder={t('settings.provider.api_key.label')}
            onChange={(event) => drafts.setLocalApiKey(event.target.value)}
            autoFocus={provider.isEnabled && !derived.providerApiKey}
            disabled={provider.id === 'copilot'}
          />
          {status.apiKeyConnectivity.status === 'failed' && !status.apiKeyConnectivity.checking && (
            <InputGroupAddon align="inline-end">
              <WarnTooltip
                content={status.apiKeyConnectivity.error?.message || t('settings.models.check.failed')}
                onClick={actions.showApiKeyError}
              />
            </InputGroupAddon>
          )}
        </InputGroup>
      </ProviderField>
    </ProviderSection>
  )
}
