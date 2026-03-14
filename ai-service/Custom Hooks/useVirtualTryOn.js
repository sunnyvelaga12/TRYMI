import { useState, useCallback } from 'react';
import useAvatarStore from '../State Management/avatarStore';
import useClothingStore from '../State Management/clothingStore';
import { calculateClothingScale, calculateFitQuality } from '../Utility Functions/clothingFitCalculator';

const useVirtualTryOn = () => {
  const { avatar } = useAvatarStore();
  const { outfit, selectClothingItem, clearOutfit } = useClothingStore();
  const [fitScores, setFitScores] = useState({});

  const tryOnClothing = useCallback((category, item, bodyMeasurements) => {
    // Calculate fit
    if (bodyMeasurements && item.measurements) {
      const fitScore = calculateFitQuality(bodyMeasurements, item.measurements);
      setFitScores(prev => ({ ...prev, [item.id]: fitScore }));
    }

    // Calculate scale
    const scale = calculateClothingScale(bodyMeasurements, item.size || 'M');
    
    // Add scale to item
    const itemWithScale = {
      ...item,
      scale,
    };

    selectClothingItem(category, itemWithScale);
  }, [selectClothingItem]);

  const removeClothing = useCallback((category) => {
    selectClothingItem(category, null);
  }, [selectClothingItem]);

  const getRecommendedSize = useCallback((bodyMeasurements, garment) => {
    if (!bodyMeasurements || !garment.measurements) return 'M';

    const sizes = ['XS', 'S', 'M', 'L', 'XL'];
    const scores = sizes.map(size => {
      const garmentWithSize = { ...garment, size };
      return calculateFitQuality(bodyMeasurements, garment.measurements);
    });

    const bestSizeIndex = scores.indexOf(Math.max(...scores));
    return sizes[bestSizeIndex];
  }, []);

  const saveOutfit = useCallback(() => {
    const outfitData = {
      id: Date.now().toString(),
      name: `Outfit ${new Date().toLocaleDateString()}`,
      outfit: { ...outfit },
      avatar: { ...avatar },
      timestamp: new Date().toISOString(),
    };

    // Save to localStorage or send to backend
    const savedOutfits = JSON.parse(localStorage.getItem('savedOutfits') || '[]');
    savedOutfits.push(outfitData);
    localStorage.setItem('savedOutfits', JSON.stringify(savedOutfits));

    return outfitData;
  }, [outfit, avatar]);

  const loadOutfit = useCallback((outfitData) => {
    Object.entries(outfitData.outfit).forEach(([category, item]) => {
      if (item) {
        selectClothingItem(category, item);
      }
    });
  }, [selectClothingItem]);

  return {
    outfit,
    fitScores,
    tryOnClothing,
    removeClothing,
    clearOutfit,
    getRecommendedSize,
    saveOutfit,
    loadOutfit,
  };
};

export default useVirtualTryOn;
