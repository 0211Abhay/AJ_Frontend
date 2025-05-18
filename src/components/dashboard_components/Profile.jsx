import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import '../../style/Profile.css';

// Use the same axios instance as in AuthContext
const api = axios.create({
    baseURL: 'http://localhost:5001/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

const Profile = () => {
    const { broker, checkSession } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    // Clear messages after 5 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Initialize form data when broker data is available
    useEffect(() => {
        if (broker) {
            setFormData({
                name: broker.name || '',
                email: broker.email || '',
                phone: broker.phone || ''
            });
        }
    }, [broker]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleEditToggle = () => {
        if (isEditing) {
            handleSaveProfile();
        } else {
            setIsEditing(true);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setIsLoading(true);
            setError('');
            setSuccess('');
            
            const response = await api.put('/auth/profile', formData);
            
            if (response.data.success) {
                setSuccess('Profile updated successfully!');
                // Refresh broker data in context
                checkSession();
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(
                error.response?.data?.message || 
                'Failed to update profile. Please make sure the server is running.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!broker) {
        return <div className="profile-loading">Loading profile...</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h2>Broker Profile</h2>
                <button 
                    className={`edit-button ${isEditing ? 'save-mode' : 'edit-mode'}`}
                    onClick={handleEditToggle}
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="profile-content">
                <div className="profile-avatar">
                    {/* Placeholder for profile image */}
                    <div className="avatar-placeholder">
                        {broker.name ? broker.name.charAt(0).toUpperCase() : 'B'}
                    </div>
                </div>

                <div className="profile-details">
                    <div className="profile-field">
                        <label>Name:</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleInputChange} 
                                disabled={isLoading}
                            />
                        ) : (
                            <span>{broker.name}</span>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Email:</label>
                        {isEditing ? (
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleInputChange} 
                                disabled={isLoading}
                            />
                        ) : (
                            <span>{broker.email}</span>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Phone:</label>
                        {isEditing ? (
                            <input 
                                type="tel" 
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleInputChange} 
                                disabled={isLoading}
                            />
                        ) : (
                            <span>{broker.phone || 'Not provided'}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;