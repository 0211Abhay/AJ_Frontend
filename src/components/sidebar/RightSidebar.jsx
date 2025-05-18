import React from 'react';
import '../../style/RightSidebar.css';

const RightSidebar = ({ activeSection }) => {
    const filtersBySection = {
        clients: [
            { name: 'Status', options: ['Active', 'Inactive', 'Pending'] },
            { name: 'Type', options: ['Buyer', 'Seller', 'Both'] },
            { name: 'Priority', options: ['High', 'Medium', 'Low'] }
        ],
        properties: [
            { name: 'Type', options: ['House', 'Apartment', 'Commercial'] },
            { name: 'Status', options: ['For Sale', 'Sold', 'Pending'] },
            { name: 'Price Range', options: ['0-100k', '100k-500k', '500k+'] }
        ],
        rental: [
            { name: 'Property Type', options: ['Residential', 'Commercial'] },
            { name: 'Duration', options: ['Short-term', 'Long-term'] },
            { name: 'Status', options: ['Available', 'Rented', 'Maintenance'] }
        ],
        schedule: [
            { name: 'Event Type', options: ['Viewing', 'Meeting', 'Call'] },
            { name: 'Time', options: ['Today', 'This Week', 'This Month'] },
            { name: 'Priority', options: ['High', 'Medium', 'Low'] }
        ],
        profile: [
            { name: 'Settings', options: ['Personal', 'Business', 'Notifications'] },
            { name: 'Privacy', options: ['Public', 'Private'] },
            { name: 'Theme', options: ['Light', 'Dark'] }
        ]
    };

    const filters = filtersBySection[activeSection] || [];

    return (
        <aside className="right-sidebar">
            {/* <h2 className="sidebar-title">Filters</h2> */}
            {filters.map((filter, index) => (
                <div key={index} className="filter-group">
                    <h3 className="filter-title">{filter.name}</h3>
                    <div className="filter-options">
                        {filter.options.map((option, optionIndex) => (
                            <label key={optionIndex} className="filter-option">
                                <input type="checkbox" className="filter-checkbox" />
                                <span className="filter-label">{option}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </aside>
    );
};

export default RightSidebar;
