import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
    baseURL: 'http://localhost:5001/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [broker, setBroker] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check session status on mount
    useEffect(() => {
        // Clear all localStorage items on initial load
        const storedItems = Object.keys(localStorage);
        if (storedItems.includes('activeSection') ||
            storedItems.includes('email') ||
            storedItems.includes('theme') ||
            storedItems.includes('token') ||
            storedItems.includes('user')) {
            localStorage.clear();
        }
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const response = await api.get('/auth/check');
            console.log('Session check response:', response.data);

            if (response.data.authenticated) {
                const brokerData = response.data.broker;
                console.log('Authenticated broker data:', brokerData);
                setBroker(brokerData);

                // Store broker ID in local storage - handle different possible structures
                if (brokerData) {
                    // Try to get ID from different possible properties
                    const brokerId = brokerData._id || brokerData.id || brokerData.broker_id;
                    const brokerName = brokerData.name || brokerData.fullName || brokerData.username || '';
                    const brokerEmail = brokerData.email || '';

                    console.log('Storing broker info:', { brokerId, brokerName, brokerEmail });

                    if (brokerId) {
                        localStorage.setItem('brokerId', brokerId);
                        localStorage.setItem('brokerName', brokerName);


                        console.log('Verification - stored in localStorage:', {
                            brokerId: localStorage.getItem('brokerId'),
                            brokerName: localStorage.getItem('brokerName')
                        });
                    } else {
                        console.warn('No broker ID found in authenticated response');
                    }
                }
            } else {
                console.log('Not authenticated, clearing broker data');
                setBroker(null);
                localStorage.removeItem('brokerId');
                localStorage.removeItem('brokerName');

            }
        } catch (error) {
            console.error('Session check error:', error);
            setBroker(null);
            localStorage.removeItem('brokerId');
            localStorage.removeItem('brokerName');

        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password, rememberMe) => {
        try {
            console.log('Login attempt - clearing localStorage');
            // Clear all existing localStorage items before logging in
            localStorage.clear();

            const response = await api.post('/auth/login', {
                email,
                password,
                rememberMe
            });

            console.log('Login response:', response.data);

            // Extract broker data from response
            const brokerData = response.data.broker || response.data.user || response.data;
            console.log('Extracted broker data:', brokerData);

            // Set broker in state
            setBroker(brokerData);

            // Store broker info in localStorage - handle different possible structures
            if (brokerData) {
                // Try to get ID from different possible properties
                const brokerId = brokerData.brokerId || brokerData._id || brokerData.id || brokerData.broker_id;
                const brokerName = brokerData.name || brokerData.fullName || brokerData.username || '';
                const brokerEmail = brokerData.email || '';
                
                // Store the token
                const token = response.data.token;
                if (token) {
                    localStorage.setItem('token', token);
                    console.log('Token stored in localStorage');
                }

                console.log('Extracted broker info:', { brokerId, brokerName, brokerEmail });

                if (brokerId) {
                    // Store broker information
                    localStorage.setItem('brokerId', brokerId);
                    localStorage.setItem('brokerName', brokerName);

                    // Verify storage was successful
                    console.log('Verification - stored in localStorage:', {
                        brokerId: localStorage.getItem('brokerId'),
                        brokerName: localStorage.getItem('brokerName'),
                        token: localStorage.getItem('token') ? 'Token stored' : 'No token'
                    });
                } else {
                    console.warn('No broker ID found in response');
                }
            } else {
                console.warn('No broker data found in response');
            }

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'An error occurred during login'
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
            setBroker(null);

            // Clear all localStorage items on logout
            localStorage.clear();

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'An error occurred during logout'
            };
        }
    };

    // Request password reset
    const forgotPassword = async (email) => {
        try {
            const response = await api.post('/auth/forgot-password', { email });
            return { 
                success: true, 
                message: response.data.message 
            };
        } catch (error) {
            console.error('Forgot password error:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'An error occurred during password reset request'
            };
        }
    };

    // Verify reset token
    const verifyResetToken = async (token) => {
        try {
            const response = await api.get(`/auth/verify-reset-token/${token}`);
            return { 
                success: response.data.success, 
                message: response.data.message 
            };
        } catch (error) {
            console.error('Token verification error:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'An error occurred during token verification'
            };
        }
    };

    // Reset password with token
    const resetPassword = async (token, newPassword) => {
        try {
            const response = await api.post('/auth/reset-password', { 
                token, 
                newPassword 
            });
            return { 
                success: true, 
                message: response.data.message 
            };
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'An error occurred during password reset'
            };
        }
    };

    const value = {
        broker,
        loading,
        login,
        logout,
        loginWithGoogle: () => {
            window.location.href = 'http://localhost:5001/api/auth/google';
            return { success: true };
        },
        checkSession,
        forgotPassword,
        verifyResetToken,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
