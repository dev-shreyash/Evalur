import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CandidatesPage from './CandidatesPage';
import {
  useCandidates,
  useCohorts,
  useCreateCohort,
  useUpdateCohort,
  useAssignCandidatesToCohort,
  useSyncCohortMembers,
  useRemoveCandidateFromCohort,
} from '@/feature/dashboard/hooks/useAssessment';
import { useInvite } from '@/feature/dashboard/hooks/useInvite';

vi.mock('@/feature/dashboard/hooks/useAssessment', () => ({
  useCandidates: vi.fn(),
  useCohorts: vi.fn(),
  useCreateCohort: vi.fn(),
  useUpdateCohort: vi.fn(),
  useAssignCandidatesToCohort: vi.fn(),
  useSyncCohortMembers: vi.fn(),
  useRemoveCandidateFromCohort: vi.fn(),
}));

vi.mock('@/feature/dashboard/hooks/useInvite', () => ({
  useInvite: vi.fn(),
}));

describe('CandidatesPage & Cohort Management End-to-End', () => {
  const mockCandidates = [
    {
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'CANDIDATE',
      cohortId: 10,
      cohortName: 'Alpha Cohort',
      userAssessments: [],
    },
    {
      id: 2,
      name: 'Bob Smith',
      email: 'bob@example.com',
      role: 'CANDIDATE',
      cohortId: null,
      cohortName: null,
      userAssessments: [],
    },
  ];

  const mockCohorts = [
    {
      id: 10,
      name: 'Alpha Cohort',
      description: 'First engineering cohort',
      memberCount: 1,
      createdAt: '2026-10-27T10:00:00Z',
    },
  ];

  const mockCreateMutate = vi.fn();
  const mockUpdateMutate = vi.fn();
  const mockAssignMutate = vi.fn();
  const mockSyncMutate = vi.fn();
  const mockRemoveMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useCandidates as any).mockReturnValue({
      data: mockCandidates,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    (useCohorts as any).mockReturnValue({
      data: mockCohorts,
      refetch: vi.fn(),
    });

    (useInvite as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ inviteLink: 'http://evalur.io/invite/123' }),
      isPending: false,
    });

    (useCreateCohort as any).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: false,
    });

    (useUpdateCohort as any).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    });

    (useAssignCandidatesToCohort as any).mockReturnValue({
      mutate: mockAssignMutate,
      isPending: false,
    });

    (useSyncCohortMembers as any).mockReturnValue({
      mutate: mockSyncMutate,
      isPending: false,
    });

    (useRemoveCandidateFromCohort as any).mockReturnValue({
      mutate: mockRemoveMutate,
      isPending: false,
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <CandidatesPage />
      </MemoryRouter>
    );

  it('1. Renders candidate roster with assigned and unassigned candidates', () => {
    renderComponent();

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Alpha Cohort')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('2. Opens create cohort dialog and submits valid payload', async () => {
    renderComponent();

    const newCohortBtn = screen.getByRole('button', { name: /new cohort \/ group/i });
    fireEvent.click(newCohortBtn);

    expect(screen.getByText('Create Cohort / Group')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. 2026 Java Bootcamp/i);
    fireEvent.change(nameInput, { target: { value: 'Beta Cohort' } });

    const saveBtn = screen.getByRole('button', { name: /save cohort/i });
    fireEvent.click(saveBtn);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Beta Cohort' }),
      expect.any(Object)
    );
  });

  it('3. Opens candidate cohort modal and assigns unassigned candidate', async () => {
    renderComponent();

    // Bob Smith is unassigned; click Assign button specifically by title
    const assignButton = screen.getByTitle('Assign to cohort');
    fireEvent.click(assignButton);

    expect(screen.getByText(/Assign Candidate to Cohort/i)).toBeInTheDocument();
    expect(screen.getByText('None (Unassigned / General Roster)')).toBeInTheDocument();
  });

  it('4. Calls remove mutation when removing candidate from cohort', () => {
    renderComponent();

    const removeBtn = screen.getByTitle(/remove from cohort/i);
    fireEvent.click(removeBtn);

    expect(mockRemoveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ candidateId: 1, cohortId: 10 }),
      expect.any(Object)
    );
  });

  it('5. Switches to Cohorts & Groups tab and renders cohorts with member counts', () => {
    renderComponent();

    const cohortsTab = screen.getByRole('tab', { name: /cohorts & groups/i });
    fireEvent.pointerDown(cohortsTab, { button: 0 });
    fireEvent.click(cohortsTab);
    fireEvent.keyDown(cohortsTab, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Alpha Cohort')).toBeInTheDocument();
    expect(screen.getByText('First engineering cohort')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manage members/i })).toBeInTheDocument();
  });

  it('6. Opens edit cohort dialog and populates current cohort values', () => {
    renderComponent();

    const cohortsTab = screen.getByRole('tab', { name: /cohorts & groups/i });
    fireEvent.pointerDown(cohortsTab, { button: 0 });
    fireEvent.click(cohortsTab);
    fireEvent.keyDown(cohortsTab, { key: 'Enter', code: 'Enter' });

    const editBtn = screen.getByRole('button', { name: /edit details/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Cohort / Group Details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alpha Cohort')).toBeInTheDocument();
    expect(screen.getByDisplayValue('First engineering cohort')).toBeInTheDocument();
  });
});
