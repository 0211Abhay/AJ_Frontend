import React, { useState, useEffect } from 'react';
import "../../style/Properties.css";
import AddPropertyModel from './AddPropertyModel';
import { FaFileExport, FaPlus } from 'react-icons/fa';
import ExportProperties from '../ExportProperties';

const Properties = () => {
    // State management
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [filters, setFilters] = useState({
        type: 'all',
        category: 'all',
        priceMin: '',
        priceMax: '',
        bedrooms: 'any',
        bathrooms: 'any',
        status: 'all',
        area_min: '',
        area_max: '',
        year_built_min: '',
        year_built_max: '',
        featured: false,
        location: ''
    });
    const [sortOption, setSortOption] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [isViewingDetails, setIsViewingDetails] = useState(false);

    // Add state for filter options
    const [filterOptions, setFilterOptions] = useState({
        propertyTypes: [],
        propertyCategories: [],
        bedroomOptions: [],
        bathroomOptions: [],
        statusOptions: [],
        locations: []
    });

    // Add state for modals
    const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
    const [propertyToEdit, setPropertyToEdit] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    
    // Helper function to process property data from API response
    const processFetchedProperties = (data) => {
        // Check if data has the expected structure
        if (data && data.properties) {
            setProperties(data.properties);
            // Extract unique filter options from properties
            extractFilterOptions(data.properties);
        } else if (Array.isArray(data)) {
            // Handle case where response is an array directly
            // Map backend property fields to match frontend expected structure
            const mappedProperties = data.map(property => ({
                property_id: property.propertyId,
                name: property.name,
                location: property.location,
                price: property.price,
                property_for: property.propertyFor,
                property_type: property.propertyType,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                area: property.area,
                contact_agent: property.contactAgent,
                year_built: property.yearBuilt,
                status: property.status,
                description: property.description,
                amenities: property.amenities,
                created_at: property.createdAt,
                broker_id: property.broker?.brokerId
            }));
            
            setProperties(mappedProperties);
            // Extract unique filter options from properties
            extractFilterOptions(mappedProperties);
        } else {
            console.error('Unexpected data structure:', data);
            setProperties([]);
        }
    };

    // Fetch properties from API
    const fetchProperties = async () => {
        try {
            setLoading(true);
            
            // Get broker ID and authentication token from localStorage
            const brokerId = localStorage.getItem('brokerId');
            const token = localStorage.getItem('token');
            console.log('Using broker ID for properties:', brokerId);
            
            // Prepare headers with authentication token
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Ensure broker ID is available
            if (!brokerId) {
                console.warn('No broker ID found, falling back to all properties');
                // Use the Spring Boot API endpoint for getting all properties
                const fallbackResponse = await fetch('http://localhost:5001/api/properties', {
                    headers: headers
                });
                
                if (!fallbackResponse.ok) {
                    throw new Error('Failed to fetch properties');
                }
                
                const fallbackData = await fallbackResponse.json();
                processFetchedProperties(fallbackData);
                return;
            }
            
            // Use the Spring Boot broker-specific endpoint with the broker ID
            const response = await fetch(`http://localhost:5001/api/properties/broker/${brokerId}`, {
                headers: headers
            });

            if (!response.ok) {
                throw new Error('Failed to fetch properties for this broker');
            }

            const data = await response.json();
            console.log('Fetched properties for broker ID', brokerId, ':', data);
            processFetchedProperties(data);
        } catch (error) {
            console.error('Error fetching properties:', error);
            setError(error.message);
            setProperties([]); // Clear properties on error
        } finally {
            setLoading(false); // Always stop loading whether success or error
        }
    };

    // Extract unique filter options from properties
    const extractFilterOptions = (propertiesData) => {
        // Extract unique property types
        const propertyTypes = [...new Set(propertiesData.map(p => p.property_type))].filter(Boolean);

        // Extract unique property categories (property_for)
        const propertyCategories = [...new Set(propertiesData.map(p => p.property_for))].filter(Boolean);

        // Extract unique bedroom counts and sort them
        const bedroomOptions = [...new Set(propertiesData.map(p => p.bedrooms))]
            .filter(Boolean)
            .sort((a, b) => a - b);

        // Extract unique bathroom counts and sort them
        const bathroomOptions = [...new Set(propertiesData.map(p => p.bathrooms))]
            .filter(Boolean)
            .sort((a, b) => a - b);

        // Extract unique status options
        const statusOptions = [...new Set(propertiesData.map(p => p.status))].filter(Boolean);

        // Extract unique locations
        const locations = [...new Set(propertiesData.map(p => p.location))].filter(Boolean);

        setFilterOptions({
            propertyTypes,
            propertyCategories,
            bedroomOptions,
            bathroomOptions,
            statusOptions,
            locations
        });
    };

    // Fetch properties on component mount
    useEffect(() => {
        fetchProperties();
    }, []);

    // Open add property modal
    const openAddPropertyModal = () => {
        setPropertyToEdit(null); // Ensure we're not in edit mode
        setIsAddPropertyModalOpen(true);
    };

    // Close add property modal
    const closeAddPropertyModal = (refreshData = false) => {
        setIsAddPropertyModalOpen(false);
        setPropertyToEdit(null);

        // Refresh property data if requested (after successful add/edit)
        if (refreshData) {
            fetchProperties();
        }
    };

    // Open edit property modal
    const openEditPropertyModal = (property) => {
        setPropertyToEdit(property);
        setIsAddPropertyModalOpen(true);
        setIsViewingDetails(false); // Close the details modal
    };

    // Format price
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    // Apply filters and search
    const filteredProperties = properties.filter(property => {
        // Search term filter
        const matchesSearch =
            property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.description?.toLowerCase().includes(searchTerm.toLowerCase());

        // Type filter
        const matchesType = filters.type === 'all' || property.property_type === filters.type;

        // Category filter - Fix case sensitivity issue
        const matchesCategory = filters.category === 'all' ||
            property.property_for === filters.category;

        // Location filter - Add this filter
        const matchesLocation = !filters.location ||
            property.location === filters.location;

        // Price filter
        const aboveMinPrice = !filters.priceMin || property.price >= Number(filters.priceMin);
        const belowMaxPrice = !filters.priceMax || property.price <= Number(filters.priceMax);

        // Bedrooms filter
        const matchesBedrooms =
            filters.bedrooms === 'any' ||
            (filters.bedrooms === '4+' && property.bedrooms >= 4) ||
            property.bedrooms === Number(filters.bedrooms);

        // Bathrooms filter
        const matchesBathrooms =
            filters.bathrooms === 'any' ||
            (filters.bathrooms === '4+' && property.bathrooms >= 4) ||
            property.bathrooms === Number(filters.bathrooms);

        // Status filter
        const matchesStatus = filters.status === 'all' || property.status === filters.status;

        // Area filter
        const aboveMinArea = !filters.area_min || property.area >= Number(filters.area_min);
        const belowMaxArea = !filters.area_max || property.area <= Number(filters.area_max);

        // Year built filter
        const aboveMinYear = !filters.year_built_min || property.year_built >= Number(filters.year_built_min);
        const belowMaxYear = !filters.year_built_max || property.year_built <= Number(filters.year_built_max);

        // Featured filter
        const matchesFeatured = !filters.featured || property.featured;

        return matchesSearch && matchesType && matchesCategory && matchesLocation &&
            aboveMinPrice && belowMaxPrice &&
            matchesBedrooms && matchesBathrooms && matchesStatus &&
            aboveMinArea && belowMaxArea &&
            aboveMinYear && belowMaxYear &&
            matchesFeatured;
    });

    // Sort properties
    const sortedProperties = [...filteredProperties].sort((a, b) => {
        switch (sortOption) {
            case 'newest':
                return new Date(b.year_built) - new Date(a.year_built);
            case 'oldest':
                return new Date(a.year_built) - new Date(b.year_built);
            case 'priceHigh':
                return b.price - a.price;
            case 'priceLow':
                return a.price - b.price;
            case 'areaHigh':
                return b.area - a.area;
            case 'areaLow':
                return a.area - b.area;
            default:
                return 0;
        }
    });

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilters({
            ...filters,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Reset filters
    const resetFilters = () => {
        setFilters({
            type: 'all',
            category: 'all',
            priceMin: '',
            priceMax: '',
            bedrooms: 'any',
            bathrooms: 'any',
            status: 'all',
            area_min: '',
            area_max: '',
            year_built_min: '',
            year_built_max: '',
            featured: false,
            location: ''
        });
        setSearchTerm('');
    };

    // View property details
    const viewPropertyDetails = (property) => {
        setSelectedProperty(property);
        setIsViewingDetails(true);
    };

    // Close property details
    const closePropertyDetails = () => {
        setIsViewingDetails(false);
    };

    // Show loading state
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading properties...</p>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="error-container">
                <p>Error: {error}</p>
                <button onClick={fetchProperties}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="property-container">
            <div className="property-controls">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by location, description, or features..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="property-search-input"
                    />
                </div>

                <div className="view-controls">
                    <button
                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid View"
                    >
                        Grid View
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        aria-label="List View"
                    >
                        List View
                    </button>
                </div>
                <button
                    className="add-property-btn"
                    onClick={openAddPropertyModal}
                    aria-label="Add New Property"
                >
                    <FaPlus /> Add Property
                </button>
                <button
                    className="export-btn"
                    onClick={() => {
                        // Get broker ID from localStorage
                        const brokerId = localStorage.getItem('brokerId');
                        if (!brokerId) {
                            alert('Error: Broker ID not found. Please log in again.');
                            return;
                        }
                        
                        // Activate export component
                        setIsExporting(true);
                        setTimeout(() => setIsExporting(false), 3000); // Reset after 3 seconds
                        
                        // Show feedback to user
                        alert('Exporting properties to Excel...');
                    }}
                    aria-label="Export Properties"
                >
                    <FaFileExport /> Export
                </button>
                
                {/* Export component - only rendered when exporting is active */}
                {isExporting && <ExportProperties brokerId={localStorage.getItem('brokerId')} />}
            </div>

            <button
                className="filter-toggle-btn"
                onClick={() => setFiltersVisible(!filtersVisible)}
                aria-expanded={filtersVisible}
                aria-controls="property-filters"
            >
                {filtersVisible ? 'Hide Filters' : 'Show Filters'}
            </button>

            <div className={`property-content ${filtersVisible ? 'filters-active' : ''}`}>
                <aside className="property-filters" id="property-filters" style={{ display: filtersVisible ? 'block' : '' }}>
                    <div className="filter-section">
                        <h3>Filters</h3>
                        <button className="reset-filters-btn" onClick={resetFilters}>Reset All</button>
                    </div>

                    <div className="filter-group">
                        <label>Property Type</label>
                        <select
                            name="type"
                            value={filters.type}
                            onChange={handleFilterChange}
                        >
                            <option value="all">All Types</option>
                            {filterOptions.propertyTypes.map(type => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Category</label>
                        <select
                            name="category"
                            value={filters.category}
                            onChange={handleFilterChange}
                        >
                            <option value="all">All Categories</option>
                            {filterOptions.propertyCategories.map(category => (
                                <option key={category} value={category}>
                                    For {category}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Price Range</label>
                        <div className="price-inputs">
                            <input
                                type="number"
                                name="priceMin"
                                placeholder="Min"
                                value={filters.priceMin}
                                onChange={handleFilterChange}
                            />
                            <span className="price-separator">-</span>
                            <input
                                type="number"
                                name="priceMax"
                                placeholder="Max"
                                value={filters.priceMax}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Bedrooms</label>
                        <select
                            name="bedrooms"
                            value={filters.bedrooms}
                            onChange={handleFilterChange}
                        >
                            <option value="any">Any</option>
                            {filterOptions.bedroomOptions.map(count => (
                                <option key={count} value={count}>
                                    {count}
                                </option>
                            ))}
                            <option value="4+">4+</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Bathrooms</label>
                        <select
                            name="bathrooms"
                            value={filters.bathrooms}
                            onChange={handleFilterChange}
                        >
                            <option value="any">Any</option>
                            {filterOptions.bathroomOptions.map(count => (
                                <option key={count} value={count}>
                                    {count}
                                </option>
                            ))}
                            <option value="4+">4+</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
                        <select
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                        >
                            <option value="all">All Statuses</option>
                            {filterOptions.statusOptions.map(status => (
                                <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Area (sq ft)</label>
                        <div className="price-inputs">
                            <input
                                type="number"
                                name="area_min"
                                placeholder="Min"
                                value={filters.area_min}
                                onChange={handleFilterChange}
                            />
                            <span className="price-separator">-</span>
                            <input
                                type="number"
                                name="area_max"
                                placeholder="Max"
                                value={filters.area_max}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Year Built</label>
                        <div className="price-inputs">
                            <input
                                type="number"
                                name="year_built_min"
                                placeholder="From"
                                value={filters.year_built_min}
                                onChange={handleFilterChange}
                            />
                            <span className="price-separator">-</span>
                            <input
                                type="number"
                                name="year_built_max"
                                placeholder="To"
                                value={filters.year_built_max}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Location</label>
                        <select
                            name="location"
                            value={filters.location}
                            onChange={handleFilterChange}
                        >
                            <option value="">All Locations</option>
                            {filterOptions.locations.map(location => (
                                <option key={location} value={location}>
                                    {location}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="featured"
                                checked={filters.featured}
                                onChange={handleFilterChange}
                            />
                            <span>Featured Properties Only</span>
                        </label>
                    </div>

                    <div className="filter-group">
                        <label>Sort By</label>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="priceLow">Price: Low to High</option>
                            <option value="priceHigh">Price: High to Low</option>
                            <option value="areaLow">Area: Low to High</option>
                            <option value="areaHigh">Area: High to Low</option>
                        </select>
                    </div>
                </aside>
                <main className="property-listings">
                    <div className="listing-header">
                        <h2>
                            {sortedProperties.length}
                            {sortedProperties.length === 1 ? ' Property' : ' Properties'} Found
                        </h2>
                    </div>

                    {sortedProperties.length > 0 ? (
                        <div className={`property-grid ${viewMode}`}>
                            {sortedProperties.map(property => (
                                <div
                                    className="property-card"
                                    key={property.property_id}
                                    onClick={() => viewPropertyDetails(property)}
                                >
                                    <div className="property-image">
                                        {/* Using a placeholder image since we don't have actual image URLs */}
                                        <img
                                            src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
                                            alt={property.name}
                                        />
                                        <span className={`property-status ${property.status?.toLowerCase()}`}>{property.status}</span>
                                        <span className={`property-for ${property.property_for?.toLowerCase()}`}>{property.property_for}</span>
                                    </div>

                                    <div className="property-details">
                                        <h3 className="property-title">{property.name}</h3>
                                        <p className="property-location">{property.location}</p>
                                        <div className="property-price">{formatPrice(property.price)}</div>
                                        <div className="property-features">
                                            <span className="feature" title="Bedrooms">
                                                <i className="fas fa-bed"></i> {property.bedrooms} Beds
                                            </span>
                                            <span className="feature" title="Bathrooms">
                                                <i className="fas fa-bath"></i> {property.bathrooms} Baths
                                            </span>
                                            <span className="feature" title="Area">
                                                <i className="fas fa-ruler-combined"></i> {property.area} sq ft
                                            </span>
                                        </div>
                                        <p className="property-type">{property.property_type}</p>
                                        <div className="property-footer">
                                            <span className="property-year">Built: {property.year_built}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-properties">
                            <p>No properties match your current filters.</p>
                            <button className="reset-search-btn" onClick={resetFilters}>Reset Filters</button>
                        </div>
                    )}
                </main>
            </div>

            {isViewingDetails && selectedProperty && (
                <div className="property-modal-overlay">
                    <div className="property-modal">
                        <button className="close-modal-btn" onClick={closePropertyDetails}>×</button>

                        <div className="property-modal-content">
                            <div className="property-modal-gallery">
                                {/* Using a placeholder image since we don't have actual image URLs */}
                                <img
                                    src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
                                    alt={selectedProperty.name}
                                    className="main-image"
                                />

                                <div className="thumbnail-gallery">
                                    {/* Using a placeholder image since we don't have actual image URLs */}
                                    <img
                                        src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
                                        alt={selectedProperty.name}
                                        className="thumbnail"
                                    />
                                </div>
                            </div>

                            <div className="property-modal-info">
                                <div className="modal-header">
                                    <h2>{selectedProperty.name}</h2>
                                    <p className="modal-location">{selectedProperty.location}</p>
                                    <p className="modal-price">{formatPrice(selectedProperty.price)}</p>
                                </div>

                                <div className="modal-features">
                                    <div className="modal-feature">
                                        <span className="feature-label">Bedrooms</span>
                                        <span className="feature-value">{selectedProperty.bedrooms}</span>
                                    </div>

                                    <div className="modal-feature">
                                        <span className="feature-label">Bathrooms</span>
                                        <span className="feature-value">{selectedProperty.bathrooms}</span>
                                    </div>

                                    <div className="modal-feature">
                                        <span className="feature-label">Area</span>
                                        <span className="feature-value">{selectedProperty.area} sq ft</span>
                                    </div>

                                    <div className="modal-feature">
                                        <span className="feature-label">Year Built</span>
                                        <span className="feature-value">{selectedProperty.year_built}</span>
                                    </div>

                                    <div className="modal-feature">
                                        <span className="feature-label">Property Type</span>
                                        <span className="feature-value">
                                            {selectedProperty.property_type.charAt(0).toUpperCase() + selectedProperty.property_type.slice(1)}
                                        </span>
                                    </div>

                                    <div className="modal-feature">
                                        <span className="feature-label">Status</span>
                                        <span className={`feature-value status-badge ${selectedProperty.status?.toLowerCase()}`}>
                                            {selectedProperty.status.charAt(0).toUpperCase() + selectedProperty.status.slice(1)}
                                        </span>
                                    </div>
                                </div>

                                <div className="modal-description">
                                    <h3>Description</h3>
                                    <p>{selectedProperty.description}</p>
                                </div>

                                <div className="modal-amenities">
                                    <h3>Amenities</h3>
                                    <ul className="amenities-list">
                                        {selectedProperty.amenities ? (
                                            (() => {
                                                let amenitiesArray;
                                                try {
                                                    // If it's already an array, use it directly
                                                    if (Array.isArray(selectedProperty.amenities)) {
                                                        amenitiesArray = selectedProperty.amenities;
                                                    } else {
                                                        // Otherwise try to parse it as JSON
                                                        amenitiesArray = JSON.parse(selectedProperty.amenities);
                                                        // Ensure the parsed result is an array
                                                        if (!Array.isArray(amenitiesArray)) {
                                                            amenitiesArray = [amenitiesArray];
                                                        }
                                                    }
                                                    return amenitiesArray.map((amenity) => (
                                                        <li key={amenity} className="amenity-item">{amenity}</li>
                                                    ));
                                                } catch (error) {
                                                    console.error("Error parsing amenities:", error);
                                                    return <li className="amenity-item">Error displaying amenities</li>;
                                                }
                                            })()
                                        ) : (
                                            <li className="amenity-item">No amenities listed</li>
                                        )}
                                    </ul>
                                </div>

                                {/* <div className="modal-agent">
                                    <h3>Listed By</h3>
                                    <p>{selectedProperty.contact_agent}</p>
                                </div> */}

                                <div className="modal-actions">
                                    <button
                                        className="schedule-viewing-btn"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent closing the modal
                                            // Navigate to Schedule page and store the property ID to open the new visit modal
                                            localStorage.setItem('schedulePropertyId', selectedProperty.property_id);
                                            window.location.href = '/dashboard/schedule';
                                        }}
                                    >
                                        Schedule Viewing
                                    </button>
                                    <button
                                        className="edit-property-btn"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent closing the modal
                                            openEditPropertyModal(selectedProperty);
                                        }}
                                    >
                                        Edit Property
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Property Modal */}
            <AddPropertyModel
                isOpen={isAddPropertyModalOpen}
                onClose={closeAddPropertyModal}
                propertyToEdit={propertyToEdit}
            />
        </div>
    );
};

export default Properties;