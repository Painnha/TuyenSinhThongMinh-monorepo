import { useState, useEffect } from 'react';
import { authService } from '../services';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        if (token) {
            // Validate token and get user info
            // This is a placeholder - implement actual token validation
            setUser({ token });
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const response = await authService.login(credentials);
            localStorage.setItem('token', response.token);
            setUser(response.user);
            return response;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return {
        user,
        loading,
        login,
        logout
    };
}; 