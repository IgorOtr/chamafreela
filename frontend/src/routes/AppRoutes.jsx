import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AdminDashboard from '../modules/admin/AdminDashboard.jsx'
import AuditPage from '../modules/admin/AuditPage.jsx'
import CategoriesPage from '../modules/admin/CategoriesPage.jsx'
import DataRequestsPage from '../modules/admin/DataRequestsPage.jsx'
import ProfessionalsPage from '../modules/admin/ProfessionalsPage.jsx'
import UsersPage from '../modules/admin/UsersPage.jsx'
import LoginPage from '../modules/auth/LoginPage.jsx'
import RegisterPage from '../modules/auth/RegisterPage.jsx'
import MyProfilePage from '../modules/professionals/MyProfilePage.jsx'
import Catalog from '../pages/Catalog.jsx'
import ProfessionalPublic from '../pages/ProfessionalPublic.jsx'
import Home from '../pages/Home.jsx'
import MemberDashboard from '../pages/MemberDashboard.jsx'
import NotFound from '../pages/NotFound.jsx'
import { isStaff } from '../utils/roles.js'

function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/entrar" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/painel" replace />
  return children
}

function PanelHome() {
  const { user } = useAuth()
  return isStaff(user.role) ? <AdminDashboard /> : <MemberDashboard />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="profissionais" element={<Catalog />} />
        <Route path="profissionais/:slug" element={<ProfessionalPublic />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
      </Route>
      <Route path="painel" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<PanelHome />} />
        <Route path="meu-perfil" element={<RequireAuth roles={['PROFISSIONAL']}><MyProfilePage /></RequireAuth>} />
        <Route path="profissionais" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN', 'MODERADOR']}><ProfessionalsPage /></RequireAuth>} />
        <Route path="solicitacoes" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN']}><DataRequestsPage /></RequireAuth>} />
        <Route path="usuarios" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN', 'MODERADOR']}><UsersPage /></RequireAuth>} />
        <Route path="categorias" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN']}><CategoriesPage /></RequireAuth>} />
        <Route path="auditoria" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN']}><AuditPage /></RequireAuth>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
