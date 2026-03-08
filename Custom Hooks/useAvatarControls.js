import { useEffect } from 'react';
import useAvatarStore from '../State Management/avatarStore';

const useAvatarControls = () => {
  const { avatar, updateAvatar, resetAvatar } = useAvatarStore();

  const changeSkinTone = (color) => {
    updateAvatar('skinTone', color);
  };

  const changeHeight = (height) => {
    const clampedHeight = Math.max(0.8, Math.min(1.2, height));
    updateAvatar('height', clampedHeight);
  };

  const changeHairStyle = (style) => {
    updateAvatar('hairStyle', style);
  };

  const changeHairColor = (color) => {
    updateAvatar('hairColor', color);
  };

  const changeEyeColor = (color) => {
    updateAvatar('eyeColor', color);
  };

  const randomizeAvatar = () => {
    const skinTones = ['#f5d5b8', '#e6c3a0', '#d4a574', '#9d7a54', '#6b4423'];
    const hairColors = ['#2c1810', '#6b4423', '#d4a574', '#ffd700', '#ff4500'];
    const eyeColors = ['#4a3728', '#1e90ff', '#228b22', '#8b4513'];

    updateAvatar('skinTone', skinTones[Math.floor(Math.random() * skinTones.length)]);
    updateAvatar('hairColor', hairColors[Math.floor(Math.random() * hairColors.length)]);
    updateAvatar('eyeColor', eyeColors[Math.floor(Math.random() * eyeColors.length)]);
    updateAvatar('height', 0.9 + Math.random() * 0.3);
  };

  const exportAvatarConfig = () => {
    return JSON.stringify(avatar, null, 2);
  };

  const importAvatarConfig = (configString) => {
    try {
      const config = JSON.parse(configString);
      Object.entries(config).forEach(([key, value]) => {
        updateAvatar(key, value);
      });
      return true;
    } catch (error) {
      console.error('Invalid avatar configuration:', error);
      return false;
    }
  };

  return {
    avatar,
    changeSkinTone,
    changeHeight,
    changeHairStyle,
    changeHairColor,
    changeEyeColor,
    randomizeAvatar,
    resetAvatar,
    exportAvatarConfig,
    importAvatarConfig,
  };
};

export default useAvatarControls;
