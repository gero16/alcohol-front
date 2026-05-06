import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AdminLayout from "./components/admin/AdminLayout";
import "./App.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const GlossaryPage = lazy(() => import("./pages/GlossaryPage"));
const ResponsiblePage = lazy(() => import("./pages/ResponsiblePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AdminHomePage = lazy(() => import("./pages/admin/AdminHomePage"));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage"));
const AdminGuidesPage = lazy(() => import("./pages/admin/AdminGuidesPage"));
const AdminGlossaryPage = lazy(() => import("./pages/admin/AdminGlossaryPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));

function RouteFallback() {
  return <p className="status-message">Cargando…</p>;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="categorias" element={<AdminCategoriesPage />} />
            <Route path="guias" element={<AdminGuidesPage />} />
            <Route path="glosario" element={<AdminGlossaryPage />} />
            <Route path="productos" element={<AdminProductsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="glosario" element={<GlossaryPage />} />
            <Route path="categoria/:id" element={<CategoryPage />} />
            <Route path="categoria/:id/:subId" element={<CategoryPage />} />
            <Route path="consumo-responsable" element={<ResponsiblePage />} />
            <Route path="404" element={<NotFoundPage />} />
            {/* Rutas cortas alineadas con el slug de categoría (/cerveza, /destilados, …) */}
            <Route path=":id/:subId" element={<CategoryPage />} />
            <Route path=":id" element={<CategoryPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
