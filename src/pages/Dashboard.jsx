import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/navbar/Navbar';
import Sidebar from '../components/sidebar/Sidebar';
import RightSidebar from '../components/sidebar/RightSidebar';
import MainContent from "../components/dashboard_components/MainContent";
import "../style/Dashboard.css";
import withSessionCheck from '../components/SessionCheck';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { broker } = useAuth();
    
    // Extract the current section from the URL path
    const getCurrentSectionFromPath = () => {
        const path = location.pathname;
        const section = path.split('/').filter(Boolean)[1]; // Get the section after /dashboard/
        return section || 'clients'; // Default to 'clients' if no section is found
    };
    
    const [activeSection, setActiveSection] = useState(getCurrentSectionFromPath());
    
    // Update the active section when the URL changes
    useEffect(() => {
        const currentSection = getCurrentSectionFromPath();
        setActiveSection(currentSection);
        
        // If we're at /dashboard with no section, redirect to the active section
        if (location.pathname === '/dashboard') {
            navigate(`/dashboard/${currentSection}`);
        }
    }, [location.pathname, navigate]);

    const handleNavigation = (section) => {
        setActiveSection(section);
        navigate(`/dashboard/${section}`);
    };

    return (
        <div className="dashboard-container">
            <h1>Welcome, {broker.name}!</h1>
            <div className="dashboard">
                <Header activeSection={activeSection} onNavigate={handleNavigation} />
                <div className="dashboard-content">
                    {/* <Sidebar activeSection={activeSection} onNavigate={handleNavigation} /> */}
                    <MainContent activeSection={activeSection} />

                </div>
            </div>
        </div>
    );
};

// Wrap Dashboard with session check and require authentication
export default withSessionCheck(Dashboard, true);