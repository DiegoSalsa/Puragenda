import { prisma } from "@/server/db/prisma";

interface LogCriticalErrorParams {
  source: string;
  message: string;
  stack?: string;
  userId?: string;
  details?: Record<string, any>;
}

export async function logCriticalError({
  source,
  message,
  stack,
  userId,
  details,
}: LogCriticalErrorParams) {
  try {
    // 1. Guardar el error en la base de datos (HistÃ³rico)
    await prisma.systemError.create({
      data: {
        source,
        message,
        stack,
        userId,
        details: details ? JSON.stringify(details) : null,
      },
    });

    // 2. Disparar webhook a Discord (Si existe)
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const embed = {
        title: "ðŸš¨ Error CrÃ­tico en Puragenda",
        color: 0xff0000, // Rojo Fuego
        fields: [
          { name: "Fuente", value: source, inline: true },
          { name: "Usuario", value: userId || "N/A", inline: true },
          { name: "Mensaje", value: message },
        ],
        timestamp: new Date().toISOString(),
      };

      // Si hay detalles extra (ej: req payload), aÃ±adir un bloque de cÃ³digo
      if (details) {
        embed.fields.push({
          name: "Detalles",
          value: "`json\n" + JSON.stringify(details, null, 2).substring(0, 1000) + "\n`",
        });
      }

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }
  } catch (error) {
    // Si el propio logger falla (muy raro), al menos tiramos un console
    console.error("Fallo crÃ­tico en el Error Logger:", error);
  }
}