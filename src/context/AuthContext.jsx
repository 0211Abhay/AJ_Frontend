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

// Add response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 (Unauthorized) and we haven't tried to refresh token yet
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                // Try to refresh the token or redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('brokerId');
                localStorage.removeItem('brokerName');
                
                // Redirect to login page
                window.location.href = '/login';
                return Promise.reject(error);
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

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
    const [sessionChecked, setSessionChecked] = useState(false);

    // Check session status on mount
    useEffect(() => {
        // We don't clear localStorage on initial load anymore
        // This allows the session to persist across page refreshes
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            setLoading(true);
            
            // Get token from localStorage
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.log('No token found, user is not authenticated');
                setBroker(null);
                setLoading(false);
                setSessionChecked(true);
                return;
            }
            
            // Make API call to check session with token
            const response = await api.get('/auth/check');
            console.log('Session check response:', response.data);

            if (response.data.authenticated) {
                const brokerData = response.data.broker;
                console.log('Authenticated broker data:', brokerData);
                setBroker(brokerData);

                // Store broker ID in local storage - handle different possible structures
                if (brokerData) {
                    // Try to get ID from different possible properties
                    const brokerId = brokerData.brokerId || brokerData.id || brokerData._id || brokerData.broker_id;
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
                localStorage.removeItem('token');
                localStorage.removeItem('brokerId');
                localStorage.removeItem('brokerName');
            }
        } catch (error) {
            console.error('Session check error:', error);
            setBroker(null);
            localStorage.removeItem('token');
            localStorage.removeItem('brokerId');
            localStorage.removeItem('brokerName');
        } finally {
            setLoading(false);
            setSessionChecked(true);
        }
    };

    const login = async (email, password, rememberMe) => {
        try {
            console.log('Login attempt');
            
            const response = await api.post('/auth/login', {
                email,
                password,
                rememberMe
            });

            console.log('Login response:', response.data);

            // Extract token and store it
            const token = response.data.token;
            if (token) {
                localStorage.setItem('token', token);
            } else {
                console.warn('No token received in login response');
            }

            // Extract broker data from response
            const brokerData = response.data.broker || response.data.user || response.data;
            console.log('Extracted broker data:', brokerData);

            // Set broker in state
            setBroker(brokerData);

            // Store broker information in localStorage
            if (brokerData) {
                // Try to get ID from different possible properties
                const brokerId = brokerData.id || brokerData._id || brokerData.broker_id || response.data.id;
                const brokerName = brokerData.name || brokerData.fullName || brokerData.username || '';
                const brokerEmail = brokerData.email || '';

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
            localStorage.removeItem('token');
            localStorage.removeItem('brokerId');
            localStorage.removeItem('brokerName');

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            // Even if the server-side logout fails, we still want to clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('brokerId');
            localStorage.removeItem('brokerName');
            setBroker(null);
            
            return {
                success: true, // Return success anyway since we've cleared local state
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
        sessionChecked,
        login,
        logout,
        loginWithGoogle: () => {
            window.location.href = 'http://localhost:5001/api/auth/google';
            return { success: true };
        },
        checkSession,
        forgotPassword,
        verifyResetToken,
        resetPassword,
        isAuthenticated: !!broker
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
