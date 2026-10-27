import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HealthPingPage from './HealthPingPage';

describe('HealthPingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders health ping JSON with status UP', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'UP',
        message: 'pong',
        timestamp: '2026-10-27T13:00:00.000Z',
        service: 'evalur-api-ping',
        backend: {
          status: 'UP',
          url: 'https://evalur-backend.onrender.com',
          latencyMs: 120,
        },
      }),
    } as any);

    render(<HealthPingPage />);

    expect(await screen.findByText(/"status": "UP"/i)).toBeInTheDocument();
    expect(screen.getByText(/"message": "pong"/i)).toBeInTheDocument();
  });
});

