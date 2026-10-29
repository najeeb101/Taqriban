// The ONLY backend entry point for UI code. Every call goes through a security-definer RPC (see Docs/PLAN.md §5.2).
import type {
  ArchiveItem,
  AuthState,
  DigitStyle,
  GroupDetail,
  GroupKind,
  GroupSummary,
  Histogram,
  Leaderboard,
  LeaderboardScope,
  Profile,
  PuzzleState,
  Results,
  SubmissionInput,
  FeedbackInput,
  FeedbackStatus,
  SubmissionStatus,
  AdminDashboard,
  AdminFeedback,
  AdminSubmission,
  SubmitGuessResult,
} from './types';
import { ensureSession, getSupabase, resetSession } from './supabase';

const SERVER_CODES = [
  'not_authenticated',
  'invalid_guess',
  'unknown_question',
  'puzzle_not_live',
  'not_completed',
  'not_member',
  'not_owner',
  'invalid_name',
  'invalid_input',
  'invalid_code',
  'rate_limited',
  'not_found',
  'forbidden',
] as const;

export type ApiErrorCode = (typeof SERVER_CODES)[number] | 'network' | 'unknown';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
  }
}

const NETWORK_RE = /fetch|network|load failed|timed? ?out|ECONN|ENOTFOUND|offline/i;

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  const err = e as { message?: unknown; code?: unknown; status?: unknown; name?: unknown } | null;
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  if ((SERVER_CODES as readonly string[]).includes(message)) return new ApiError(message, message);
  const name = typeof err?.name === 'string' ? err.name : '';
  const status = typeof err?.status === 'number' ? err.status : null;
  if (
    status === 0 ||
    /FetchError|RetryableFetch/i.test(name) ||
    (NETWORK_RE.test(message) && err?.code == null) ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return new ApiError('network', message || 'network');
  }
  return new ApiError('unknown', message || 'unknown');
}

/** Calls an RPC; omits undefined args; maps failures to ApiError. */
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  try {
    await ensureSession();
    const clean: Record<string, unknown> = {};
    if (args) for (const [k, v] of Object.entries(args)) if (v !== undefined) clean[k] = v;
    const { data, error } = await getSupabase().rpc(fn, clean);
    if (error) throw error;
    return data as T;
  } catch (e) {
    throw toApiError(e);
  }
}

export function getPuzzle(number?: number): Promise<PuzzleState | null> {
  return rpc<PuzzleState | null>('get_puzzle', { p_number: number });
}

export function submitGuess(questionId: number, guess: number): Promise<SubmitGuessResult> {
  return rpc<SubmitGuessResult>('submit_guess', { p_question_id: questionId, p_guess: guess });
}

export function getHistogram(questionId: number): Promise<Histogram> {
  return rpc<Histogram>('get_histogram', { p_question_id: questionId });
}

export function getResults(puzzleId: number): Promise<Results> {
  return rpc<Results>('get_results', { p_puzzle_id: puzzleId });
}

export function getLeaderboard(
  scope: LeaderboardScope,
  opts?: { groupId?: string; university?: string },
): Promise<Leaderboard> {
  return rpc<Leaderboard>('get_leaderboard', {
    p_scope: scope,
    p_group_id: opts?.groupId,
    p_university: opts?.university,
  });
}

export function createGroup(name: string, kind: GroupKind): Promise<GroupSummary> {
  return rpc<GroupSummary>('create_group', { p_name: name, p_kind: kind });
}

export function joinGroup(code: string): Promise<GroupSummary> {
  return rpc<GroupSummary>('join_group', { p_code: code });
}

export async function leaveGroup(groupId: string): Promise<void> {
  await rpc<null>('leave_group', { p_group_id: groupId });
}

export async function getMyGroups(): Promise<GroupSummary[]> {
  return (await rpc<GroupSummary[] | null>('get_my_groups')) ?? [];
}

