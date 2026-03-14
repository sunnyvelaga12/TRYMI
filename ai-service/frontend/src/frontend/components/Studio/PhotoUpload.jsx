import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PhotoUpload = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera. Please upload a photo instead.');
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setPreviewUrl(canvas.toDataURL());
      stopCamera();
    }, 'image/jpeg');
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const uploadPhoto = async () => {
    if (!selectedImage) {
      alert('Please select a photo first');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', selectedImage);

    try {
      console.log('📤 Uploading photo to backend...');
      const response = await axios.post('https://trymi-backend.onrender.com/api/studio/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('✅ Upload successful:', response.data);
      localStorage.setItem('studioPhotoId', response.data.photoId);
      navigate('/studio/select-clothing');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      if (error.response) {
        alert(`Upload failed: ${error.response.data.message || 'Server error'}`);
      } else if (error.request) {
        alert('Cannot connect to server. Make sure backend is running on port 3000.');
      } else {
        alert('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="photo-upload-container">
      <h2>Upload Your Photo</h2>

      <div className="upload-options">
        {!cameraActive && !previewUrl && (
          <>
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current.click()}
            >
              📁 Choose from Gallery
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </>
        )}

        {cameraActive && (
          <div className="camera-view">
            <video ref={videoRef} autoPlay playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="camera-controls">
              <button onClick={capturePhoto}>Capture</button>
              <button onClick={stopCamera}>Cancel</button>
            </div>
          </div>
        )}

        {previewUrl && (
          <div className="preview-section">
            <img src={previewUrl} alt="Preview" className="photo-preview" />
            <div className="preview-actions">
              <button
                className="btn-primary-studio"
                onClick={uploadPhoto}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Continue to Select Outfit'}
              </button>
              <button
                className="btn-secondary-studio"
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewUrl(null);
                }}
              >
                Choose Different Photo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="photo-tips">
        <h4>Photo Guidelines:</h4>
        <ul>
          <li>Stand 3-4 feet from camera</li>
          <li>Arms slightly away from body</li>
          <li>Natural standing pose</li>
          <li>Good lighting from front</li>
        </ul>
      </div>
    </div>
  );
};

export default PhotoUpload;


