/**
 * Tests for the "Continue in IBM Bob" export button in the Escalation panel.
 *
 * The button is hidden when there is no escalation (the component only renders when escalation is
 * non-null, so the parent controls its visibility — tested here via the component's own rendering).
 * When clicked it triggers the download; on failure it shows a toast.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '../../lib/stores/toastStore';
import { useWorkspaceStore } from '../../lib/stores/workspaceStore';
import type { RepairEscalation } from '../../lib/types';
import { Escalation } from './Escalation';

const PROJECT = 'p1';

const ESCALATION: RepairEscalation = {
  reason: 'stalled',
  summary: 'I stopped after 2 attempt(s) because the failing tests stopped shrinking.',
  failing_tests: [
    {
      name: 'rejects an empty title',
      criterion_id: 'ac-empty',
      file: 'todos.test.ts',
      message: 'expected 400, received 201',
    },
  ],
  diffs_tried: [
    {
      id: 'a1',
      iteration: 1,
      target_files: ['src/todos.controller.ts'],
      diff_ref: 'fs:d1',
      outcome: 'no_progress',
    },
  ],
  metrics: {
    initial_failing: 1,
    final_failing: 1,
    failing_by_iteration: [1],
    regressions_introduced: 0,
    iterations: 1,
    tokens_spent: 900,
    cost_inr: 1.2,
    wall_clock_s: 30,
  },
  resume: { stage: 'build', action: 'refine', hint: 'Describe what to change…' },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function blobResponse(status = 200): Response {
  return new Response(new Blob(['PK'], { type: 'application/zip' }), {
    status,
    headers: { 'Content-Type': 'application/zip' },
  });
}

function renderEscalation(esc: RepairEscalation = ESCALATION) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(<Escalation projectId={PROJECT} escalation={esc} />, { wrapper });
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  useWorkspaceStore.setState({ activeStage: 'test' });
});
afterEach(() => vi.unstubAllGlobals());

describe('Escalation — export button', () => {
  it('shows the export button when escalation is provided', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(json({}))),
    );
    renderEscalation();
    expect(screen.getByTestId('export-bob-handoff')).toBeInTheDocument();
    expect(screen.getByTestId('export-bob-handoff')).toHaveTextContent('Continue in IBM Bob');
  });

  it('starts the download when the button is clicked', async () => {
    // Stub URL.createObjectURL / revokeObjectURL (not available in JSDOM).
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    // Intercept fetch BEFORE render so the stub is in place when the mutation fires.
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input) => {
        if (String(input).includes('export-bob-handoff')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(json({}));
      }),
    );

    // Render first — spying on document.body before render breaks RTL's mount.
    renderEscalation();

    // Intercept <a>.click() AFTER render so the spy doesn't interfere with mounting.
    const clickSpy = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = originalCreate('a');
        el.click = clickSpy;
        return el;
      }
      return originalCreate(tag);
    });

    fireEvent.click(screen.getByTestId('export-bob-handoff'));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('shows a toast when the export request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input) => {
        if (String(input).includes('export-bob-handoff')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ error: { type: 'not_found', message: 'Not escalated' } }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          );
        }
        return Promise.resolve(json({}));
      }),
    );

    renderEscalation();
    fireEvent.click(screen.getByTestId('export-bob-handoff'));

    await waitFor(() => {
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.title === 'Export failed')).toBe(true);
    });
  });

  it('shows "Preparing…" while the download is in flight', async () => {
    // Never resolve the fetch — button should stay in pending state.
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => new Promise(() => {})),
    );

    renderEscalation();
    fireEvent.click(screen.getByTestId('export-bob-handoff'));

    await waitFor(() =>
      expect(screen.getByTestId('export-bob-handoff')).toHaveTextContent('Preparing…'),
    );
    expect(screen.getByTestId('export-bob-handoff')).toBeDisabled();
  });
});
