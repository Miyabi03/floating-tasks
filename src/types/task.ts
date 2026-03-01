export type TaskStatus = "pending" | "in_progress" | "interrupted" | "completed";

export interface Task {
  readonly id: string;
  readonly text: string;
  readonly status: TaskStatus;
  readonly createdAt: string;
  readonly parentId: string | null;
  readonly calendarEventId?: string;
  readonly recurringTemplateId?: string;
  readonly addnessGoalId?: string;
}
