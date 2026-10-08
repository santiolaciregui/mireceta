export interface CoverageSnapshot {
  obraSocial: string;
  obraSocialNumber: string;
}

export interface CoverageConfirmation extends CoverageSnapshot {
  confirmedAt: string;
  draftRestored: boolean;
  source: 'patient_form';
  history: Array<CoverageSnapshot & { at: string; event: 'selection_changed' | 'draft_restored' }>;
}

const clean = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

export function coverageSnapshot(value: { obraSocial?: unknown; obraSocialNumber?: unknown }): CoverageSnapshot {
  return {
    obraSocial: clean(value.obraSocial),
    obraSocialNumber: clean(value.obraSocialNumber),
  };
}

export function coverageChange(
  before: { obraSocial?: unknown; obraSocialNumber?: unknown },
  after: { obraSocial?: unknown; obraSocialNumber?: unknown },
) {
  const previous = coverageSnapshot(before);
  const next = coverageSnapshot(after);
  return previous.obraSocial !== next.obraSocial || previous.obraSocialNumber !== next.obraSocialNumber
    ? { before: previous, after: next }
    : null;
}

export function validateCoverageConfirmation(
  input: unknown,
  submitted: { obraSocial?: unknown; obraSocialNumber?: unknown },
): CoverageConfirmation | null {
  if (input == null) return null; // Older clients do not send this audit metadata.
  if (!input || typeof input !== 'object') throw new Error('La confirmación de cobertura es inválida.');

  const candidate = input as Record<string, unknown>;
  const confirmed = coverageSnapshot(candidate);
  const expected = coverageSnapshot(submitted);
  const confirmedAt = clean(candidate.confirmedAt);
  const date = new Date(confirmedAt);
  const rawHistory = candidate.history;
  if (rawHistory !== undefined && (!Array.isArray(rawHistory) || rawHistory.length > 25)) {
    throw new Error('El historial de cobertura del formulario es inválido.');
  }
  const history: CoverageConfirmation['history'] = (Array.isArray(rawHistory) ? rawHistory : []).map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('El historial de cobertura del formulario es inválido.');
    const value = entry as Record<string, unknown>;
    const at = clean(value.at);
    const snapshot = coverageSnapshot(value);
    if (
      (value.event !== 'selection_changed' && value.event !== 'draft_restored') ||
      !at || Number.isNaN(new Date(at).getTime()) ||
      snapshot.obraSocial.length > 120 || snapshot.obraSocialNumber.length > 80
    ) throw new Error('El historial de cobertura del formulario es inválido.');
    return { ...snapshot, at, event: value.event as 'selection_changed' | 'draft_restored' };
  });

  if (
    candidate.source !== 'patient_form' ||
    typeof candidate.draftRestored !== 'boolean' ||
    !confirmedAt || Number.isNaN(date.getTime()) ||
    confirmed.obraSocial.length > 120 || confirmed.obraSocialNumber.length > 80 ||
    confirmed.obraSocial !== expected.obraSocial ||
    confirmed.obraSocialNumber !== expected.obraSocialNumber
  ) {
    throw new Error('La cobertura confirmada no coincide con la solicitud. Revisá la obra social y volvé a confirmar.');
  }

  return { ...confirmed, confirmedAt, draftRestored: candidate.draftRestored, source: 'patient_form', history };
}
