'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Calculator, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const SurveyModal = ({ isOpen, onClose, featureData, onSurveySubmit }) => {
  // State management
  const [surveyConfig, setSurveyConfig] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Determine survey type based on feature properties
  const getSurveyType = useCallback((featureData) => {
    if (!featureData?.properties) return 'utama';
    
    const props = featureData.properties;
    const sourceLayer = props.sourceLayer || '';
    
    // Logic to determine survey type based on feature characteristics
    // You can adjust this logic based on your specific requirements
    if (sourceLayer.toLowerCase().includes('tersier') || 
        props.n_aset?.toLowerCase().includes('tersier') ||
        props.nama?.toLowerCase().includes('tersier')) {
      return 'tersier';
    }
    
    return 'utama';
  }, []);

  // Load survey configuration
  const loadSurveyConfig = useCallback(async (surveyType) => {
    try {
      let configData = null;
      
      
      // Try to load from database first
      const response = await fetch(`/api/survey-configs?scheme=${surveyType}`);
      
      if (response.ok) {
        const configs = await response.json();
        // Take the first active config for the scheme
        if (configs && configs.length > 0) {
          configData = configs[0].json;
        }
      } else {
        console.warn(`Failed to load config from database: ${response.status}, falling back to static files`);
      }
      
      // Fallback to static config files if database config not found
      if (!configData) {
        const configResponse = await fetch(`/config/survey-${surveyType}.json`);
        if (!configResponse.ok) {
          throw new Error(`Failed to load survey config: ${configResponse.status}`);
        }
        configData = await configResponse.json();
      }
      
      // Validate config structure
      if (!configData || typeof configData !== 'object') {
        throw new Error('Invalid config data structure');
      }
      
      if (!configData.categories || !Array.isArray(configData.categories)) {
        console.error('Config validation failed - missing categories:', configData);
        throw new Error('Config missing categories array');
      }
      
      setSurveyConfig(configData);
      
      // Initialize form values with appropriate defaults based on field type
      const initialValues = {};
      configData.categories.forEach(category => {
        if (category.subs && Array.isArray(category.subs)) {
          category.subs.forEach(sub => {
            // Set appropriate default values based on field type
            switch (sub.type) {
              case 'boolean':
                initialValues[sub.key] = null; // No selection initially
                break;
              case 'ordinal':
              case 'persentase':
              case 'numerik':
              default:
                initialValues[sub.key] = '';
                break;
            }
          });
        }
      });
      setFormValues(initialValues);
      setErrors({});
      setScore(null);
      setActiveTab(0);
    } catch (error) {
      console.error('Error loading survey config:', error);
      setErrors({ general: 'Gagal memuat konfigurasi survey. Silakan coba lagi.' });
    }
  }, []);

  // Effect to load config when modal opens
  useEffect(() => {
    if (isOpen && featureData) {
      const surveyType = getSurveyType(featureData);
      loadSurveyConfig(surveyType);
    }
  }, [isOpen, featureData, getSurveyType, loadSurveyConfig]);

  // Calculate score when form values change
  const calculateScore = useCallback(async (values) => {
    if (!surveyConfig || Object.keys(values).length === 0) return;
    
    // Check if we have some meaningful values (including boolean false)
    const hasValues = Object.values(values).some(v => {
      // Consider non-null, non-undefined, and non-empty string as valid values
      // Boolean false is a valid value too
      return v !== null && v !== undefined && v !== '';
    });
    
    
    if (!hasValues) {
      setScore(null);
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch('/api/surveys/calculate-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyType: surveyConfig.scheme,
          values
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setScore(result);
      } else {
        console.error('Score calculation failed:', response.status);
      }
    } catch (error) {
      console.error('Error calculating score:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [surveyConfig]);

  // Debounced score calculation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateScore(formValues);
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [formValues, calculateScore]);

  // Handle form field changes
  const handleFieldChange = (fieldKey, value) => {
    
    setFormValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));

    // Clear field error when user starts typing
    if (errors[fieldKey]) {
      setErrors(prev => ({
        ...prev,
        [fieldKey]: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!surveyConfig) return { isValid: false, errors: { general: 'Konfigurasi survey tidak tersedia' } };

    surveyConfig.categories?.forEach(category => {
      category.subs?.forEach(sub => {
        if (sub.required) {
          const value = formValues[sub.key];
          
          // Different validation based on field type
          if (sub.type === 'boolean') {
            // For boolean fields, check if value is not null/undefined
            if (value === null || value === undefined) {
              newErrors[sub.key] = `${sub.label} wajib diisi`;
            }
          } else {
            // For other fields, check if empty or null
            if (!value || value === '') {
              newErrors[sub.key] = `${sub.label} wajib diisi`;
            }
          }
        }
      });
    });

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  // Handle form submission
  const handleSubmit = async () => {
    
    const validation = validateForm();
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Validate required data
    if (!featureData?.properties?.featureId) {
      setErrors({ general: 'Data feature tidak valid - featureId tidak ditemukan' });
      return;
    }

    if (!surveyConfig?.scheme) {
      setErrors({ general: 'Konfigurasi survey tidak valid - scheme tidak ditemukan' });
      return;
    }

    // Check if score calculation is needed and available
    const hasFormValues = Object.values(formValues).some(v => {
      // Consider non-null, non-undefined, and non-empty string as valid values
      // Boolean false is also a valid value
      return v !== null && v !== undefined && v !== '';
    });
    
    if (hasFormValues && !score) {
      setErrors({ general: 'Skor sedang dihitung. Mohon tunggu sebentar dan coba lagi.' });
      
      // Try to trigger score calculation
      calculateScore(formValues);
      return;
    }

    setIsSubmitting(true);
    try {
      const surveyData = {
        featureId: featureData.properties.featureId,
        scheme: surveyConfig.scheme,
        values: formValues
      };


      // Save survey to database using API
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData),
      });

      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Server mengembalikan response yang tidak valid');
      }

      if (!response.ok) {
        console.error('Survey API error response:', result);
        throw new Error(result.error || `HTTP ${response.status}: Gagal menyimpan survey`);
      }
      
      // Validate response structure
      if (!result.survey) {
        console.error('Invalid response structure - missing survey:', result);
        throw new Error('Response tidak valid - data survey tidak ditemukan');
      }

      // Call the callback with the result
      onSurveySubmit({
        ...result.survey,
        message: result.survey.isUpdate ? 'Survey berhasil diperbarui' : 'Survey berhasil disimpan'
      });

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error submitting survey:', error);
      setErrors({ general: error.message || 'Gagal menyimpan survey. Silakan coba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form field based on type
  const renderFormField = (sub) => {
    const value = formValues[sub.key] !== undefined ? formValues[sub.key] : '';
    const hasError = errors[sub.key];

    // Debug logging for boolean fields
    if (sub.type === 'boolean') {
    }

    const baseInputStyle = `
      w-full px-3 py-2 border rounded-md text-sm
      ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      transition-colors duration-200
    `;

    switch (sub.type) {
      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
              <input
                type="radio"
                name={sub.key}
                value="true"
                checked={value === true || value === 'true'}
                onChange={(e) => handleFieldChange(sub.key, true)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <span className={`text-sm ${value === true || value === 'true' ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                Ya
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
              <input
                type="radio"
                name={sub.key}
                value="false"
                checked={value === false || value === 'false'}
                onChange={(e) => handleFieldChange(sub.key, false)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <span className={`text-sm ${value === false || value === 'false' ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                Tidak
              </span>
            </label>
          </div>
        );

      case 'ordinal':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(sub.key, e.target.value)}
            className={baseInputStyle}
          >
            <option value="">Pilih nilai...</option>
            {Array.from({ length: sub.k }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>
                {num} - {getOrdinalLabel(num, sub.k)}
              </option>
            ))}
          </select>
        );

      case 'persentase':
        return (
          <div className="space-y-1">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={value}
              onChange={(e) => handleFieldChange(sub.key, e.target.value)}
              className={baseInputStyle}
              placeholder="0-100"
            />
            <div className="text-xs text-gray-500">Dalam persen (%)</div>
          </div>
        );

      case 'numerik':
        return (
          <div className="space-y-1">
            <input
              type="number"
              min={sub.min}
              max={sub.max}
              step="0.1"
              value={value}
              onChange={(e) => handleFieldChange(sub.key, e.target.value)}
              className={baseInputStyle}
              placeholder={`${sub.min || 0} - ${sub.max || 100}`}
            />
            {(sub.min !== undefined || sub.max !== undefined) && (
              <div className="text-xs text-gray-500">
                Range: {sub.min || 0} - {sub.max || 100}
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(sub.key, e.target.value)}
            className={baseInputStyle}
            placeholder="Masukkan nilai..."
          />
        );
    }
  };

  // Get label for ordinal values
  const getOrdinalLabel = (value, max) => {
    if (max === 5) {
      switch (value) {
        case 1: return 'Sangat Buruk';
        case 2: return 'Buruk';
        case 3: return 'Sedang';
        case 4: return 'Baik';
        case 5: return 'Sangat Baik';
        default: return '';
      }
    }
    return `Nilai ${value}`;
  };

  // Get score display color
  const getScoreColor = (score) => {
    if (!score) return 'text-gray-500';
    const total = score.score || 0;
    if (total >= 85) return 'text-green-600';
    if (total >= 70) return 'text-yellow-600';
    if (total >= 55) return 'text-orange-600';
    return 'text-red-600';
  };

  // Don't render if not open or no data
  if (!isOpen || !featureData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Survey Penilaian Irigasi
              </h2>
              <p className="text-sm text-gray-600">
                {featureData.properties.nama || featureData.properties.n_di || 'Fasilitas Irigasi'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Form Section */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Error Display */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{errors.general}</span>
              </div>
            )}

            {/* Loading State */}
            {!surveyConfig && (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Memuat formulir...</span>
              </div>
            )}

            {/* Survey Form */}
            {surveyConfig && (
              <div className="space-y-6">
                {/* Category Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-4 overflow-x-auto">
                    {surveyConfig.categories?.map((category, index) => (
                      <button
                        key={category.key}
                        onClick={() => setActiveTab(index)}
                        className={`
                          whitespace-nowrap py-2 px-3 text-sm font-medium border-b-2 transition-colors
                          ${activeTab === index
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        {category.label}
                        <span className="ml-1 text-xs text-gray-400">
                          ({category.weight}%)
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Active Category Form */}
                {surveyConfig.categories?.[activeTab] && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h3 className="font-medium text-blue-900">
                        {surveyConfig.categories[activeTab]?.label}
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Bobot: {surveyConfig.categories[activeTab]?.weight}% dari total skor
                      </p>
                    </div>

                    {surveyConfig.categories[activeTab].subs?.map(sub => (
                      <div key={sub.key} className="space-y-2">
                        <label className="block">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">
                              {sub.label}
                              {sub.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({sub.weight} poin)
                            </span>
                          </div>
                          {sub.description && (
                            <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                              {sub.description}
                            </div>
                          )}
                        </label>
                        
                        {renderFormField(sub)}
                        
                        {errors[sub.key] && (
                          <div className="text-sm text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors[sub.key]}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
                    disabled={activeTab === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  
                  <button
                    onClick={() => setActiveTab(Math.min((surveyConfig.categories?.length || 1) - 1, activeTab + 1))}
                    disabled={activeTab === (surveyConfig.categories?.length || 1) - 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Score Panel */}
          <div className="w-80 border-l border-gray-200 p-4 bg-gray-50">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Skor Real-time</h3>
              </div>

              {isCalculating ? (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Menghitung...</span>
                </div>
              ) : score ? (
                <div className="space-y-3">
                  {/* Total Score */}
                  <div className="bg-white p-3 rounded-md border">
                    <div className="text-sm text-gray-600">Total Skor</div>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score.score?.toFixed(1) || 0}
                    </div>
                    <div className={`text-sm font-medium ${getScoreColor(score)}`}>
                      Kategori: {score.qualityClass || 'N/A'}
                    </div>
                  </div>

                  {/* Category Scores */}
                  {score.categoryScores && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Skor per Kategori:</div>
                      {Object.entries(score.categoryScores).map(([key, value]) => {
                        const category = surveyConfig?.categories?.find(c => c.key === key);
                        
                        // Value should now be a simple number
                        const displayValue = typeof value === 'number' ? value.toFixed(1) : String(value);
                        
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-600 truncate">{category?.label || key}</span>
                            <span className="font-medium">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quality Indicator */}
                  {surveyConfig?.grading && score.qualityClass && (
                    <div className="bg-white p-3 rounded-md border">
                      <div className="text-sm text-gray-600 mb-2">Indikator Kualitas</div>
                      {Object.entries(surveyConfig.grading).map(([grade, config]) => (
                        <div 
                          key={grade}
                          className={`
                            flex items-center justify-between text-sm p-1 rounded
                            ${score.qualityClass === grade ? 'bg-blue-100 font-medium' : ''}
                          `}
                        >
                          <span style={{ color: config.color }}>
                            {grade} - {config.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {config.min}-{config.max}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Mulai mengisi form untuk melihat skor
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {surveyConfig && (
              <>
                Skema: {surveyConfig.title} | 
                Versi: {surveyConfig.version}
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !score}
              className="
                px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md 
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center space-x-2
              "
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Survey</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyModal;
