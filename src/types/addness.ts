export interface AddnessGoal {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly parentId: string | null;
}
