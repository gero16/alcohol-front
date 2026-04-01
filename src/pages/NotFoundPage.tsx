import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="page-narrow">
      <h1 className="page-narrow__title">Página no encontrada</h1>
      <p className="page-narrow__text">La ruta que buscas no existe o ha cambiado.</p>
      <Link to="/" className="page-narrow__back">
        Ir al inicio
      </Link>
    </div>
  );
}
