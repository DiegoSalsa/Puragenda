import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { resend, EMAIL_FROM } from "@/server/email/resend";
import { reminderEmail } from "@/server/email/templates";

// ── Vercel Cron: runs daily at 14:00 UTC (10:00 AM Chile) ──
// Protected via CRON_SECRET to prevent unauthorized access.

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for large batches

export async function GET(req: Request) {
  // ── Auth: verify the request comes from Vercel Cron ──
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Calculate "tomorrow" in Chile timezone ──
    // We compute tomorrow's start/end in UTC by using Chile's offset.
    // Chile is UTC-4 (CLT) or UTC-3 (CLST). Using Intl to get the exact offset.
    const now = new Date();
    const chileTz = "America/Santiago";

    // Get the current date string in Chile timezone
    const chileFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: chileTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayChile = chileFormatter.format(now); // "YYYY-MM-DD"

    // Calculate tomorrow's date in Chile
    const todayDate = new Date(`${todayChile}T12:00:00`); // noon to avoid DST issues
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Build UTC boundaries for "tomorrow in Chile"
    // We query appointments whose startTime falls on tomorrow (Chile time).
    // Using a generous window: tomorrow 00:00 Chile → day after 00:00 Chile.
    // Chile is UTC-3 or UTC-4, so tomorrow 00:00 Chile = tomorrow 03:00-04:00 UTC.
    // Dynamically get Chile offset (handles CLT=-04:00 and CLST=-03:00 automatically)
    const offsetParts = new Intl.DateTimeFormat("en", { timeZone: chileTz, timeZoneName: "shortOffset" }).formatToParts(new Date(`${tomorrowStr}T12:00:00Z`));
    const tzPart = offsetParts.find(p => p.type === "timeZoneName")?.value || "GMT-4";
    const offsetMatch = tzPart.match(/GMT([+-]\d+)/);
    const offsetHours = offsetMatch ? parseInt(offsetMatch[1]) : -4;
    const offsetStr = `${offsetHours >= 0 ? "+" : ""}${String(Math.abs(offsetHours)).padStart(2, "0")}:00`;
    const tomorrowStartUTC = new Date(`${tomorrowStr}T00:00:00${offsetStr}`);
    const dayAfter = new Date(tomorrowStartUTC);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // ── Query appointments for tomorrow ──
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: tomorrowStartUTC,
          lt: dayAfter,
        },
        status: {
          notIn: ["CANCELLED", "CHECKED_IN", "COMPLETED", "NO_SHOW"],
        },
        reminderSent: false,
      },
      include: {
        service: { select: { name: true } },
        staff: { select: { name: true } },
        business: { select: { name: true } },
      },
    });

    if (appointments.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No hay citas para mañana que requieran recordatorio.",
        sent: 0,
      });
    }

    // ── Send reminders ──
    let sent = 0;
    const errors: string[] = [];

    for (const apt of appointments) {
      try {
        const email = reminderEmail({
          customerName: apt.customerName,
          serviceName: apt.service.name,
          staffName: apt.staff?.name || "Sin asignar",
          startTime: apt.startTime,
          endTime: apt.endTime,
          businessName: apt.business.name,
        });

        const { error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: apt.customerEmail,
          subject: email.subject,
          html: email.html,
        });

        if (error) {
          errors.push(`${apt.id}: ${JSON.stringify(error)}`);
          continue;
        }

        // Mark as sent to prevent duplicates
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { reminderSent: true },
        });

        sent++;
      } catch (err) {
        errors.push(`${apt.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Recordatorios enviados: ${sent}/${appointments.length}`,
      sent,
      total: appointments.length,
      ...(errors.length > 0 && { errors }),
    });
  } catch (err) {
    console.error("[Cron Reminders] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
