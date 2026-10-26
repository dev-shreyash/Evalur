import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AssessmentResult from './AssessmentResult';
import { useAssessmentResult } from '@/feature/dashboard/hooks/useAssessment';

vi.mock('@/feature/dashboard/hooks/useAssessment', () => ({
  useAssessmentResult: vi.fn(),
}));

// Mock LogicRadarChart to avoid Recharts canvas / SVG measuring issues in jsdom
vi.mock('@/components/ui/LogicRadarChart', () => ({
  LogicRadarChart: ({ parsedData }: { parsedData: Record<string, number> }) => (
    <div data-testid="logic-radar-chart">
      Radar Chart Rendered: {JSON.stringify(parsedData)}
    </div>
  ),
}));

describe('Candidate AssessmentResult Page Flow & Evaluation States', () => {
  const renderAssessmentResult = (assignmentId = '101') => {
    return render(
      <MemoryRouter initialEntries={[`/candidate/assessment/${assignmentId}/result`]}>
        <Routes>
          <Route
            path="/candidate/assessment/:assignmentId/result"
            element={<AssessmentResult />}
          />
          <Route path="/candidate" element={<div>Candidate Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('1. Renders loading state while result query is in flight', () => {
    (useAssessmentResult as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    renderAssessmentResult('101');
    expect(screen.getByText('Loading your assessment result...')).toBeInTheDocument();
  });

  it('2. Renders error message and Return to Dashboard button on query failure', () => {
    (useAssessmentResult as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Result not found or forbidden'),
      refetch: vi.fn(),
      isFetching: false,
    });

    renderAssessmentResult('101');
    expect(screen.getByText('Unable to Load Assessment Result')).toBeInTheDocument();
    expect(screen.getByText('Result not found or forbidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to dashboard/i })).toBeInTheDocument();
  });

  it('3. Renders EVALUATING state with background progress notice and refresh button', () => {
    (useAssessmentResult as any).mockReturnValue({
      data: {
        id: 101,
        objectiveScore: 85,
        evaluationStatus: 'EVALUATING',
        aiLogicFeedback: null,
        logicDna: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    renderAssessmentResult('101');
    expect(screen.getByText('AI Qualitative Analysis in Progress')).toBeInTheDocument();
    expect(
      screen.getByText(/automated qualitative code reasoning is processing in the background/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('4. Renders FAILED state with safe qualitative analysis notice without leaking backend internals', () => {
    (useAssessmentResult as any).mockReturnValue({
      data: {
        id: 101,
        objectiveScore: 90,
        evaluationStatus: 'FAILED',
        aiLogicFeedback: null,
        logicDna: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    renderAssessmentResult('101');
    expect(screen.getByText('Qualitative Analysis Notice')).toBeInTheDocument();
    expect(
      screen.getByText(/automated qualitative code reasoning could not be completed for this submission/i)
    ).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('5. Renders COMPLETED state with score, historical score disclaimer, radar chart, and feedback', () => {
    (useAssessmentResult as any).mockReturnValue({
      data: {
        id: 101,
        objectiveScore: 92,
        evaluationStatus: 'COMPLETED',
        aiLogicFeedback: 'Great modular structure and clear naming conventions.',
        logicDna: JSON.stringify({ Efficiency: 9, Security: 8, Maintainability: 9 }),
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    renderAssessmentResult('101');

    // Score
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Assessment Score')).toBeInTheDocument();

    // Required exact historical score disclaimer
    expect(
      screen.getByText(
        'Historical scores may include a legacy code-length heuristic and may not be directly comparable with scores calculated under the current scoring formula.'
      )
    ).toBeInTheDocument();

    // Radar chart & feedback
    expect(screen.getByTestId('logic-radar-chart')).toBeInTheDocument();
    expect(
      screen.getByText('"Great modular structure and clear naming conventions."')
    ).toBeInTheDocument();

    // Does NOT render administrative export PDF button for candidates
    expect(screen.queryByText(/export pdf/i)).not.toBeInTheDocument();
  });
});

