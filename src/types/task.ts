export interface Task {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
  readonly createdAt: string;
  readonly parentId: string | null;
  readonly calendarEventId?: string;
  readonly recurringTemplateId?: string;
}
