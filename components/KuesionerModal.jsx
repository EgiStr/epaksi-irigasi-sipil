'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Calculator, Save, AlertCircle, CheckCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';

const KuesionerModal = ({ isOpen, onClose, featureData, onSubmit }) => {
  // State management
  const [kuesionerConfig, setKuesionerConfig] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [existingKuesioner, setExistingKuesioner] = useState(null);
  const [isLoadingKuesioner, setIsLoadingKuesioner] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubs, setExpandedSubs] = useState({});

  // Handle modal close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // Determine scheme based on feature data
  const getSchemeType = useCallback((featureData) => {
    if (!featureData) return 'primer';
    
    // Helper function to check for kuarter indicators
    const isKuarter = (text) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      return lowerText.includes('kuarter') || 
             lowerText.includes('quarter') || 
             lowerText.includes('s16') ||
             lowerText.includes('s 16') ||
             lowerText.includes('s15') ||
             lowerText.includes('s 15');
    };
    
    // Helper function to check for other schemes
    const checkScheme = (text, schemeType) => {
      if (!text) return false;
      return text.toLowerCase().includes(schemeType);
    };
    
    // Check all possible fields for kuarter (highest priority)
    const allFields = [
      featureData.scheme,
      featureData.properties?.scheme,
      featureData.sourceLayer,
      featureData.properties?.sourceLayer,
      featureData.name,
      featureData.properties?.nama,
      featureData.properties?.n_di,
      featureData.properties?.description,
      JSON.stringify(featureData.props || {}), // Check props JSON
      JSON.stringify(featureData.properties || {}) // Check all properties
    ];
    
    // First check for kuarter in any field
    if (allFields.some(field => isKuarter(field))) {
      console.log('🎯 Detected scheme: KUARTER (S15)');
      return 'kuarter';
    }
    
    // Then check for other schemes
    if (allFields.some(field => checkScheme(field, 'sekunder'))) {
      console.log('🎯 Detected scheme: SEKUNDER');
      return 'sekunder';
    }
    
    if (allFields.some(field => checkScheme(field, 'tersier'))) {
      console.log('🎯 Detected scheme: TERSIER');
      return 'tersier';
    }
    
    if (allFields.some(field => checkScheme(field, 'primer'))) {
      console.log('🎯 Detected scheme: PRIMER');
      return 'primer';
    }
    
    // Default to primer
    console.log('🎯 Detected scheme: PRIMER (default)');
    return 'primer';
  }, []);

  // Load existing kuesioner data
  const loadExistingKuesioner = useCallback(async (featureId, scheme) => {
    if (!featureId) {
      console.log('No featureId provided');
      return null;
    }

    setIsLoadingKuesioner(true);
    try {
      console.log(`🔍 Loading existing kuesioner for feature: ${featureId}, scheme: ${scheme}`);
      
      const response = await fetch(`/api/kuesioner?featureId=${featureId}&scheme=${scheme}`);
      
      if (!response.ok) {
        console.log('No existing kuesioner found');
        return null;
      }

      const data = await response.json();
      console.log('📊 Kuesioner API response:', data);
      
      if (data.kuesioner && data.kuesioner.length > 0) {
        const latestKuesioner = data.kuesioner[0];
        console.log('✅ Found existing kuesioner:', latestKuesioner);
        
        setExistingKuesioner(latestKuesioner);
        return latestKuesioner;
      }
      
      console.log('ℹ️ No existing kuesioner found');
      return null;
    } catch (error) {
      console.error('❌ Error loading kuesioner:', error);
      return null;
    } finally {
      setIsLoadingKuesioner(false);
    }
  }, []);

  // Load kuesioner configuration
  const loadKuesionerConfig = useCallback(async (scheme, existingData = null) => {
    try {
      const configResponse = await fetch(`/config/kuesioner-${scheme}.json`);
      if (!configResponse.ok) {
        throw new Error(`Failed to load config: ${configResponse.status}`);
      }
      const configData = await configResponse.json();
      
      setKuesionerConfig(configData);
      
      // Initialize form values
      const initialValues = {};
      
      // Expand all categories and subs by default
      const initialExpandedCategories = {};
      const initialExpandedSubs = {};
      
      configData.categories?.forEach(category => {
        initialExpandedCategories[category.key] = true;
        
        category.subs?.forEach(sub => {
          initialExpandedSubs[sub.key] = true;
          
          sub.subs?.forEach(field => {
            // Use existing value if available
            if (existingData?.values && existingData.values[field.key] !== undefined) {
              initialValues[field.key] = existingData.values[field.key];
            } else {
              initialValues[field.key] = '';
            }
          });
        });
      });
      
      setFormValues(initialValues);
      setExpandedCategories(initialExpandedCategories);
      setExpandedSubs(initialExpandedSubs);
      
      // Set existing score if available
      if (existingData?.scoreTotal !== undefined) {
        setScore({
          score: existingData.scoreTotal,
          qualityClass: existingData.scoreClass,
          categoryScores: existingData.scoreDetail?.categoryScores || {}
        });
      } else {
        setScore(null);
      }
      
      setErrors({});
    } catch (error) {
      console.error('Error loading kuesioner config:', error);
      setErrors({ general: 'Gagal memuat konfigurasi kuesioner' });
    }
  }, []);

  // Effect to load config and existing data
  useEffect(() => {
    if (isOpen && featureData) {
      const scheme = getSchemeType(featureData);
      const featureId = featureData.properties?.featureId;
      
      const loadData = async () => {
        const existingData = await loadExistingKuesioner(featureId, scheme);
        await loadKuesionerConfig(scheme, existingData);
      };
      
      loadData();
    }
  }, [isOpen, featureData, getSchemeType, loadKuesionerConfig, loadExistingKuesioner]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.classList.add('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, isClosing, handleClose]);

  // Calculate score when form values change
  const calculateScore = useCallback(async (values) => {
    if (!kuesionerConfig || Object.keys(values).length === 0) return;
    
    const hasValues = Object.values(values).some(v => v !== null && v !== undefined && v !== '');
    if (!hasValues) {
      setScore(null);
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch('/api/kuesioner/calculate-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheme: kuesionerConfig.scheme,
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
  }, [kuesionerConfig]);

  // Debounced score calculation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateScore(formValues);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formValues, calculateScore]);

  // Handle form field changes
  const handleFieldChange = (fieldKey, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));

    if (errors[fieldKey]) {
      setErrors(prev => ({
        ...prev,
        [fieldKey]: null
      }));
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  // Toggle sub expansion
  const toggleSub = (subKey) => {
    setExpandedSubs(prev => ({
      ...prev,
      [subKey]: !prev[subKey]
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!kuesionerConfig) return { isValid: false, errors: { general: 'Konfigurasi tidak tersedia' } };

    kuesionerConfig.categories?.forEach(category => {
      category.subs?.forEach(sub => {
        sub.subs?.forEach(field => {
          if (field.required) {
            const value = formValues[field.key];
            if (!value || value === '') {
              newErrors[field.key] = `${field.label} wajib diisi`;
            }
          }
        });
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

    if (!featureData?.properties?.featureId) {
      setErrors({ general: 'Data feature tidak valid' });
      return;
    }

    if (!kuesionerConfig?.scheme) {
      setErrors({ general: 'Konfigurasi kuesioner tidak valid' });
      return;
    }

    const hasFormValues = Object.values(formValues).some(v => v !== null && v !== undefined && v !== '');
    if (hasFormValues && !score) {
      setErrors({ general: 'Skor sedang dihitung. Mohon tunggu sebentar.' });
      calculateScore(formValues);
      return;
    }

    setIsSubmitting(true);
    try {
      const kuesionerData = {
        featureId: featureData.properties.featureId,
        scheme: kuesionerConfig.scheme,
        values: formValues
      };

      const isUpdate = existingKuesioner && existingKuesioner.id;
      const apiUrl = isUpdate ? `/api/kuesioner` : '/api/kuesioner';
      const method = isUpdate ? 'PUT' : 'POST';

      const requestBody = isUpdate 
        ? { id: existingKuesioner.id, values: formValues }
        : kuesionerData;

      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error('Response tidak valid dari server');
      }

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Gagal menyimpan kuesioner`);
      }
      
      if (!result.kuesioner) {
        throw new Error('Response tidak valid - data kuesioner tidak ditemukan');
      }

      console.log('✅ Kuesioner saved successfully:', result);

      onSubmit({
        ...result.kuesioner,
        message: isUpdate ? 'Kuesioner berhasil diperbarui! ✅' : 'Kuesioner berhasil disimpan! 🎉'
      });

      handleClose();
    } catch (error) {
      console.error('Error submitting kuesioner:', error);
      setErrors({ general: error.message || 'Gagal menyimpan kuesioner' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form field
  const renderFormField = (field) => {
    const value = formValues[field.key] !== undefined ? formValues[field.key] : '';
    const hasError = errors[field.key];

    return (
      <div className="space-y-1">
        <input
          type="number"
          min={field.min || 1}
          max={field.max || 100}
          step="0.1"
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          className={`
            w-full px-3 py-2 border rounded-md text-sm
            ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-colors duration-200
          `}
          placeholder={`${field.min || 1}-${field.max || 100}`}
        />
        {hasError && (
          <div className="text-sm text-red-600 flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>{hasError}</span>
          </div>
        )}
      </div>
    );
  };

  // Get score color
  const getScoreColor = (score) => {
    if (!score) return 'text-gray-500';
    const total = score.score || 0;
    if (total >= 70) return 'text-green-600';
    if (total >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen || !featureData) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 z-[1001] flex items-center justify-center ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      onClick={() => !isClosing && handleClose()}
    >
      <div 
        className={`bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}
        style={{ 
          maxWidth: '1400px', 
          width: 'calc(100% - 2rem)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-purple-600" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Form Kuesioner
                </h2>
                {kuesionerConfig && (
                  <span className={`
                    px-2.5 py-0.5 text-xs font-semibold rounded-full
                    ${kuesionerConfig.scheme === 'primer' ? 'bg-blue-100 text-blue-700 border border-blue-300' : ''}
                    ${kuesionerConfig.scheme === 'sekunder' ? 'bg-green-100 text-green-700 border border-green-300' : ''}
                    ${kuesionerConfig.scheme === 'tersier' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : ''}
                  `}>
                    {kuesionerConfig.scheme === 'primer' && '🔵 Primer'}
                    {kuesionerConfig.scheme === 'sekunder' && '🟢 Sekunder'}
                    {kuesionerConfig.scheme === 'tersier' && '🟡 Tersier'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {featureData?.properties?.nama || featureData?.properties?.n_di || featureData?.name || 'Fasilitas Irigasi'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all"
            title="Tutup modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Form Section */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Editing existing info */}
            {existingKuesioner && !isLoadingKuesioner && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-blue-900">Mengedit Kuesioner yang Sudah Ada</span>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Terakhir diisi: {new Date(existingKuesioner.createdAt).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{errors.general}</span>
              </div>
            )}

            {/* Loading State */}
            {(!kuesionerConfig || isLoadingKuesioner) && (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">
                  {isLoadingKuesioner ? 'Memuat data...' : 'Memuat formulir...'}
                </span>
              </div>
            )}

            {/* Kuesioner Form */}
            {kuesionerConfig && (
              <div className="space-y-4">
                {kuesionerConfig.categories?.map((category) => (
                  <div key={category.key} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.key)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">{category.label}</span>
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                          Bobot: {category.weight}%
                        </span>
                      </div>
                      {expandedCategories[category.key] ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </button>

                    {/* Category Content */}
                    {expandedCategories[category.key] && (
                      <div className="p-4 space-y-3 bg-white">
                        {category.subs?.map((sub) => (
                          <div key={sub.key} className="border border-gray-100 rounded-md overflow-hidden">
                            {/* Sub Header */}
                            <button
                              onClick={() => toggleSub(sub.key)}
                              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-800">{sub.label}</span>
                                <span className="text-xs text-gray-500">
                                  ({sub.weight} poin)
                                </span>
                              </div>
                              {expandedSubs[sub.key] ? (
                                <ChevronUp className="w-3 h-3 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-gray-500" />
                              )}
                            </button>

                            {/* Sub Content - Fields */}
                            {expandedSubs[sub.key] && (
                              <div className="p-3 space-y-3 bg-white">
                                {sub.subs?.map((field) => (
                                  <div key={field.key} className="space-y-1">
                                    <label className="block">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">
                                          {field.label}
                                          {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          Bobot: {field.weight}%
                                        </span>
                                      </div>
                                      {field.description && (
                                        <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                          {field.description}
                                        </div>
                                      )}
                                    </label>
                                    {renderFormField(field)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Score Panel */}
          <div className="w-80 border-l border-gray-200 px-4 py-4 bg-gradient-to-b from-gray-50 to-white">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-purple-600" />
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
                    <div className="text-sm text-gray-600">Nilai Final</div>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score.score?.toFixed(2) || 0}%
                    </div>
                    <div className={`text-sm font-medium ${getScoreColor(score)}`}>
                      Kondisi: {score.qualityClass || 'N/A'}
                    </div>
                  </div>

                  {/* Category Scores */}
                  {score.categoryScores && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Skor per Kategori:</div>
                      {Object.entries(score.categoryScores).map(([key, value]) => {
                        const displayValue = typeof value === 'object' ? value.weightedScore?.toFixed(2) : value.toFixed(2);
                        const label = typeof value === 'object' ? value.label : key;
                        
                        return (
                          <div key={key} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                            <span className="text-gray-600 truncate">{label}</span>
                            <span className="font-medium">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quality Indicator */}
                  {kuesionerConfig?.grading && score.qualityClass && (
                    <div className="bg-white p-3 rounded-md border">
                      <div className="text-sm text-gray-600 mb-2">Indikator Kualitas</div>
                      {Object.entries(kuesionerConfig.grading).map(([grade, config]) => (
                        <div 
                          key={grade}
                          className={`
                            flex items-center justify-between text-sm p-1 rounded
                            ${score.qualityClass === grade ? 'bg-purple-100 font-medium' : ''}
                          `}
                        >
                          <span style={{ color: config.color }}>
                            {grade}
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
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between rounded-b-3xl">
          <div className="text-sm text-gray-500">
            {kuesionerConfig && (
              <>
                {kuesionerConfig.title} | Versi: {kuesionerConfig.version}
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !score || isLoadingKuesioner}
              className="
                px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md 
                hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center space-x-2
              "
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>{existingKuesioner ? 'Memperbarui...' : 'Menyimpan...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{existingKuesioner ? 'Perbarui' : 'Simpan'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KuesionerModal;
