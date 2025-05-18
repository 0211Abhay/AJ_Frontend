import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import withSessionCheck from '../components/SessionCheck';

import "../style/Login.css";

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { verifyResetToken, resetPassword } = useAuth();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenChecked, setTokenChecked] = useState(false);

    // Verify token when component mounts
    useEffect(() => {
        const checkToken = async () => {
            if (!token) {
                setError('Invalid reset link. Please request a new password reset.');
                setTokenChecked(true);
                return;
            }

            try {
                const result = await verifyResetToken(token);
                if (result.success) {
                    setTokenValid(true);
                } else {
                    setError('This password reset link has expired or is invalid. Please request a new one.');
                }
            } catch (err) {
                setError('An error occurred while verifying your reset link.');
            } finally {
                setTokenChecked(true);
            }
        };

        checkToken();
    }, [token, verifyResetToken]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // Validate passwords
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await resetPassword(token, newPassword);
            if (result.success) {
                setMessage('Your password has been reset successfully.');
                // Clear form
                setNewPassword('');
                setConfirmPassword('');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading state while checking token
    if (!tokenChecked) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Reset Password</h1>
                        <p>Verifying your reset link...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Reset Password</h1>
                    <p>Enter your new password below</p>
                </div>

                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}

                {tokenValid ? (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <Lock size={20} className="input-icon" />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <Lock size={20} className="input-icon" />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                ) : (
                    <div className="auth-footer">
                        <p>
                            <Link to="/forgot-password" className="accent-link">
                                Request a new password reset link
                            </Link>
                        </p>
                    </div>
                )}

                <div className="auth-footer">
                    <p>
                        Remember your password?{' '}
                        <Link to="/login" className="accent-link">
                            Back to Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

// Wrap ResetPassword with session check and don't require authentication
export default withSessionCheck(ResetPassword, false);
