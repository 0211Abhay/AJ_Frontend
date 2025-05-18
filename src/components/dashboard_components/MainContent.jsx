import React from 'react';
import Clients from './Clients';
import Properties from './Properties';
import Rental from "./Rental";
import Schedule from './Schedule';
import Profile from './Profile';
import "../../style/Maincontent.css";

const MainContent = ({ activeSection }) => {
    const renderComponent = () => {
        switch (activeSection) {
            case 'clients':
                return <Clients />;
            case 'properties':
                return <Properties />;
            case 'rental':
                return <Rental />;
            case 'schedule':
                return <Schedule />;
            case 'profile':
                return <Profile />;
            default:
                return <Clients />;
        }
    };

    return (
        <main className="main-content">
            <div className="content-body">
                {renderComponent()}
            </div>
        </main>
    );
};

export default MainContent;
