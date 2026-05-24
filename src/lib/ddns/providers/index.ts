import "server-only";
import type { DdnsProvider, ProviderDescriptor, ProviderName } from "../types";
import { cloudflareProvider } from "./cloudflare";
import { hetznerProvider } from "./hetzner";
import { genericProvider } from "./generic";

const REGISTRY: Record<ProviderName, DdnsProvider> = {
  cloudflare: cloudflareProvider,
  hetzner: hetznerProvider,
  generic: genericProvider,
};

export function getProvider(name: ProviderName): DdnsProvider {
  const p = REGISTRY[name];
  if (!p) throw new Error(`Unbekannter DDNS-Provider: ${name}`);
  return p;
}

export function listProviderDescriptors(): ProviderDescriptor[] {
  return Object.values(REGISTRY).map(({ name, label, description, fields }) => ({
    name,
    label,
    description,
    fields,
  }));
}

export const PROVIDER_NAMES: ProviderName[] = Object.keys(REGISTRY) as ProviderName[];
