import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook untuk mengelola data survey dan scoring
 */
export function useSurveyData() {
  const [surveys, setSurveys] = useState([]);
  const [surveysByFeature, setSurveysByFeature] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch surveys data
  const fetchSurveys = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      // Add filters to URL params
      if (filters.featureId) params.append('featureId', filters.featureId);
      if (filters.scheme) params.append('scheme', filters.scheme);
      if (filters.scoreClass) params.append('scoreClass', filters.scoreClass);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/surveys?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch surveys: ${response.status}`);
      }

      const data = await response.json();
      setSurveys(data.surveys || []);
      
      // Create map for quick feature lookup
      const featureMap = new Map();
      (data.surveys || []).forEach(survey => {
        const existing = featureMap.get(survey.featureId);
        
        // Keep the most recent survey for each feature
        if (!existing || new Date(survey.createdAt) > new Date(existing.createdAt)) {
          featureMap.set(survey.featureId, survey);
        }
      });
      
      setSurveysByFeature(featureMap);
      
    } catch (err) {
      console.error('Error fetching surveys:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get survey for specific feature
  const getSurveyForFeature = useCallback((featureId) => {
    return surveysByFeature.get(featureId) || null;
  }, [surveysByFeature]);

  // Get quality class for feature
  const getQualityClass = useCallback((featureId) => {
    const survey = getSurveyForFeature(featureId);
    return survey?.scoreClass || null;
  }, [getSurveyForFeature]);

  // Get score for feature
  const getScore = useCallback((featureId) => {
    const survey = getSurveyForFeature(featureId);
    return survey?.scoreTotal || null;
  }, [getSurveyForFeature]);

  // Get quality color based on class
  const getQualityColor = useCallback((qualityClass) => {
    switch (qualityClass) {
      case 'A': return '#22c55e'; // Green
      case 'B': return '#eab308'; // Yellow
      case 'C': return '#f97316'; // Orange
      case 'D': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray for no survey
    }
  }, []);

  // Get quality color for feature
  const getFeatureQualityColor = useCallback((featureId) => {
    const qualityClass = getQualityClass(featureId);
    return getQualityColor(qualityClass);
  }, [getQualityClass, getQualityColor]);

  // Reload surveys (useful after submitting a new survey)
  const reloadSurveys = useCallback((filters = {}) => {
    fetchSurveys(filters);
  }, [fetchSurveys]);

  // Statistics - enhanced to include total features from map
  const getStatistics = useCallback((totalFeatures = 0) => {
    const surveyed = surveys.length;
    const classCounts = {
      A: surveys.filter(s => s.scoreClass === 'A').length,
      B: surveys.filter(s => s.scoreClass === 'B').length,
      C: surveys.filter(s => s.scoreClass === 'C').length,
      D: surveys.filter(s => s.scoreClass === 'D').length
    };
    
    // Quality breakdown based on score ranges
    const qualityBreakdown = {
      baik: surveys.filter(s => (s.scoreTotal || 0) >= 80).length,
      sedang: surveys.filter(s => (s.scoreTotal || 0) >= 50 && (s.scoreTotal || 0) < 80).length,
      buruk: surveys.filter(s => (s.scoreTotal || 0) < 50).length
    };
    
    const averageScore = surveyed > 0 
      ? surveys.reduce((sum, s) => sum + (s.scoreTotal || 0), 0) / surveyed 
      : 0;

    return {
      total: totalFeatures,
      surveyed,
      classCounts,
      qualityBreakdown,
      averageScore: Math.round(averageScore * 10) / 10
    };
  }, [surveys]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  return {
    surveys,
    surveysByFeature,
    loading,
    error,
    fetchSurveys,
    reloadSurveys,
    getSurveyForFeature,
    getQualityClass,
    getScore,
    getQualityColor,
    getFeatureQualityColor,
    getStatistics
  };
}
