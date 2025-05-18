import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../../style/AddPropertyModel.css';

const AddPropertyModel = ({ isOpen, onClose, propertyToEdit = null }) => {
    const modalRef = useRef(null);
    
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target) && e.target.classList.contains('modal-overlay')) {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);
        
        // Prevent body scrolling when modal is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);
    
    const [propertyData, setPropertyData] = useState({
        name: '',
        location: '',
        price: '',
        property_for: '',
        property_type: '',
        bedrooms: '',
        bathrooms: '',
        area: '',
        contact_agent: '',
        year_built: '',
        status: 'Available',
        description: '',
        amenities: [],
        images: []
    });

    const [imageFiles, setImageFiles] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Initialize form with property data if in edit mode
    useEffect(() => {
        if (propertyToEdit) {
            setIsEditMode(true);

            // Parse amenities if they're stored as a JSON string
            let amenitiesArray = [];
            if (propertyToEdit.amenities) {
                try {
                    amenitiesArray = JSON.parse(propertyToEdit.amenities);
                } catch (e) {
                    console.error('Error parsing amenities:', e);
                    amenitiesArray = [];
                }
            }

            setPropertyData({
                name: propertyToEdit.name || '',
                location: propertyToEdit.location || '',
                price: propertyToEdit.price || '',
                property_for: propertyToEdit.property_for || '',
                property_type: propertyToEdit.property_type || '',
                bedrooms: propertyToEdit.bedrooms || '',
                bathrooms: propertyToEdit.bathrooms || '',
                area: propertyToEdit.area || '',
                contact_agent: propertyToEdit.contact_agent || '',
                year_built: propertyToEdit.year_built || '',
                status: propertyToEdit.status || 'Available',
                description: propertyToEdit.description || '',
                amenities: amenitiesArray,
                images: propertyToEdit.images || []
            });
        } else {
            setIsEditMode(false);
            resetForm();
        }
    }, [propertyToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPropertyData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleAmenityChange = (e) => {
        const { value, checked } = e.target;
        setPropertyData(prevState => ({
            ...prevState,
            amenities: checked
                ? [...prevState.amenities, value]
                : prevState.amenities.filter(amenity => amenity !== value)
        }));
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        setImageFiles(prevFiles => [...prevFiles, ...files]);

        // Create preview URLs
        const imageUrls = files.map(file => URL.createObjectURL(file));
        setPropertyData(prevState => ({
            ...prevState,
            images: [...prevState.images, ...imageUrls]
        }));
    };

    const removeImage = (index) => {
        setImageFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
        setPropertyData(prevState => ({
            ...prevState,
            images: prevState.images.filter((_, i) => i !== index)
        }));
    };

    const resetForm = () => {
        setPropertyData({
            name: '',
            location: '',
            price: '',
            property_for: '',
            property_type: '',
            bedrooms: '',
            bathrooms: '',
            area: '',
            contact_agent: '',
            year_built: '',
            status: 'Available',
            description: '',
            amenities: [],
            images: []
        });
        setImageFiles([]);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validate required fields
        const requiredFields = ['name', 'location', 'price', 'property_for', 'property_type'];
        const missingFields = requiredFields.filter(field => !propertyData[field]);

        if (missingFields.length > 0) {
            setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
            setLoading(false);
            return;
        }

        try {
            // Create a new object with the property data
            const propertyPayload = {
                broker_id: localStorage.getItem('brokerId'), // Placeholder broker ID
                name: propertyData.name,
                location: propertyData.location,
                price: propertyData.price,
                property_for: propertyData.property_for,
                property_type: propertyData.property_type,
                bedrooms: propertyData.bedrooms || null,
                bathrooms: propertyData.bathrooms || null,
                area: propertyData.area || null,
                contact_agent: propertyData.contact_agent || null,
                year_built: propertyData.year_built || null,
                status: propertyData.status,
                description: propertyData.description || null,
                amenities: propertyData.amenities
            };

            console.log(`${isEditMode ? 'Updating' : 'Sending'} property data:`, propertyPayload);

            let url = 'http://localhost:5001/api/property/createProperty';
            let method = 'POST';

            if (isEditMode && propertyToEdit) {
                url = `http://localhost:5001/api/property/updateProperty/${propertyToEdit.property_id}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(propertyPayload)
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `Failed to ${isEditMode ? 'update' : 'add'} property`);
            }

            console.log(`Property ${isEditMode ? 'updated' : 'added'} successfully:`, responseData);
            setSuccess(`Property ${isEditMode ? 'updated' : 'added'} successfully!`);

            // Reset form after successful submission
            resetForm();

            // Close modal after a short delay to show success message
            setTimeout(() => {
                onClose(true); // Pass true to indicate successful operation
            }, 1500);

        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} property:`, error);
            setError(error.message || `Failed to ${isEditMode ? 'update' : 'add'} property. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return isOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-content" ref={modalRef}>
                <div className="modal-header">
                    <h2 id="modal-title">{isEditMode ? 'Edit Property' : 'Add New Property'}</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="success-message">
                        <p>{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="property-controls">
                        <div className="form-group">
                            <label>Property Name</label>
                            <input
                                type="text"
                                name="name"
                                value={propertyData.name}
                                onChange={handleChange}
                                placeholder="Enter property name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <input
                                type="text"
                                name="location"
                                value={propertyData.location}
                                onChange={handleChange}
                                placeholder="Enter property location"
                                required
                            />
                        </div>
                    </div>

                    <div className="property-controls">
                        <div className="form-group">
                            <label>Price ($)</label>
                            <input
                                type="number"
                                name="price"
                                value={propertyData.price}
                                onChange={handleChange}
                                placeholder="Enter property price"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Property For</label>
                            <select
                                name="property_for"
                                value={propertyData.property_for}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Rent">Rent</option>
                                <option value="Sale">Sale</option>
                            </select>
                        </div>
                    </div>

                    <div className="property-controls">
                        <div className="form-group">
                            <label>Property Type</label>
                            <select
                                name="property_type"
                                value={propertyData.property_type}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Type</option>
                                <option value="House">House</option>
                                <option value="Apartment">Apartment</option>
                                <option value="Condo">Condo</option>
                                <option value="Villa">Villa</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Land">Land</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                name="status"
                                value={propertyData.status}
                                onChange={handleChange}
                                required
                            >
                                <option value="Available">Available</option>
                                <option value="Sold">Sold</option>
                                <option value="Rented">Rented</option>
                                <option value="Under Negotiation">Under Negotiation</option>
                            </select>
                        </div>
                    </div>

                    <div className="property-controls">
                        <div className="form-group">
                            <label>Bedrooms</label>
                            <input
                                type="number"
                                name="bedrooms"
                                value={propertyData.bedrooms}
                                onChange={handleChange}
                                min="0"
                                placeholder="Number of bedrooms"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Bathrooms</label>
                            <input
                                type="number"
                                name="bathrooms"
                                value={propertyData.bathrooms}
                                onChange={handleChange}
                                min="0"
                                placeholder="Number of bathrooms"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="property-controls">
                        <div className="form-group">
                            <label>Area (sq ft)</label>
                            <input
                                type="number"
                                name="area"
                                value={propertyData.area}
                                onChange={handleChange}
                                min="1"
                                placeholder="Area in square feet"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Year Built</label>
                            <input
                                type="number"
                                name="year_built"
                                value={propertyData.year_built}
                                onChange={handleChange}
                                min="1800"
                                max={new Date().getFullYear()}
                                placeholder="Year property was built"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Contact Agent</label>
                        <input
                            type="text"
                            name="contact_agent"
                            value={propertyData.contact_agent}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Amenities</label>
                        <div className="amenities-grid">
                            {[
                                'Swimming Pool', 'Gym', 'Parking', 'Security',
                                'Garden', 'Elevator', 'Balcony', 'Terrace'
                            ].map(amenity => (
                                <label key={amenity} className="amenity-checkbox">
                                    <input
                                        type="checkbox"
                                        value={amenity}
                                        checked={propertyData.amenities.includes(amenity)}
                                        onChange={handleAmenityChange}
                                    />
                                    {amenity}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={onClose} type="button">
                            <i className="fas fa-times"></i> Cancel
                        </button>
                        <button className="btn-submit" onClick={handleSubmit} type="button">
                            <i className={`fas ${isEditMode ? 'fa-save' : 'fa-plus-circle'}`}></i>
                            {isEditMode ? 'Update Property' : 'Add Property'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPropertyModel;