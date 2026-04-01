import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AdminLayout from "./components/admin/AdminLayout";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import GlossaryPage from "./pages/GlossaryPage";
import ResponsiblePage from "./pages/ResponsiblePage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminHomePage from "./pages/admin/AdminHomePage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminGuidesPage from "./pages/admin/AdminGuidesPage";
import AdminGlossaryPage from "./pages/admin/AdminGlossaryPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="categorias" element={<AdminCategoriesPage />} />
          <Route path="guias" element={<AdminGuidesPage />} />
          <Route path="glosario" element={<AdminGlossaryPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="glosario" element={<GlossaryPage />} />
          <Route path="categoria/:id" element={<CategoryPage />} />
          <Route path="categoria/:id/:subId" element={<CategoryPage />} />
          <Route path="consumo-responsable" element={<ResponsiblePage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
