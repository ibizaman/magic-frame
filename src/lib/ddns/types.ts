import "server-only";

export type ProviderName = "cloudflare" | "hetzner" | "generic";

export type ProviderFieldType = "text" | "password" | "url" | "number";

export type ProviderField = {
  key: string;
  label: string;
  type: ProviderFieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
  /** Default-Wert wenn leer. */
  defaultValue?: string;
};

export type ProviderDescriptor = {
  name: ProviderName;
  label: string;
  description: string;
  /** Pflicht-/optionale Eingaben pro Provider. */
  fields: ProviderField[];
};

export type ProviderUpdateResult = {
  /** true wenn der DNS-Record-Wert geändert wurde. */
  changed: boolean;
  /** IP, die nach dem Update im DNS-Record steht. */
  recordIp: string;
};

export type DdnsProvider = ProviderDescriptor & {
  /**
   * Führt den eigentlichen DNS-Update durch.
   * `params` enthält alle in `fields` definierten Werte (oder Defaults).
   */
  update(params: Record<string, string>, ip: string): Promise<ProviderUpdateResult>;
};
