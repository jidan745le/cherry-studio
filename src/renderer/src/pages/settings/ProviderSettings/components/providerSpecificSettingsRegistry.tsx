import OpenAIAlert from '@renderer/components/Alert/OpenAIAlert'
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
import type { Provider } from '@shared/data/types/provider'
import type { ReactNode } from 'react'

import { useProviderMeta } from '../hooks/providerSetting/useProviderMeta'
import AnthropicAuthSection from './AnthropicAuthSection'

export type ProviderSpecificPlacement = 'beforeAuth' | 'afterAuth'

export type ProviderSpecificContext = {
  provider: Provider
  meta: ReturnType<typeof useProviderMeta>
}

export type ProviderSpecificRegistryEntry = {
  key: string
  when: (context: ProviderSpecificContext) => boolean
  render: (providerId: string) => ReactNode
}

export const PROVIDER_SPECIFIC_SETTINGS_REGISTRY: Record<ProviderSpecificPlacement, ProviderSpecificRegistryEntry[]> = {
  beforeAuth: [
    {
      key: 'oauth',
      when: ({ provider }) => isProviderSupportAuth(provider),
      render: (providerId) => <ProviderOAuth providerId={providerId} />
    },
    {
      key: 'cherryin-oauth',
      when: ({ meta }) => meta.isCherryIN,
      render: (providerId) => <CherryINOAuth providerId={providerId} />
    },
    {
      key: 'openai-alert',
      when: ({ provider }) => provider.id === 'openai',
      render: () => <OpenAIAlert />
    },
    {
      key: 'ovms-settings',
      when: ({ provider }) => provider.id === 'ovms',
      render: () => <OVMSSettings />
    },
    {
      key: 'dmxapi-settings',
      when: ({ meta }) => meta.isDmxapi,
      render: (providerId) => <DMXAPISettings providerId={providerId} />
    },
    {
      key: 'anthropic-auth',
      when: ({ provider }) => provider.id === 'anthropic',
      render: (providerId) => <AnthropicAuthSection providerId={providerId} />
    }
  ],
  afterAuth: [
    {
      key: 'lmstudio-settings',
      when: ({ provider }) => provider.id === 'lmstudio',
      render: (providerId) => <LMStudioSettings providerId={providerId} />
    },
    {
      key: 'gpustack-settings',
      when: ({ provider }) => provider.id === 'gpustack',
      render: (providerId) => <GPUStackSettings providerId={providerId} />
    },
    {
      key: 'copilot-settings',
      when: ({ provider }) => provider.id === 'copilot',
      render: (providerId) => <GithubCopilotSettings providerId={providerId} />
    },
    {
      key: 'aws-bedrock-settings',
      when: ({ provider }) => provider.id === 'aws-bedrock',
      render: (providerId) => <AwsBedrockSettings providerId={providerId} />
    },
    {
      key: 'vertexai-settings',
      when: ({ provider }) => provider.id === 'vertexai',
      render: (providerId) => <VertexAISettings providerId={providerId} />
    }
  ]
}
