import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AdminDashboard from '../modules/admin/AdminDashboard.jsx'
import AuditPage from '../modules/admin/AuditPage.jsx'
import CategoriesPage from '../modules/admin/CategoriesPage.jsx'
import CompaniesAdminPage from '../modules/admin/CompaniesAdminPage.jsx'
import MatchConfigPage from '../modules/admin/MatchConfigPage.jsx'
import OpportunitiesAdminPage from '../modules/admin/OpportunitiesAdminPage.jsx'
import CompanyProfilePage from '../modules/companies/CompanyProfilePage.jsx'
import MyOpportunitiesPage from '../modules/companies/MyOpportunitiesPage.jsx'
import RecommendedPage from '../modules/professionals/RecommendedPage.jsx'
import NotificationsPage from '../pages/NotificationsPage.jsx'
import MapPage from '../modules/territorial/MapPage.jsx'
import MyInterestsPage from '../modules/professionals/MyInterestsPage.jsx'
import Opportunities from '../pages/Opportunities.jsx'
import OpportunityDetail from '../pages/OpportunityDetail.jsx'
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

function OpportunitiesPanel() {
  const { user } = useAuth()
  return isStaff(user.role) ? <OpportunitiesAdminPage /> : <MyOpportunitiesPage />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="profissionais" element={<Catalog />} />
        <Route path="profissionais/:slug" element={<ProfessionalPublic />} />
        <Route path="oportunidades" element={<Opportunities />} />
        <Route path="oportunidades/:id" element={<OpportunityDetail />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
      </Route>
      <Route path="painel" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<PanelHome />} />
        <Route path="meu-perfil" element={<RequireAuth roles={['PROFISSIONAL']}><MyProfilePage /></RequireAuth>} />
        <Route path="profissionais" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN', 'MODERADOR']}><ProfessionalsPage /></RequireAuth>} />
        <Route path="solicitacoes" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN']}><DataRequestsPage /></RequireAuth>} />
        <Route path="recomendadas" element={<RequireAuth roles={['PROFISSIONAL']}><RecommendedPage /></RequireAuth>} />
        <Route path="conecta" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN', 'MODERADOR']}><MatchConfigPage /></RequireAuth>} />
        <Route path="mapa" element={<MapPage />} />
        <Route path="notificacoes" element={<NotificationsPage />} />
        <Route path="empresa" element={<RequireAuth roles={['EMPRESA']}><CompanyProfilePage /></RequireAuth>} />
        <Route path="oportunidades" element={<RequireAuth roles={['EMPRESA', 'SUPERADMIN', 'ADMIN', 'MODERADOR']}><OpportunitiesPanel /></RequireAuth>} />
        <Route path="interesses" element={<RequireAuth roles={['PROFISSIONAL']}><MyInterestsPage /></RequireAuth>} />
        <Route path="empresas" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN']}><CompaniesAdminPage /></RequireAuth>} />
        <Route path="usuarios" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN', 'MODERADOR']}><UsersPage /></RequireAuth>} />
        <Route path="categorias" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN']}><CategoriesPage /></RequireAuth>} />
        <Route path="auditoria" element={<RequireAuth roles={['SUPERADMIN', 'ADMIN']}><AuditPage /></RequireAuth>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
