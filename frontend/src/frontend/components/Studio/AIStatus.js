import React, { useState, useEffect } from 'react';

const AIStatus = () => {
    const [statusData, setStatusData] = useState({
        status: "Checking...",
        message: "Connecting to TRYMI AI...",
        isActive: false
    });

    const fetchStatus = async () => {
        try {
            // Adjust the URL if your backend is not on localhost:5001
            const response = await fetch('http://localhost:5001/api/ai-status');
            const data = await response.json();
            setStatusData(data);
        } catch (error) {
            setStatusData({
                status: "🔴 Offline",
                message: "Backend server is not responding.",
                isActive: false
            });
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const getStatusStyle = () => {
        if (statusData.status.includes("Fast")) return { color: "#16a34a", bg: "#f0fdf4" }; // Green
        if (statusData.status.includes("Busy")) return { color: "#ca8a04", bg: "#fefce8" }; // Yellow
        return { color: "#dc2626", bg: "#fef2f2" }; // Red
    };

    const style = getStatusStyle();

    return (
        <div style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: style.bg,
            border: `1px solid ${style.color}`,
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ fontWeight: 'bold', color: style.color }}>
                AI Server: {statusData.status}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#444' }}>
                {statusData.message}
            </div>
        </div>
    );
};

export default AIStatus;