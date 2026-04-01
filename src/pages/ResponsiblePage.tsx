import { Link } from "react-router-dom";

export default function ResponsiblePage() {
  return (
    <article className="page-article">
      <Link to="/" className="detail__back">
        ← Inicio
      </Link>
      <header className="page-article__header">
        <h1 className="hero__title">Consumo responsable</h1>
        <p className="hero__lead">
          Información general orientativa. Consulta siempre fuentes oficiales y profesionales de salud.
        </p>
      </header>
      <div className="page-article__body">
        <p>
          El consumo de alcohol conlleva riesgos para la salud física y mental. La Organización
          Mundial de la Salud y muchas agencias nacionales publican límites de consumo o
          recomiendan el abstinencia en determinados casos.
        </p>
        <p>
          No se debe consumir alcohol en el embarazo, en menores de edad, ni cuando conduzcas u
          operes maquinaria. Si tomas medicación, pregunta a tu médico o farmacéutico sobre
          interacciones.
        </p>
        <p>
          Si sientes que pierdes el control sobre el consumo, busca ayuda en servicios de salud o
          líneas de apoyo de tu país o comunidad.
        </p>
      </div>
      <footer className="footer">
        <small>
          <Link to="/">Volver a la guía de categorías</Link>
        </small>
      </footer>
    </article>
  );
}
