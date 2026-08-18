import { useState, useCallback } from "react";
import { useAuth } from "@/features/core/useAuth";
import { createAlias, updateAlias, deleteAlias } from "../api/catalog";
import { normalizeText } from "@/lib/normalize";
import type { CatalogItemAlias } from "@/types";

export function useAliasMutations(itemId: string) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  const [aliases, setAliases] = useState<CatalogItemAlias[]>([]);

  const setInitial = useCallback((initial: CatalogItemAlias[]) => {
    setAliases(initial);
  }, []);

  const add = useCallback(async (originalName: string, sourceType: string) => {
    if (!orgId) throw new Error("Organização não identificada");

    const normalized = normalizeText(originalName);
    const existing = aliases.find((a) => a.normalized_name === normalized);
    if (existing) {
      throw new Error("Este nome alternativo já existe para este item");
    }

    const alias = await createAlias(
      {
        organization_id: orgId,
        catalog_item_id: itemId,
        source_type: sourceType,
        original_name: originalName,
        normalized_name: normalized,
        is_confirmed: true,
      },
      orgId
    );

    setAliases((prev) => [...prev, alias]);
    return alias;
  }, [orgId, itemId, aliases]);

  const update = useCallback(async (id: string, originalName: string) => {
    if (!orgId) throw new Error("Organização não identificada");

    const normalized = normalizeText(originalName);
    const alias = await updateAlias(
      id,
      { original_name: originalName, normalized_name: normalized },
      orgId
    );

    setAliases((prev) => prev.map((a) => (a.id === id ? alias : a)));
    return alias;
  }, [orgId]);

  const remove = useCallback(async (id: string) => {
    if (!orgId) throw new Error("Organização não identificada");

    await deleteAlias(id, orgId);
    setAliases((prev) => prev.filter((a) => a.id !== id));
  }, [orgId]);

  return { aliases, setInitial, add, update, remove };
}
