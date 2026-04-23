import { prisma } from "@/backend/db/prisma";
import {
  getFirstBusinessByOwnerId,
} from "@/backend/services/business.service";
import { getAppointments } from "@/backend/services/appointment.service";
import { getCurrentSessionUser } from "@/backend/auth/user-session";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table";
import { Badge } from "@/frontend/components/ui/badge";
import { AppointmentActions } from "./appointment-actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Debes iniciar sesion para acceder al dashboard
      </div>
    );
  }

  const business = await getFirstBusinessByOwnerId(user.id);

  if (!business) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No tienes un negocio configurado aun
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = await getAppointments(business.id, {
    from: today,
    to: tomorrow,
  });

  const allAppointments = await getAppointments(business.id);

  const totalServices = await prisma.service.count({
    where: { businessId: business.id },
  });

  const pendingCount = allAppointments.filter(
    (a) => a.status === "PENDING"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen de citas para{" "}
          <span className="text-violet-300 font-medium">{business.name}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Citas Hoy
            </CardTitle>
            <Calendar className="w-4 h-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(today, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
            <Clock className="w-4 h-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Citas por confirmar
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Servicios
            </CardTitle>
            <Users className="w-4 h-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Servicios activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Todas las Citas</CardTitle>
        </CardHeader>
        <CardContent>
          {allAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No hay citas registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Servicio</TableHead>
                  <TableHead className="text-muted-foreground">Fecha y Hora</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAppointments.map((appointment) => (
                  <TableRow
                    key={appointment.id}
                    className="border-border/50 hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">
                      {appointment.customerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {appointment.customerEmail}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-violet-400/35 bg-violet-700/25 text-xs font-medium text-white">
                        {appointment.service.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(
                        new Date(appointment.startTime),
                        "dd/MM/yyyy HH:mm",
                        { locale: es }
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          appointment.status === "CONFIRMED"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          appointment.status === "CONFIRMED"
                            ? "border-violet-400/40 bg-violet-700/25 text-white hover:bg-violet-700/35"
                            : "border-white/30 bg-background/80 text-white hover:bg-white/10"
                        }
                      >
                        {appointment.status === "CONFIRMED"
                          ? "Confirmada"
                          : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AppointmentActions
                        id={appointment.id}
                        currentStatus={appointment.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
