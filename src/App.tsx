// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import { RoleGuard } from './components/RoleGuard';

// Pages
import History from './pages/dashboard/History';
import ShopHistory from './pages/dashboard/ShopHistory';
// SuperAdmin Pages
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperShopManagement from './pages/superadmin/SuperShopManagement';
import SuperDashboard from './pages/superadmin/SuperDashboard';
import SuperAuditLogs from './pages/superadmin/SuperAuditLogs'; // [ใหม่]
import ManageLottoTemplates from './pages/superadmin/ManageLottoTemplates';
import ManageRates from './pages/admin/ManageRates';

// Admin Pages
import AdminLayout from './layouts/AdminLayout';
import ShopManagement from './pages/admin/ShopManagement'; 
import ManageResults from './pages/admin/ManageResults';
import Dashboard from './pages/admin/Dashboard';
// import ManageLottos from './pages/admin/ManageLottos';

// member Pages
import MemberLayout from './layouts/MemberLayout';
import LottoMarket from './pages/member/LottoMarket';
import BettingRoom from './pages/member/BettingRoom';
import MemberResults from './pages/member/MemberResults';

import { Toaster } from 'react-hot-toast';

const RedirectBasedOnRole = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Checking...</div>;
  if (!user) return <Navigate to="/login" />;

  switch (user.role) {
    case 'superadmin': return <Navigate to="/super/shops" />;
    case 'admin': return <Navigate to="/admin/dashboard" />;
    case 'member': return <Navigate to="/play" />;
    default: return <div>Unknown Role</div>;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* [2] วาง Toaster ไว้ตรงนี้ (ปรับแต่งสีสันได้ตามใจชอบ) */}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
            },
            success: {
              style: { background: '#10B981', color: 'white' }, // สีเขียว
            },
            error: {
              style: { background: '#EF4444', color: 'white' }, // สีแดง
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<h1>ไม่มีสิทธิ์ครับ</h1>} />

          {/* SuperAdmin Zone */}
          <Route element={<RoleGuard allowedRoles={['superadmin']} />}>
            <Route path="/super" element={<SuperAdminLayout />}>
              <Route path="dashboard" element={<SuperDashboard />} /> 
              <Route path="shops" element={<SuperShopManagement />} />
              <Route path="audit" element={<SuperAuditLogs />} />
              {/* ✅ ใช้ไฟล์ Templates สำหรับ Super Admin */}
              <Route path="lottos" element={<ManageLottoTemplates />} /> 
              
              {/* ✅ ใช้ ManageRates เดิมได้เลย (เป็นการสร้าง Master Rate) */}
              <Route path="rates" element={<ManageRates />} />
            </Route>
          </Route>

          {/* --- Admin Zone --- */}
          <Route element={<RoleGuard allowedRoles={['superadmin', 'admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* [เปลี่ยน] รวมการจัดการสมาชิก/เรท/หวย ไว้ที่ /shop */}
              <Route path="shop" element={<ShopManagement />} /> 
              
              {/* <Route path="lottos" element={<ManageLottos />} />  เก็บไว้เรียกใช้เป็นทางลัดทีหลัง*/}
              
              
              {/* เมนูเสริม */}
              <Route path="history" element={<ShopHistory />} />
              <Route path="results" element={<ManageResults />} />
            </Route>
          </Route>

          {/* Member Zone */}
          <Route element={<RoleGuard allowedRoles={['member', 'admin', 'superadmin']} />}>
            <Route element={<MemberLayout />}> {/* ใช้ Layout ใหม่เป็น Parent */}
              <Route path="play" element={<LottoMarket />} /> {/* หน้าแรก: เลือกหวย */}
              <Route path="play/:id" element={<BettingRoom />} /> {/* หน้าแทง: ใส่เลข */}
              <Route path="history" element={<History />} />
              <Route path="results" element={<MemberResults />} />
            </Route>
          </Route>

          <Route path="/" element={<RedirectBasedOnRole />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;