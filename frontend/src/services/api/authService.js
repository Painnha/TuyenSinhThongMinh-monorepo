import { API_URL, API_CONFIG, handleResponse } from '../config/apiConfig';

export const authService = {
    login: async (credentials) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                ...API_CONFIG,
                body: JSON.stringify(credentials)
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error in login:', error);
            throw error;
        }
    },

    register: async (userData) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                ...API_CONFIG,
                body: JSON.stringify(userData)
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error in register:', error);
            throw error;
        }
    },

    forgotPassword: async (email) => {
        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                ...API_CONFIG,
                body: JSON.stringify({ email })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error in forgot password:', error);
            throw error;
        }
    },

    resetPassword: async (token, newPassword) => {
        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                ...API_CONFIG,
                body: JSON.stringify({ token, newPassword })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error in reset password:', error);
            throw error;
        }
    }
}; 