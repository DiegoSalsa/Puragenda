import { z } from "zod";

export const createPosQrPaymentSchema = z.object({
  appointmentId: z.string().cuid(),
});
