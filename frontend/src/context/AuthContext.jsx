import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [businesses, setBusinesses] = useState([]);
    const [currentBusiness, setCurrentBusiness] = useState(null);

    useEffect(() => {
        const verifySession = async () => {
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/verify`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        console.log("AuthContext: Session verified", data.user);
                        setUser(data.user);
                        setBusinesses(data.businesses || []);
                        localStorage.setItem('token', token);
                    } else {
                        logout(false);
                    }
                } catch (error) {
                    console.error('Session verification failed:', error);
                }
            }
            setLoading(false);
        };

        verifySession();
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
                setBusinesses(data.businesses || []);
                setUser(data.user);
                localStorage.setItem('token', data.token);
                toast.success('Welcome back to BulkBins!');
                return { success: true, isMasterAdmin: data.user.is_master_admin };
            } else {
                toast.error(data.message || 'Invalid credentials');
                return false;
            }
        } catch (error) {
            toast.error('Login failed. Please ensure the backend is running.');
            return false;
        }
    };

    const signup = async (userData) => {
        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
                setUser(data.user);
                setBusinesses([]); // New user has no businesses
                localStorage.setItem('token', data.token);
                toast.success('Account created!');
                return true;
            } else {
                toast.error(data.message || 'Signup failed');
                return false;
            }
        } catch (error) {
            toast.error('Signup failed. Please ensure the backend is running.');
            return false;
        }
    };

    const logout = (showToast = true) => {
        setToken(null);
        setUser(null);
        setBusinesses([]);
        setCurrentBusiness(null);
        localStorage.removeItem('token');
        if (showToast) toast.success('Logged out successfully');
    };

    const createBusiness = async (businessData) => {
        try {
            const response = await fetch(`${API_URL}/businesses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(businessData)
            });

            const data = await response.json();

            if (response.ok) {
                setBusinesses([...businesses, data]);
                toast.success(`Business "${businessData.name}" registered! Awaiting admin approval.`);
                return data;
            } else {
                toast.error(data.message || 'Failed to create business');
                return null;
            }
        } catch (error) {
            toast.error('Business creation failed.');
            return null;
        }
    };

    const updateProfile = async (profileData) => {
        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (response.ok) {
                setUser(data.user);
                if (data.token) {
                    setToken(data.token);
                    localStorage.setItem('token', data.token);
                }
                toast.success('Profile updated successfully');
                return true;
            } else {
                toast.error(data.message || 'Failed to update profile');
                return false;
            }
        } catch (error) {
            toast.error('Profile update failed.');
            return false;
        }
    };

    const deleteBusiness = (id) => {
        // Implementation for backend delete will go here
        toast.error('Delete functionality under migration.');
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            signup,
            logout,
            isAuthenticated: !!token,
            loading,
            businesses,
            currentBusiness,
            setCurrentBusiness,
            createBusiness,
            deleteBusiness,
            updateProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
