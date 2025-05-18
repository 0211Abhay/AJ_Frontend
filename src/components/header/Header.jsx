import { House } from 'lucide-react';
import './Header.css';

const Header = ({ activeSection, onNavigate }) => {
    const navItems = ['clients', 'properties', 'rental', 'schedule', 'profile'];

    return (
        <header className="header">
            <div className="logo-container">
                <House className="logo-icon" />
                <span className="logo-text">RealEstate Pro</span>
            </div>
            <nav className="nav-menu">
                {navItems.map((item) => (
                    <button
                        key={item}
                        className={`nav-item ${activeSection === item ? 'active' : ''}`}
                        onClick={() => onNavigate(item)}
                    >
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                    </button>
                ))}
            </nav>
        </header>
    );
};

export default Header;