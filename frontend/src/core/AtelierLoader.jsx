import React, { useState, useEffect } from "react";
import "./AtelierLoader.css";

const loadingCaptions = [
    "Curating your personal gallery...",
    "Stitching perfection into every detail...",
    "Hand-picking the finest fabrics for you...",
    "The Atelier is preparing your collection...",
    "Refining the fit for a flawless look...",
    "Crafting elegance, one thread at a time...",
];

const AtelierLoader = () => {
    const [captionIndex, setCaptionIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCaptionIndex((prev) => (prev + 1) % loadingCaptions.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="atelier-loader-container">
            <div className="silk-ripple"></div>
            <div className="atelier-content">
                <div className="stitching-logo">
                    <h1 className="logo loading-logo">TRYMI</h1>
                    <div className="needle-thread"></div>
                </div>
                <div className="loading-text-reveal">
                    <p className="atelier-caption">{loadingCaptions[captionIndex]}</p>
                </div>
            </div>
            <div className="stitch-progress">
                <div className="stitch-line"></div>
            </div>
        </div>
    );
};

export default AtelierLoader;
