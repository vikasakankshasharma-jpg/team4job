export interface SchemaEnvelope {
  tenantId: 'team4job';
  schemaVersion: 1;
  region: 'IN';
  vertical: 'skilled_trades';
}

export const DEFAULT_SCHEMA_ENVELOPE: SchemaEnvelope = {
  tenantId: 'team4job',
  schemaVersion: 1,
  region: 'IN',
  vertical: 'skilled_trades'
};

export function applyEnvelope<T extends Record<string, unknown>>(data: T): T & SchemaEnvelope {
  return {
    ...data,
    ...DEFAULT_SCHEMA_ENVELOPE
  };
}
