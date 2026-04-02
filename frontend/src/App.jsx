import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { SelectionProvider } from './context/SelectionContext.jsx'
import OrganisationListPage from './pages/OrganisationListPage.jsx'
import OrganisationDetailPage from './pages/OrganisationDetailPage.jsx'
import OrganisationFormPage from './pages/OrganisationFormPage.jsx'
import ComparePage from './pages/ComparePage.jsx'

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
              <NavLink
                to="/organisations"
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-white font-medium' : 'text-slate-300 hover:text-white'}`
                }
              >
                Organisations
              </NavLink>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SelectionProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/organisations" replace />} />
              <Route path="/organisations" element={<OrganisationListPage />} />
              <Route path="/organisations/new" element={<OrganisationFormPage />} />
              <Route path="/organisations/:id" element={<OrganisationDetailPage />} />
              <Route path="/organisations/:id/edit" element={<OrganisationFormPage />} />
              <Route path="/compare" element={<ComparePage />} />
            </Routes>
          </SelectionProvider>
        </main>
      </div>
    </BrowserRouter>
  )
}
