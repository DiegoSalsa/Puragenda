type DateValue = Date | string | null;

export type SubscriptionEndDateInput = {
  isTrial: boolean;
  trialEndsAt: DateValue;
  currentPeriodEnd: DateValue;
  mpSubscriptionId: string | null;
  paddleSubscriptionId: string | null;
};

function validDate(value: DateValue) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveSubscriptionEndDate(subscription: SubscriptionEndDateInput | null) {
  if (!subscription) {
    return { date: null, context: "Sin suscripción" } as const;
  }

  const hasPaymentProvider = Boolean(
    subscription.mpSubscriptionId || subscription.paddleSubscriptionId,
  );
  const currentPeriodEnd = validDate(subscription.currentPeriodEnd);

  if (currentPeriodEnd) {
    return {
      date: currentPeriodEnd,
      context: "Fin del período pagado",
    } as const;
  }

  if (subscription.isTrial && !hasPaymentProvider) {
    return {
      date: validDate(subscription.trialEndsAt),
      context: "Fin de prueba",
    } as const;
  }

  return {
    date: null,
    context: hasPaymentProvider
      ? "Pendiente de sincronizar"
      : "Sin fecha registrada",
  } as const;
}
