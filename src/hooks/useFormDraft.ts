/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { MedicationItem } from '../types';

export interface PatientFormDraft {
  step: 'info' | 'identification' | 'medication' | 'payment';
  
  // Step 1: Identification
  patientDni: string;
  patientName: string;
  patientLastName: string;
  patientBirthDate: string;
  patientEmail: string;
  patientPhone: string;
  deliveryMethod: 'email' | 'whatsapp' | 'both';
  selectedObraSocial: string;
  obraSocialNumber: string;
  selectedCardId: string;

  // Step 2: Medication
  medicationMethod: 'new_manual' | 'upload_photo' | 'past_orders';
  selectedPastOrderId?: string;
  medicationItems: MedicationItem[];
  medicationPhotos: { url: string; name: string }[];
  diagnostic: string;
  comments: string;
  lastConsultationTime: string;
  lastConsultationDoctor: string;

  // Step 3: Consents
  consentAge: boolean;
  consentTerms: boolean;
  consentInformed: boolean;
  consentSworn: boolean;

  // Step 4: Payment
  paymentMethod: 'mp' | 'transfer' | 'cash_desk';
  paymentAmount: string;

  // Metadata
  savedAt: string;
}

const STORAGE_KEY_PREFIX = 'mireceta_form_draft_';
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getDraftStorageKey(userIdentifier?: string): string {
  const cleanId = (userIdentifier || 'anon').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return `${STORAGE_KEY_PREFIX}${cleanId}`;
}

export function useFormDraft(userIdentifier?: string) {
  const storageKey = getDraftStorageKey(userIdentifier);

  const saveDraft = useCallback(
    (draft: Omit<PatientFormDraft, 'savedAt'>) => {
      try {
        const payload: PatientFormDraft = {
          ...draft,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (err) {
        console.warn('[useFormDraft] Could not save draft to localStorage:', err);
      }
    },
    [storageKey]
  );

  const loadDraft = useCallback((): PatientFormDraft | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed: PatientFormDraft = JSON.parse(raw);
      if (!parsed || !parsed.savedAt) return null;

      const draftAge = Date.now() - new Date(parsed.savedAt).getTime();
      if (draftAge > MAX_DRAFT_AGE_MS) {
        // Expired draft
        localStorage.removeItem(storageKey);
        return null;
      }

      return parsed;
    } catch (err) {
      console.warn('[useFormDraft] Error loading draft:', err);
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('[useFormDraft] Error clearing draft:', err);
    }
  }, [storageKey]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
  };
}
