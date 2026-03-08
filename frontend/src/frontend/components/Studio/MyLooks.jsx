import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MyLooks = () => {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyLooks();
  }, []);

  const fetchMyLooks = async () => {
    try {
      // Get userId from localStorage (set during login)
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const userId = currentUser._id || currentUser.id || 'guest';

      const response = await axios.get(`http://localhost:3000/api/studio/my-looks/${userId}`);
      setLooks(response.data.looks || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching looks:', error);
      setLoading(false);
    }
  };

  const deleteLook = async (resultId) => {
    if (!window.confirm('Are you sure you want to delete this look?')) return;

    try {
      await axios.delete(`http://localhost:3000/api/studio/delete-look/${resultId}`);
      setLooks(looks.filter(look => look._id !== resultId));
      alert('✅ Look deleted successfully');
    } catch (error) {
      console.error('Error deleting look:', error);
      alert('Failed to delete look. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your looks...</p>
      </div>
    );
  }

  return (
    <div className="my-looks-container">
      <h2>My Saved Looks</h2>

      {looks.length === 0 ? (
        <div className="empty-state">
          <p>You haven't saved any looks yet.</p>
          <button
            className="btn-primary-studio"
            onClick={() => navigate('/studio')}
          >
            Start Creating Looks
          </button>
        </div>
      ) : (
        <div className="looks-grid">
          {looks.map((look) => (
            <div key={look._id} className="look-card">
              <div className="product-image-wrapper">
                <img
                  src={`http://localhost:3000${look.resultImageUrl}`}
                  alt="Saved look"
                  onClick={() => navigate('/studio/result', {
                    state: { resultId: look._id }
                  })}
                  className="product-image"
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <div className="look-info">
                <p className="look-date">
                  {new Date(look.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
                {look.productId && (
                  <p className="look-product">{look.productId.name || 'Product'}</p>
                )}
              </div>
              <div className="look-actions">
                <button
                  onClick={() => navigate('/studio/result', {
                    state: { resultId: look._id }
                  })}
                >
                  👁️ View
                </button>
                <button onClick={() => deleteLook(look._id)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLooks;
