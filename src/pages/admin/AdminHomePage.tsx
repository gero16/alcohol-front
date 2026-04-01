import { Link } from "react-router-dom";

const adminSections = [
  {
    title: "Categorías",
    text: "Crear, editar, ordenar y eliminar las categorias principales que se muestran en el sitio.",
    to: "/admin/categorias",
    cta: "Administrar categorias",
  },
  {
    title: "Guías",
    text: "Editar la estructura completa de cada guia: tabs, secciones, tablas, filas y notas.",
    to: "/admin/guias",
    cta: "Editar guias",
  },
];

export default function AdminHomePage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <p className="hero__eyebrow">Panel administrativo</p>
        <h1 className="hero__title">Gestion de bebidas</h1>
        <p className="hero__lead">
          Usa este panel para mantener categorias y contenido sin tocar manualmente el JSON o el
          frontend publico.
        </p>
      </header>

      <div className="admin-dashboard">
        {adminSections.map((section) => (
          <article key={section.to} className="admin-card">
            <h2 className="admin-card__title">{section.title}</h2>
            <p className="admin-card__text">{section.text}</p>
            <Link to={section.to} className="admin-card__link">
              {section.cta}
            </Link>
          </article>
        ))}
      </div>

      <aside className="admin-note">
        <h2 className="admin-note__title">Siguiente paso recomendado</h2>
        <p>
          Cuando el panel quede validado, la siguiente mejora natural es proteger estas rutas con una
          clave administrativa o autenticacion real antes de dejarlo expuesto en internet.
        </p>
      </aside>
    </section>
  );
}
