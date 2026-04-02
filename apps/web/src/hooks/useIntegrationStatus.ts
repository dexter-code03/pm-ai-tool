import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type IntegrationSummary } from '../lib/api';

export function useIntegrationStatus() {
  const [integrations, setIntegrations] = useState<Record<string, IntegrationSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrations();
      setIntegrations(data.integrations || {});
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load integrations');
      setIntegrations(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const flags = useMemo(() => {
    const i = integrations || {};
    const hasAiProvider = ['openai', 'claude', 'gemini', 'custom'].some((k) => i[k]?.isConnected);
    return {
      hasAiProvider,
      hasStitch: !!i.stitch?.isConnected,
      hasSlack: !!i.slack?.isConnected,
      hasTeams: !!i.teams?.isConnected,
      hasJira: !!i.jira?.isConnected,
      hasFigma: !!i.figma?.isConnected,
      hasGoogle: !!i.google?.isConnected,
      hasConfluence: !!i.confluence?.isConnected,
      hasNotion: !!i.notion?.isConnected,
      hasEmail: !!i.email?.isConnected
    };
  }, [integrations]);

  return {
    integrations,
    loading,
    error,
    refresh,
    ...flags
  };
}
