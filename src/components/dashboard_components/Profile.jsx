import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import '../../style/Profile.css';

// Create axios instance with default config and interceptors
const api = axios.create({
    baseURL: 'http://localhost:5001/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to include auth token in all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const Profile = () => {
    const { broker, checkSession, loading: authLoading, sessionChecked, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [originalEmail, setOriginalEmail] = useState('');

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
            setOriginalEmail(broker.email || '');
        }
    }, [broker]);

    // Check for temporary profile data on component mount
    useEffect(() => {
        const tempProfileData = localStorage.getItem('tempProfileData');
        if (tempProfileData) {
            try {
                const parsedData = JSON.parse(tempProfileData);
                // Only use this data if we have a broker and the emails match
                if (broker && broker.email === parsedData.email) {
                    setFormData(prevData => ({
                        ...prevData,
                        phone: parsedData.phone || prevData.phone
                    }));
                }
                // Clear the temporary data
                localStorage.removeItem('tempProfileData');
            } catch (e) {
                console.error('Error parsing temporary profile data:', e);
                localStorage.removeItem('tempProfileData');
            }
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
            
            // Validate form data
            if (!formData.name.trim()) {
                throw new Error('Name is required');
            }
            
            if (!formData.email.trim()) {
                throw new Error('Email is required');
            }
            
            // Email validation regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                throw new Error('Please enter a valid email address');
            }
            
            // Check if email is being changed
            const isEmailChanged = formData.email !== originalEmail;
            
            const response = await api.put('/auth/profile', formData);
            
            if (response.data.success) {
                setSuccess('Profile updated successfully!');
                
                // If email was changed, we need to handle re-authentication
                if (isEmailChanged) {
                    // Show a message to the user
                    setSuccess('Email updated successfully! You will be redirected to login with your new email.');
                    
                    // Store the updated profile data in localStorage to preserve it across the login
                    localStorage.setItem('tempProfileData', JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone
                    }));
                    
                    // Wait a moment to show the success message before logging out
                    setTimeout(async () => {
                        await logout();
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    // If email wasn't changed, just refresh the broker data
                    await checkSession();
                    setIsEditing(false);
                }
            } else {
                throw new Error(response.data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(
                error.response?.data?.message || 
                error.message ||
                'Failed to update profile. Please make sure the server is running.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset form data to original broker data
        if (broker) {
            setFormData({
                name: broker.name || '',
                email: broker.email || '',
                phone: broker.phone || ''
            });
        }
        setIsEditing(false);
        setError('');
    };

    if (authLoading || !sessionChecked) {
        return <div className="profile-loading">Loading profile...</div>;
    }

    if (!broker) {
        return <div className="profile-error">Please log in to view your profile.</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h2>Broker Profile</h2>
                {isEditing ? (
                    <div className="button-group">
                        <button 
                            className="cancel-button"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            className="save-button"
                            onClick={handleSaveProfile}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                ) : (
                    <button 
                        className="edit-button"
                        onClick={() => setIsEditing(true)}
                        disabled={isLoading}
                    >
                        Edit Profile
                    </button>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="profile-content">
                <div className="profile-avatar">
                    {/* Placeholder for profile image */}
                    <div className="avatar-placeholder">
                        {broker.name ? broker.name.charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div className="broker-id">
                        <span>Broker ID: {broker.brokerId || broker.id}</span>
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
                                required
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
                                required
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
                                value={formData.phone || ''} 
                                onChange={handleInputChange} 
                                disabled={isLoading}
                                placeholder="Enter phone number"
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