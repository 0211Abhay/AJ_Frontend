import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Higher-order component to wrap pages that need session checking
const withSessionCheck = (WrappedComponent, requireAuth = false) => {
    return (props) => {
        const { broker, loading } = useAuth();
        const navigate = useNavigate();

        useEffect(() => {
            // If page requires authentication and user is not logged in
            if (requireAuth && !loading && !broker) {
                navigate('/login');
            }
            // If user is logged in and tries to access login/signup pages
            else if (!requireAuth && !loading && broker) {
                navigate('/dashboard');
            }
        }, [broker, loading, navigate]);

        if (loading) {
            return (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Checking session...</p>
                </div>
            );
        }

        // Only render the component if authentication requirements are met
        if ((requireAuth && broker) || (!requireAuth && !broker)) {
            return <WrappedComponent {...props} />;
        }

        return null;
    };
};

export default withSessionCheck;
