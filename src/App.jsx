import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/navbar/Navbar';
import Footer from './components/footer/Footer';
import Home from './pages/Home';
import About from './pages/Aboutus';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Header from './components/header/Header';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const FullLayout = ({ children }) => (
  <div className="app-container">
    <Navbar />
    <main className="main-content">{children}</main>
    <Footer />
  </div>
);

const HeaderOnlyLayout = ({ children }) => (
  <div className="app-container">
    <Navbar />
    <main className="main-content">{children}</main>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<FullLayout><Home /></FullLayout>} />
          <Route path="/about" element={<FullLayout><About /></FullLayout>} />
          <Route path="/login" element={<HeaderOnlyLayout><Login /></HeaderOnlyLayout>} />
          <Route path="/signup" element={<HeaderOnlyLayout><SignUp /></HeaderOnlyLayout>} />
          {/* Use a wildcard route for dashboard to handle all dashboard paths */}
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/forgot-password" element={<HeaderOnlyLayout><ForgotPassword /></HeaderOnlyLayout>} />
          <Route path="/reset-password/:token" element={<HeaderOnlyLayout><ResetPassword /></HeaderOnlyLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
