import React from 'react';

const GoogleLoginButton = () => {
    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:5001/api/auth/google';
    };

    return (
        <button onClick={handleGoogleLogin} style={{ padding: '10px', fontSize: '16px', cursor: 'pointer' }}>
            Login with Google
        </button>
    );
};

export default GoogleLoginButton;
