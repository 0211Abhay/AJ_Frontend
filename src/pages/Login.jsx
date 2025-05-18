import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import withSessionCheck from '../components/SessionCheck';
import GoogleButton from 'react-google-button'

import "../style/Login.css";
import GoogleLoginButton from '../components/GoogleLoginButton';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const result = await login(email, password, rememberMe);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
    };

    const handleGoogleLogin = async () => {
        const result = await loginWithGoogle();
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Welcome back, Broker</h1>
                    <p>Please enter your details to access your broker dashboard</p>
                </div>

                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <Mail size={20} className="input-icon" />
                        <input
                            type="email"
                            placeholder="Broker Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <Lock size={20} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Broker Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>Remember me</span>
                        </label>
                        <Link to="/forgot-password" className="forgot-password">
                            Forgot password?
                        </Link>
                    </div>

                    <button type="submit" className="submit-button">
                        Sign in to Broker Dashboard
                    </button>
                </form>

                <div className='google-login-div'>
                    <GoogleButton 
                        className='google-button' 
                        style={{ width: '350px', borderRadius: '0px' }}
                        onClick={handleGoogleLogin}
                    />
                </div>

                <div className="auth-footer">
                    <p>
                        Don't have a broker account?{' '}
                        <Link to="/signup" className="accent-link">
                            Sign up for a broker account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

// Wrap Login with session check and don't require authentication
export default withSessionCheck(Login, false);
