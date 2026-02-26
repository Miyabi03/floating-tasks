export type IntervalUnit = "days" | "weeks";

export interface RecurringSubTask {
  readonly id: string;
  readonly text: string;
  readonly children: readonly RecurringSubTask[];
}

export interface RecurringTaskTemplate {
  readonly id: string;
  readonly text: string;
  readonly intervalValue: number;
  readonly intervalUnit: IntervalUnit;
  readonly startDate: string;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly children: readonly RecurringSubTask[];
}

export interface RecurringResetState {
  readonly lastResetDate: string;
}
