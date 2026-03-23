import { eventBus, type EventType } from "./event-bus";

const getApiBase = () =>
  import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");

export async function emitEvent(
  tipo: EventType,
  origem: string,
  descricao: string,
  payload?: unknown
): Promise<void> {
  eventBus.emit(tipo, payload);

  try {
    await fetch(`${getApiBase()}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, origem, descricao, payload }),
    });
  } catch {
    // Event persistence failure is non-critical
  }
}
