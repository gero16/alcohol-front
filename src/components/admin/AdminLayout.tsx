import { NavLink, Outlet } from "react-router-dom";

const adminLinks = [
  { to: "/admin", label: "Resumen", end: true },
  { to: "/admin/categorias", label: "Categorías" },
  { to: "/admin/guias", label: "Guías" },
  { to: "/admin/glosario", label: "Glosario" },
  { to: "/admin/productos", label: "Productos" },
];

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink to="/admin" className="admin-sidebar__brand" end>
          Panel de control
        </NavLink>
        <p className="admin-sidebar__eyebrow">Administración interna</p>
        <nav className="admin-sidebar__nav" aria-label="Panel administrativo">
          {adminLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <NavLink to="/" className="admin-sidebar__back">
            Volver al sitio publico
          </NavLink>
        </div>
      </aside>

      <main className="admin-main">
        <aside className="admin-security-banner" role="note">
          <strong>Seguridad pendiente.</strong> Este panel usa rutas de escritura ya activas en la API,
          pero todavia no tiene autenticacion. No deberia exponerse publicamente sin una capa minima
          de proteccion.
        </aside>
        <Outlet />
      </main>
    </div>
  );
}
