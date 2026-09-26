import { useEntity, useIntegrationStatus, useService } from '@hash/ui';

export default function Home() {
  const status = useIntegrationStatus('ha');
  const lamp = useEntity('ha:light.lamp');
  const call = useService('ha:light.lamp');

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <p>Backend: {status ?? 'connecting'}</p>
      <button
        type="button"
        onClick={() => void call('light', 'toggle')}
        style={{ padding: 16, fontSize: 24 }}
      >
        lamp: {lamp === undefined ? '…' : (lamp?.state ?? 'missing')}
      </button>
    </main>
  );
}
