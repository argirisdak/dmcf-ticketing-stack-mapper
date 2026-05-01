import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { OrganisationSelectionProvider } from './context/OrganisationSelectionContext.jsx'
import { SystemSelectionProvider } from './context/SystemSelectionContext.jsx'
import OrganisationListPage from './pages/OrganisationListPage.jsx'
import OrganisationDetailPage from './pages/OrganisationDetailPage.jsx'
import OrganisationFormPage from './pages/OrganisationFormPage.jsx'
import ComparePage from './pages/ComparePage.jsx'
import SystemListPage from './pages/SystemListPage.jsx'
import SystemDetailPage from './pages/SystemDetailPage.jsx'
import SystemFormPage from './pages/SystemFormPage.jsx'
import { SystemCompareStubPage } from './pages/SystemRouteStubs.jsx'

function NavLinks() {
  const { pathname } = useLocation()
  const orgsActive =
    pathname.startsWith('/organisations') || pathname.startsWith('/compare/organisations')
  const sysActive =
    pathname.startsWith('/systems') || pathname.startsWith('/compare/systems')

  const cls = (active) =>
    `text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
      active ? 'text-white font-medium' : 'text-slate-400 hover:text-white'
    }`

  return (
    <div className="flex items-center gap-6">
      <Link to="/organisations" className={cls(orgsActive)}>
        Organisations
      </Link>
      <Link to="/systems" className={cls(sysActive)}>
        Systems
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <span className="text-white font-semibold text-sm">
                DMCF Stack Mapper
              </span>
              <NavLinks />
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <OrganisationSelectionProvider>
            <SystemSelectionProvider>
              <Routes>
                <Route path="/" element={<Navigate to="/organisations" replace />} />
                <Route path="/organisations" element={<OrganisationListPage />} />
                <Route path="/organisations/new" element={<OrganisationFormPage />} />
                <Route path="/organisations/:id" element={<OrganisationDetailPage />} />
                <Route path="/organisations/:id/edit" element={<OrganisationFormPage />} />
                <Route path="/systems" element={<SystemListPage />} />
                <Route path="/systems/new" element={<SystemFormPage />} />
                <Route path="/systems/:id" element={<SystemDetailPage />} />
                <Route path="/systems/:id/edit" element={<SystemFormPage />} />
                <Route path="/compare/systems" element={<SystemCompareStubPage />} />
                <Route path="/compare/organisations" element={<ComparePage />} />
                <Route path="/compare" element={<ComparePage />} />
              </Routes>
            </SystemSelectionProvider>
          </OrganisationSelectionProvider>
        </main>
      </div>
    </BrowserRouter>
  )
}
