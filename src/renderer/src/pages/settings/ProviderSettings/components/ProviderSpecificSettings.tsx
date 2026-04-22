import OpenAIAlert from '@renderer/components/Alert/OpenAIAlert'
import AnthropicSettings from '@renderer/pages/settings/ProviderSettings/AnthropicSettings'
import AwsBedrockSettings from '@renderer/pages/settings/ProviderSettings/AwsBedrockSettings'
import CherryINOAuth from '@renderer/pages/settings/ProviderSettings/CherryINOAuth'
import DMXAPISettings from '@renderer/pages/settings/ProviderSettings/DMXAPISettings'
import GithubCopilotSettings from '@renderer/pages/settings/ProviderSettings/GithubCopilotSettings'
import GPUStackSettings from '@renderer/pages/settings/ProviderSettings/GPUStackSettings'
import LMStudioSettings from '@renderer/pages/settings/ProviderSettings/LMStudioSettings'
import OVMSSettings from '@renderer/pages/settings/ProviderSettings/OVMSSettings'
import ProviderOAuth from '@renderer/pages/settings/ProviderSettings/ProviderOAuth'
import VertexAISettings from '@renderer/pages/settings/ProviderSettings/VertexAISettings'
import { isProviderSupportAuth } from '@renderer/services/ProviderService'
import { useTranslation } from 'react-i18next'

import type { UseProviderSettingResult } from '../hooks/useProviderSetting'
import InlineSelector from './InlineSelector'
import ProviderField from './ProviderField'
import ProviderSection from './ProviderSection'

interface ProviderSpecificSettingsProps {
  viewModel: UseProviderSettingResult
  placement: 'before' | 'after'
}

export default function ProviderSpecificSettings({ viewModel, placement }: ProviderSpecificSettingsProps) {
  const { t } = useTranslation()
  const { provider, derived, actions } = viewModel

  if (!provider) {
    return null
  }

  if (placement === 'before') {
    return (
      <>
        {isProviderSupportAuth(provider) && <ProviderOAuth providerId={provider.id} />}
        {derived.isCherryIN && <CherryINOAuth providerId={provider.id} />}
        {provider.id === 'openai' && <OpenAIAlert />}
        {provider.id === 'ovms' && <OVMSSettings />}
        {derived.isDmxapi && <DMXAPISettings providerId={provider.id} />}
        {provider.id === 'anthropic' && (
          <ProviderSection>
            <ProviderField title={t('settings.provider.anthropic.auth_method')}>
              <div className="w-[220px]">
                <InlineSelector
                  value={provider.authType || 'api-key'}
                  onChange={(value) => void actions.patchProvider({ authConfig: { type: value } })}
                  options={[
                    { value: 'api-key', label: t('settings.provider.anthropic.apikey') },
                    { value: 'oauth', label: t('settings.provider.anthropic.oauth') }
                  ]}
                />
              </div>
              {provider.authType === 'oauth' && (
                <div className="mt-4">
                  <AnthropicSettings />
                </div>
              )}
            </ProviderField>
          </ProviderSection>
        )}
      </>
    )
  }

  return (
    <>
      {provider.id === 'lmstudio' && <LMStudioSettings providerId={provider.id} />}
      {provider.id === 'gpustack' && <GPUStackSettings providerId={provider.id} />}
      {provider.id === 'copilot' && <GithubCopilotSettings providerId={provider.id} />}
      {provider.id === 'aws-bedrock' && <AwsBedrockSettings providerId={provider.id} />}
      {provider.id === 'vertexai' && <VertexAISettings providerId={provider.id} />}
    </>
  )
}
