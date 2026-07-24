import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5 mb-6">
              <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda Logo" className="h-12 w-auto scale-[1.3] origin-left" />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Plataforma de agendamiento inteligente para negocios que trabajan por reserva.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Producto</p>
            <nav className="flex flex-col gap-2">
              <Link href="/caracteristicas" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Características</Link>
              <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Precios</Link>
              <Link href="/guias" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Guías prácticas</Link>
              <Link href="/faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">FAQ</Link>
              <a href="/api/auth/demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Demo</a>
              <Link href="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Dashboard</Link>
            </nav>
          </div>

          {/* Casos de Uso */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Casos de Uso</p>
            <nav className="flex flex-col gap-2">
              <Link href="/para/peluquerias" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Para Peluquerías</Link>
              <Link href="/para/estetica" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Para Estética y Spa</Link>
              <Link href="/para/barberias" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Para Barberías</Link>
              <Link href="/para/clinicas" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Para Clínicas</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Empresa</p>
            <div className="flex flex-col gap-2">
              <Link href="/sobre-nosotros" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Sobre Nosotros</Link>
              <Link href="/contacto" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Contacto</Link>
              <a href="mailto:contacto@purocode.com" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                contacto@purocode.com
              </a>
              <a href="tel:+56949255006" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                +56 9 4925 5006
              </a>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Redes</p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/purocodecl?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:border-[#7C3AED]/30 hover:text-[#7C3AED]"
                aria-label="Ir al perfil de Instagram de PuroCode"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a
                href="https://wa.me/56949255006"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:border-[#25D366]/50 hover:text-[#25D366]"
                aria-label="Contáctanos por WhatsApp"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Legal</p>
            <nav className="flex flex-col gap-2">
              <Link href="/terminos-y-condiciones" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Términos y Condiciones</Link>
              <Link href="/politica-de-privacidad" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Política de Privacidad</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Puragenda by PuroCode. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
