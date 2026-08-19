export interface PricingCalculationParams {
  medicationItems?: Array<{ nombreComercial?: string; [key: string]: any }>;
  medicationPhotos?: Array<{ url?: string; [key: string]: any }>;
  obraSocial?: string;
  paymentMethod?: string;
  userRole?: string;
  customAmount?: string | number;
  basePricePerPrescription?: number;
}

export interface PricingResult {
  amount: number;
  amountFormatted: string;
  prescriptionCount: number;
  isExempt: boolean;
  itemCount: number;
  pricePerPrescription: number;
  breakdown: string;
}

export class PricingService {
  public static readonly BASE_PRICE_PER_PRESCRIPTION = 10000;
  public static readonly MEDICATIONS_PER_PRESCRIPTION = 2;

  /**
   * Calcula el arancel oficial de una solicitud de recetas médicas de acuerdo a
   * la cantidad de medicamentos/fotos, obra social y rol del emisor.
   */
  public static calculatePrice(params: PricingCalculationParams): PricingResult {
    const rawItemsCount = params.medicationItems?.length || 0;
    const rawPhotosCount = params.medicationPhotos?.length || 0;
    const totalCount = (rawItemsCount + rawPhotosCount) > 0 ? (rawItemsCount + rawPhotosCount) : 1;

    const prescriptionCount = Math.max(1, Math.ceil(totalCount / this.MEDICATIONS_PER_PRESCRIPTION));
    const basePrice = params.basePricePerPrescription ?? this.BASE_PRICE_PER_PRESCRIPTION;

    // Reglas de exención / bonificación
    const isPami = params.obraSocial?.trim() === 'PAMI (Inssjp)';
    const isBonificado = params.paymentMethod === 'bonificado';
    const isExempt = isPami || isBonificado;

    // Si es personal médico/administrativo y especificó un arancel explícito o bonificado
    const isStaff = params.userRole && ['medico', 'colaborador', 'admin'].includes(params.userRole);
    if (isStaff && params.customAmount !== undefined && params.customAmount !== null && String(params.customAmount).trim() !== '') {
      const parsedCustom = Number(params.customAmount);
      if (!isNaN(parsedCustom) && parsedCustom >= 0) {
        const isCustomZero = parsedCustom === 0;
        return {
          amount: parsedCustom,
          amountFormatted: parsedCustom.toString(),
          prescriptionCount,
          isExempt: isCustomZero || isExempt,
          itemCount: totalCount,
          pricePerPrescription: basePrice,
          breakdown: isCustomZero ? 'Arancel bonificado por personal de salud' : `Arancel fijado manualmente ($${parsedCustom.toLocaleString('es-AR')})`,
        };
      }
    }

    if (isExempt) {
      return {
        amount: 0,
        amountFormatted: '0',
        prescriptionCount,
        isExempt: true,
        itemCount: totalCount,
        pricePerPrescription: basePrice,
        breakdown: isPami ? 'Arancel exento por obra social PAMI' : 'Arancel bonificado',
      };
    }

    const calculatedAmount = prescriptionCount * basePrice;

    return {
      amount: calculatedAmount,
      amountFormatted: calculatedAmount.toString(),
      prescriptionCount,
      isExempt: false,
      itemCount: totalCount,
      pricePerPrescription: basePrice,
      breakdown: `${prescriptionCount} receta(s) x $${basePrice.toLocaleString('es-AR')}`,
    };
  }
}
