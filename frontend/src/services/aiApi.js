//const API_URL = 'http://localhost:5000/api';
const API_BASE = import.meta.env.VITE_API_URL;

export const uploadCsvForAnalysis = async (businessId, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/businesses/${businessId}/transaction-import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
    }
    return { ...(await response.json()), filename: file.name };
};

export const getAiDashboard = async (businessId, granularity, startDate, endDate) => {
    const token = localStorage.getItem('token');
    let url = `${API_URL}/businesses/${businessId}/ai/dashboard?granularity=${granularity}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    return await response.json();
};

export const getCsvAnalysis = async (businessId, granularity, startDate, endDate) => {
    const token = localStorage.getItem('token');
    let url = `${API_URL}/businesses/${businessId}/ai/csv-analysis?granularity=${granularity}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) return await response.json();
    } catch (e) {
        console.warn("CSV Analysis endpoint not ready", e);
    }
    return null;
};

export const getTransactionAnalysis = async (businessId, granularity, startDate, endDate) => {
    const token = localStorage.getItem('token');
    let url = `${API_URL}/businesses/${businessId}/ai/transaction-analysis?granularity=${granularity}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) return await response.json();
    } catch (e) {
        console.warn("Transaction Analysis endpoint not ready", e);
    }
    return null;
};

export const exportReportExcel = async (businessId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/businesses/${businessId}/export/excel`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to export Excel');
    return await response.blob();
};

export const exportReportPdf = async (businessId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/businesses/${businessId}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to export PDF');
    return await response.blob();
};

export const exportAiData = async (businessId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/businesses/${businessId}/export/ai-data`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to export AI Data');
    return await response.json();
};
