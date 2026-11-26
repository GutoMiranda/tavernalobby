import "server-only";

import { revalidatePath } from "next/cache";

/** Atualiza a aventura nas páginas comuns e no Salão do Mestre. */
export function revalidarAventura(eventId: string) {
  revalidatePath(`/aventuras/${eventId}`, "layout");
  revalidatePath(`/mestre/aventuras/${eventId}`, "layout");
  revalidatePath("/mestre", "layout");
}
