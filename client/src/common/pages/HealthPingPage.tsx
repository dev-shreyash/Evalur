import React, { useEffect, useState } from 'react';

interface PingResponse {
  status: string;
  message: string;
  timestamp: string;
  service: string;
  backend?: {
    status: string;
    url?: string;
    latencyMs?: number;
  };
}

export const HealthPingPage: React.FC = () => {
  const [data, setData] = useState<PingResponse>({
    status: 'UP',
    message: 'pong',
    timestamp: new Date().toISOString(),
    service: 'evalur-client',
  });

  useEffect(() => {
    fetch('/api/health/ping')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => {
        // Retain client fallback
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-6 flex flex-col justify-start">
      <pre className="text-sm bg-muted/40 p-4 rounded-md border border-border overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default HealthPingPage;

