/** Display only: preserve historical payment identifiers in storage. */
export function paymentOperationLabel(paymentId?: string): string {
  const value = paymentId?.trim() || '';
  return !value || /^MP-/i.test(value)
    ? 'Sin operación de Mercado Pago confirmada'
    : value;
}
