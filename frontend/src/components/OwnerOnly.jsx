import React from 'react';

const OwnerOnly = ({ children }) => {
    const role = localStorage.getItem('role');
    // Check for both capitalized and lowercase
    const isOwner = role === 'Owner' || role === 'owner';
    return isOwner ? children : null;
};

export default OwnerOnly;
