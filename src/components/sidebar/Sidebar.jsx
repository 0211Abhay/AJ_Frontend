import React from 'react';
import {
    FaUsers,
    FaHome,
    FaCalendarAlt,
    FaUserCog,
    FaBuilding
} from 'react-icons/fa';
import '../../style/Sidebar.css';

const Sidebar = ({ activeSection, onNavigate }) => {
    const sections = [
        { name: 'clients', icon: <FaUsers /> },
        { name: 'properties', icon: <FaBuilding /> },
        { name: 'rental', icon: <FaHome /> },
        { name: 'schedule', icon: <FaCalendarAlt /> },
        { name: 'profile', icon: <FaUserCog /> }
    ];

    return (
        <aside className="sidebar">
            <div className="section-container">
                {sections.map(({ name, icon }) => (
                    <button
                        key={name}
                        className={`nav-item ${activeSection === name ? 'active' : ''}`}
                        onClick={() => onNavigate(name)}
                    >
                        <span className="nav-icon">{icon}</span>
                        <span className="nav-text">
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                        </span>
                    </button>
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;