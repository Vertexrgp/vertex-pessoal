type Handler<T = unknown> = (payload: T) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on<T = unknown>(event: string, handler: Handler<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler);
    return () => this.listeners.get(event)?.delete(handler as Handler);
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
    this.listeners.get("*")?.forEach((h) => h({ event, payload }));
  }
}

export const eventBus = new EventBus();

export const EVENT_TYPES = {
  TASK_CREATED: "TASK_CREATED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_POSTPONED: "TASK_POSTPONED",
  EXPENSE_CREATED: "EXPENSE_CREATED",
  RECURRING_TRIGGERED: "RECURRING_TRIGGERED",
  WORKOUT_CREATED: "WORKOUT_CREATED",
  WORKOUT_COMPLETED: "WORKOUT_COMPLETED",
  TRAVEL_CREATED: "TRAVEL_CREATED",
  TRAVEL_EXPENSE_CREATED: "TRAVEL_EXPENSE_CREATED",
  GOAL_UPDATED: "GOAL_UPDATED",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
