export type Direction = 'low' | 'high' | 'exact';
export type DigitStyle = 'latn' | 'arab';
export type ThemePref = 'auto' | 'light' | 'dark';
export type Tier = 'sniper' | 'great' | 'close' | 'practice' | 'dark';
export type GroupKind = 'friends' | 'class' | 'club' | 'university';
export type LeaderboardScope = 'day' | 'week' | 'all' | 'streak';

export interface Bin { bin: number; count: number }

export interface QuestionPublic {
  id: number; position: number; text: string; unit: string; category: string | null;
}

export interface Reveal {
  question_id: number; guess: number; answer: number; multiple: number; direction: Direction;
  explanation: string;            // napkin math, Markdown
  source_url: string; source_name: string | null; as_of: string | null;
  closer_than_pct: number | null; // null when < 20 other players
  players: number;                // everyone who answered this question, incl. me
}

export interface SubmitGuessResult extends Reveal {
  daily_score: number | null;     // non-null once the puzzle is complete
  already_guessed: boolean;
}

export interface PuzzleState {
  puzzle_id: number; number: number; publish_date: string; // YYYY-MM-DD (Asia/Qatar)
  is_daily: boolean;              // true if this is today's puzzle
  questions: QuestionPublic[];    // ordered by position, NEVER contains answers
  reveals: Reveal[];              // only for questions the caller already guessed
  daily_score: number | null;     // set when the caller completed the puzzle
}

export interface Histogram { question_id: number; bins: Bin[]; total: number; my_bin: number }

export interface ResultRow {
  question_id: number; position: number; text: string; unit: string;
  guess: number; answer: number; multiple: number; direction: Direction;
}

export interface Results {
  puzzle_id: number; number: number; publish_date: string; is_daily: boolean;
  score: number; top_pct: number | null; players: number;
  rows: ResultRow[]; distribution: Bin[]; my_bin: number;
}

export interface LeaderboardEntry {
  rank: number | null; player_id: string; display_name: string; university: string | null;
  score: number | null; days: number | null; streak: number | null; is_me: boolean;
}
export interface Leaderboard {
  scope: LeaderboardScope; entries: LeaderboardEntry[]; me: LeaderboardEntry | null;
  hidden: boolean; finishers: number;
}

export interface GroupSummary {
  id: string; name: string; kind: GroupKind; join_code: string; members: number; is_owner: boolean;
}
export interface GroupMember {
  player_id: string; display_name: string; university: string | null;
  is_owner: boolean; is_me: boolean; finished_today: boolean;
  today_score: number | null;     // null when hidden or not finished
  streak: number;
}
export interface GroupDetail {
  id: string; name: string; kind: GroupKind;
  join_code: string | null;       // null for non-members
  is_member: boolean; is_owner: boolean; member_count: number;
  members: GroupMember[];         // empty for non-members
  hidden: boolean;                // caller hasn't finished today → scores hidden
  finishers_today: number;
}

export interface Profile {
  id: string; display_name: string; university: string | null; digit_style: DigitStyle;
  games: number; avg_score: number | null; best_score: number | null;
  current_streak: number; best_streak: number; distribution: Bin[];
}

export interface ArchiveItem {
  puzzle_id: number; number: number; publish_date: string; is_today: boolean;
  answered: number; total: number; score: number | null; played_daily: boolean | null;
}

export interface SubmissionInput {
  text: string; unit?: string; proposed_answer?: number | null;
  source_url?: string; napkin?: string; credit_name?: string;
}

export type FeedbackKind = 'idea' | 'bug' | 'like' | 'other';
export interface FeedbackInput {
  kind: FeedbackKind; message: string; rating?: number | null; contact?: string;
}

// ---- admin (/admin; every call raises `forbidden` for non-admins)
export type FeedbackStatus = 'new' | 'read' | 'done';
export type SubmissionStatus = 'new' | 'reviewing' | 'accepted' | 'rejected' | 'scheduled';
export interface AdminDashboard {
  today: string;
  kpis: {
    players_total: number; players_new_7d: number; players_with_email: number;
    active_today: number; active_7d: number; returning_7d: number; completions_today: number;
    avg_score_7d: number | null; guesses_total: number; groups_total: number;
    feedback_new: number; feedback_total: number; feedback_avg_rating: number | null; submissions_new: number;
  };
  activity: { day: string; new_players: number; active_players: number; completions: number }[]; // oldest first
  puzzles: {
    number: number; publish_date: string; players: number; completions: number;
    daily_completions: number; avg_score: number | null;
  }[]; // newest first
  questions: {
    puzzle_number: number; position: number; question_id: number; text_ar: string; players: number;
    median_multiple: number | null; pct_low: number | null; pct_high: number | null;
  }[];
  universities: { university: string | null; players: number }[];
}
export interface AdminFeedback {
  id: number; kind: FeedbackKind; rating: number | null; message: string; contact: string | null;
  status: FeedbackStatus; created_at: string; display_name: string | null; university: string | null;
}
export interface AdminSubmission {
  id: number; text_ar: string; unit_ar: string | null; proposed_answer: number | null; source_url: string | null;
  napkin_ar: string | null; credit_name: string | null; status: SubmissionStatus; created_at: string;
  display_name: string | null;
}

export interface AuthState { userId: string; isAnonymous: boolean; email: string | null }
