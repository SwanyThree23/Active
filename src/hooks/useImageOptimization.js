/**
 * Image Optimization Hook
 * Handles product image processing, optimization, and gallery management
 */

import { useState, useCallback } from 'react';
import { imageService } from '../services/apiService';
import { useImageStore, useAppStore } from '../store/useStore';

export function useImageOptimization() {
  const {
    images,
    addImage,
    removeImage,
    updateImage,
    selectedImage,
    selectImage,
    isProcessing,
    setProcessing,
    activeCategory,
    setActiveCategory,
    selectedImages,
    toggleImageSelection,
    selectAllImages,
    clearSelection
  } = useImageStore();

  const { incrementAnalytics } = useAppStore();

  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  /**
   * Upload and process a single image
   */
  const uploadImage = useCallback(async (file, options = {}) => {
    const {
      category = 'product',
      autoOptimize = true,
      generateVariants = false
    } = options;

    setError(null);

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Base image data
      const imageData = {
        name: file.name,
        originalSize: file.size,
        type: file.type,
        category,
        previewUrl,
        originalUrl: previewUrl,
        optimized: false,
        variants: null,
        colors: null,
        altText: '',
        tags: []
      };

      // Add to store
      addImage(imageData);

      // Auto optimize if enabled
      if (autoOptimize) {
        const optimized = await imageService.optimizeImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.9,
          format: 'webp'
        });

        if (optimized.success) {
          updateImage(imageData.id, {
            optimizedUrl: optimized.url,
            optimizedSize: optimized.optimizedSize,
            compressionRatio: optimized.compressionRatio,
            dimensions: optimized.dimensions,
            optimized: true
          });

          incrementAnalytics('imagesProcessed');
        }
      }

      // Generate variants if requested
      if (generateVariants) {
        const variants = await imageService.generateVariants(file);
        updateImage(imageData.id, { variants });
      }

      return imageData;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [addImage, updateImage, incrementAnalytics]);

  /**
   * Upload multiple images
   */
  const uploadMultipleImages = useCallback(async (files, options = {}) => {
    setProcessing(true);
    setProgress(0);

    const results = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const result = await uploadImage(files[i], options);
      results.push(result);
      setProgress(((i + 1) / total) * 100);
    }

    setProcessing(false);
    setProgress(0);
    return results;
  }, [uploadImage, setProcessing]);

  /**
   * Optimize an existing image
   */
  const optimizeImage = useCallback(async (imageId, options = {}) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return null;

    setProcessing(true);
    setError(null);

    try {
      // Fetch the original file
      const response = await fetch(image.originalUrl);
      const blob = await response.blob();
      const file = new File([blob], image.name, { type: image.type });

      const optimized = await imageService.optimizeImage(file, options);

      if (optimized.success) {
        updateImage(imageId, {
          optimizedUrl: optimized.url,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: optimized.compressionRatio,
          dimensions: optimized.dimensions,
          optimized: true
        });

        incrementAnalytics('imagesProcessed');
        setProcessing(false);
        return optimized;
      }

      throw new Error('Optimization failed');
    } catch (err) {
      setError(err.message);
      setProcessing(false);
      return null;
    }
  }, [images, updateImage, incrementAnalytics, setProcessing]);

  /**
   * Batch optimize selected images
   */
  const batchOptimize = useCallback(async (options = {}) => {
    if (selectedImages.length === 0) return [];

    setProcessing(true);
    setProgress(0);

    const results = [];
    const total = selectedImages.length;

    for (let i = 0; i < selectedImages.length; i++) {
      const result = await optimizeImage(selectedImages[i], options);
      results.push(result);
      setProgress(((i + 1) / total) * 100);
    }

    setProcessing(false);
    setProgress(0);
    clearSelection();
    return results;
  }, [selectedImages, optimizeImage, setProcessing, clearSelection]);

  /**
   * Extract colors from an image
   */
  const extractColors = useCallback(async (imageId) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return null;

    const result = await imageService.extractColors(image.previewUrl);

    if (result.success) {
      updateImage(imageId, { colors: result.colors });
      return result.colors;
    }

    return null;
  }, [images, updateImage]);

  /**
   * Generate AI alt text for an image
   */
  const generateAltText = useCallback(async (imageId, apiKey) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !apiKey) return null;

    // In a real implementation, this would use vision API
    // For now, generate placeholder based on category
    const altTexts = {
      lifestyle: `Elegant lifestyle shot showcasing ${image.name.replace(/\.[^/.]+$/, '')}`,
      detail: `Close-up detail view of ${image.name.replace(/\.[^/.]+$/, '')}`,
      product: `Product image of ${image.name.replace(/\.[^/.]+$/, '')}`,
      bundle: `Product bundle featuring ${image.name.replace(/\.[^/.]+$/, '')}`
    };

    const altText = altTexts[image.category] || `Image: ${image.name}`;
    updateImage(imageId, { altText });
    return altText;
  }, [images, updateImage]);

  /**
   * Get images filtered by category
   */
  const getFilteredImages = useCallback(() => {
    if (activeCategory === 'all') return images;
    return images.filter(img => img.category === activeCategory);
  }, [images, activeCategory]);

  /**
   * Get optimization stats
   */
  const getOptimizationStats = useCallback(() => {
    const optimizedImages = images.filter(img => img.optimized);
    const totalOriginalSize = images.reduce((sum, img) => sum + (img.originalSize || 0), 0);
    const totalOptimizedSize = optimizedImages.reduce((sum, img) => sum + (img.optimizedSize || 0), 0);

    return {
      total: images.length,
      optimized: optimizedImages.length,
      pending: images.length - optimizedImages.length,
      totalOriginalSize,
      totalOptimizedSize,
      totalSaved: totalOriginalSize - totalOptimizedSize,
      averageCompression: optimizedImages.length > 0
        ? optimizedImages.reduce((sum, img) => sum + (img.compressionRatio || 0), 0) / optimizedImages.length
        : 0
    };
  }, [images]);

  /**
   * Export images data as JSON
   */
  const exportImagesData = useCallback(() => {
    const data = images.map(img => ({
      name: img.name,
      category: img.category,
      dimensions: img.dimensions,
      altText: img.altText,
      tags: img.tags,
      colors: img.colors,
      optimized: img.optimized,
      compressionRatio: img.compressionRatio
    }));

    return JSON.stringify(data, null, 2);
  }, [images]);

  return {
    // State
    images,
    selectedImage,
    isProcessing,
    error,
    progress,
    activeCategory,
    selectedImages,

    // Actions
    uploadImage,
    uploadMultipleImages,
    optimizeImage,
    batchOptimize,
    extractColors,
    generateAltText,
    removeImage,
    updateImage,
    selectImage,
    setActiveCategory,
    toggleImageSelection,
    selectAllImages,
    clearSelection,

    // Computed
    filteredImages: getFilteredImages(),
    stats: getOptimizationStats(),
    exportImagesData
  };
}

export default useImageOptimization;
