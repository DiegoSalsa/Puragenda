import { describe, expect, it } from "vitest";
import { quoteCommercialBenefit } from "@/core/commercial-benefits";
import { billingPeriodEnd, changeTiming, v2Quote } from "@/core/commercial-billing-policy";
describe("Audit05 approved single-month commercial benefit policy",()=>{
  for(const plan of ["PURAGENDA","PURAGENDA_PLUS"] as const) for(const professionalTotal of [1,5]) for(const billingCycle of ["MONTHLY","ANNUAL"] as const) {
    it.each([10,15,20,25,30,50])(`${plan} ${professionalTotal} ${billingCycle} applies %i%% to exactly one final month`,percentage=>{
      const selection={plan,professionalTotal,billingCycle},q=quoteCommercialBenefit(selection,{percentage});
      const monthly=v2Quote({...selection,billingCycle:"MONTHLY"}).cycleTotal;
      expect(q.credit).toBe(monthly-Math.round(monthly*(1-percentage/100)));
      expect(q.amountDue).toBe(v2Quote(selection).cycleTotal-q.credit);
      expect(q.providerValidated).toBe(false);expect(q.vatIncluded).toBe(true);
    });
  }
  it.each([1,3])("preserves %i free months without inventing a $10 payment",freeMonths=>{
    const q=quoteCommercialBenefit({plan:"PURAGENDA",professionalTotal:1,billingCycle:"MONTHLY"},{freeMonths});
    expect(q.amountDue).toBe(0);expect(q.unappliedCredit).toBe((freeMonths-1)*12990);
  });
  it.each(["MONTHLY","ANNUAL"] as const)("keeps %s cycle transitions blocked pending provider validation",billingCycle=>{
    expect(()=>changeTiming({plan:"PURAGENDA",professionalTotal:1,billingCycle},{plan:"PURAGENDA",professionalTotal:1,billingCycle:billingCycle==="MONTHLY"?"ANNUAL":"MONTHLY"})).toThrow("BILLING_CYCLE_CHANGE_REQUIRES_RENEWAL");
  });
  it.each([["2024-01-31","MONTHLY","2024-02-29"],["2023-01-31","MONTHLY","2023-02-28"],["2024-02-29","ANNUAL","2025-02-28"],["2026-03-30","MONTHLY","2026-04-30"],["2026-08-31","MONTHLY","2026-09-30"]] as const)("preserves calendar boundary %s %s",(start,cycle,end)=>{
    expect(billingPeriodEnd(new Date(`${start}T12:00:00Z`),cycle).toISOString()).toBe(`${end}T12:00:00.000Z`);
  });
});
