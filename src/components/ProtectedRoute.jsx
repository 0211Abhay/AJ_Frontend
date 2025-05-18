import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../style/Loading.css';

const ProtectedRoute = ({ children }) => {
    const { broker, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!broker) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default ProtectedRoute;