export function getGroup(code: string): Promise<GroupDetail | null> {
  return rpc<GroupDetail | null>('get_group', { p_code: code });
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  await rpc<null>('rename_group', { p_group_id: groupId, p_name: name });
}

export async function removeMember(groupId: string, playerId: string): Promise<void> {
  await rpc<null>('remove_member', { p_group_id: groupId, p_player_id: playerId });
}

export function regenerateCode(groupId: string): Promise<string> {
  return rpc<string>('regenerate_code', { p_group_id: groupId });
}

export function getProfile(): Promise<Profile> {
  return rpc<Profile>('get_profile');
}

export function updateProfile(patch: {
  display_name?: string;
  university?: string | null;
  digit_style?: DigitStyle;
}): Promise<Profile> {
  return rpc<Profile>('update_profile', {
    p_display_name: patch.display_name,
    // null clears the university on the server, which expects '' for "clear" (null = unchanged)
    p_university: patch.university === null ? '' : patch.university,
    p_digit_style: patch.digit_style,
  });
}

export async function getArchive(): Promise<ArchiveItem[]> {
  return (await rpc<ArchiveItem[] | null>('get_archive')) ?? [];
}

export function submitQuestion(input: SubmissionInput): Promise<{ id: number }> {
  return rpc<{ id: number }>('submit_question', {
    p_text: input.text,
    p_unit: input.unit,
    p_answer: input.proposed_answer ?? undefined,
    p_source_url: input.source_url,
    p_napkin: input.napkin,
    p_credit_name: input.credit_name,
  });
}

export function submitFeedback(input: FeedbackInput): Promise<{ id: number }> {
  return rpc<{ id: number }>('submit_feedback', {
    p_kind: input.kind,
    p_message: input.message,
    p_rating: input.rating ?? undefined,
    p_contact: input.contact,
  });
}

// ---- admin (server checks the caller; non-admins get ApiError('forbidden'))
export function adminIsAdmin(): Promise<boolean> {
  return rpc<boolean>('admin_is_admin');
}

export function adminDashboard(): Promise<AdminDashboard> {
  return rpc<AdminDashboard>('admin_dashboard');
}

export async function adminListFeedback(status?: FeedbackStatus): Promise<AdminFeedback[]> {
  return (await rpc<AdminFeedback[] | null>('admin_list_feedback', { p_status: status })) ?? [];
}

export async function adminSetFeedbackStatus(id: number, status: FeedbackStatus): Promise<void> {
  await rpc<null>('admin_set_feedback_status', { p_id: id, p_status: status });
}

export async function adminListSubmissions(status?: SubmissionStatus): Promise<AdminSubmission[]> {
  return (await rpc<AdminSubmission[] | null>('admin_list_submissions', { p_status: status })) ?? [];
}

export async function adminSetSubmissionStatus(id: number, status: SubmissionStatus): Promise<void> {
  await rpc<null>('admin_set_submission_status', { p_id: id, p_status: status });
}

export async function deleteMyData(): Promise<void> {
  await rpc<null>('delete_my_data');
  try {
    await getSupabase().auth.signOut();
  } catch {
    /* the user row is already gone; the local session is stale anyway */
  }
  resetSession();
}

// ---------------------------------------------------------------- auth helpers

export async function getAuthState(): Promise<AuthState> {
  try {
    const session = await ensureSession();
    const u = session.user;
    return { userId: u.id, isAnonymous: u.is_anonymous ?? false, email: u.email ?? null };
  } catch (e) {
    throw toApiError(e);
  }
}

export async function linkEmail(email: string): Promise<void> {
  try {
    await ensureSession();
    const { error } = await getSupabase().auth.updateUser(
      { email },
      { emailRedirectTo: `${location.origin}/settings` },
    );
    if (error) throw error;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function signInWithEmail(email: string): Promise<void> {
  try {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/settings`, shouldCreateUser: false },
    });
    if (error) throw error;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  } catch (e) {
    throw toApiError(e);
  } finally {
    resetSession();
  }
}
