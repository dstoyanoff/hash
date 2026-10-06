import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { watchBrowserForNewVersion } from './version-watch.ts';

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});

// A dashboard left open for weeks is reloaded once a newer build is being served.
watchBrowserForNewVersion();
