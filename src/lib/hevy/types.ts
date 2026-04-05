export type HevyWorkoutSummary = {
  id: string;
  title: string | null;
  description: string | null;
  routineId: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  exerciseCount: number;
  setCount: number;
  volumeKg: number | null;
  durationSeconds: number | null;
  rawJson: string;
};

export type HevyConnectionStatus = {
  connected: boolean;
  status: string;
  hasApiKey: boolean;
  userId: string | null;
  userName: string | null;
  profileUrl: string | null;
  lastConnectedAt: string | null;
  lastSyncStartedAt: string | null;
  lastSyncCompletedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  isStale: boolean;
  latestWorkouts: HevyWorkoutSummary[];
};
