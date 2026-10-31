import { v2Quote } from "./commercial-billing-policy";
import type { CommercialSelection } from "./commercial-selection";

export type CommercialBenefit = {percentage:number} | {freeMonths:number};
/** Business rule approved for Audit05: a percentage affects ONE final monthly
 * price, even on an annual invoice. Annual service still pays ten months.
 * Round the discounted monthly price to CLP before subtracting the credit. */
export function quoteCommercialBenefit(selection:CommercialSelection,benefit:CommercialBenefit) {
  const quote=v2Quote(selection),monthly=v2Quote({...selection,billingCycle:"MONTHLY"}).cycleTotal;
  let credit:number;
  if("percentage" in benefit) {
    if(!Number.isInteger(benefit.percentage)||benefit.percentage<1||benefit.percentage>100) throw new Error("INVALID_BENEFIT_PERCENTAGE");
    credit=monthly-Math.round(monthly*(1-benefit.percentage/100));
  } else {
    if(!Number.isInteger(benefit.freeMonths)||![1,3].includes(benefit.freeMonths)) throw new Error("INVALID_FREE_MONTH_BENEFIT");
    credit=monthly*benefit.freeMonths;
  }
  // Multiple monthly courtesy periods cannot be represented by a $10 charge
  // or by inventing a negative invoice. The unused months remain reserved.
  const appliedCredit=Math.min(credit,quote.cycleTotal);
  return {selection,quote,monthlyTotal:monthly,cycleTotal:quote.cycleTotal,credit:appliedCredit,
    amountDue:quote.cycleTotal-appliedCredit,unappliedCredit:credit-appliedCredit,benefit,vatIncluded:true,
    application:"NEXT_CONFIRMED_BILLING" as const,providerValidated:false as const};
}
