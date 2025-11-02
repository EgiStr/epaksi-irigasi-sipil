'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Calculator, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';

const SurveyModal = ({ isOpen, onClose, featureData, onSurveySubmit }) => {
  const { setModalState } = useSidebar();
  
  // State management
  const [surveyConfig, setSurveyConfig] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isChangingScheme, setIsChangingScheme] = useState(false);
  const [showSchemeDropdown, setShowSchemeDropdown] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState(null); // Store existing survey data
  const [isLoadingSurvey, setIsLoadingSurvey] = useState(false);

  // Handle modal close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setModalState(false); // Notify sidebar context that modal is closed
      onClose();
    }, 300); // Match animation duration
  }, [onClose, setModalState]);

  // Effect to manage sidebar state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setModalState(true); // This will automatically close sidebar
    } else {
      setModalState(false);
    }
  }, [isOpen, setModalState]);

  // Determine survey type based on feature properties
  const getSurveyType = useCallback((featureData) => {
    if (!featureData?.properties) return 'utama';
    
    const props = featureData.properties;
    
    // ✅ PRIORITY 1: Check explicit scheme field (set by scheme selector)
    if (props.scheme) {
      return props.scheme;
    }
    
    // ✅ PRIORITY 2: Check sourceLayer for auto-detection
    const sourceLayer = props.sourceLayer || '';
    
    // Logic to determine survey type based on feature characteristics
    if (sourceLayer.toLowerCase().includes('tersier') || 
        props.n_aset?.toLowerCase().includes('tersier') ||
        props.nama?.toLowerCase().includes('tersier')) {
      return 'tersier';
    }
    
    return 'utama';
  }, []);

  // Load existing survey data for the feature
  const loadExistingSurvey = useCallback(async (featureId, surveyType) => {
    if (!featureId) {
      console.log('No featureId provided, skipping survey load');
      return null;
    }

    setIsLoadingSurvey(true);
    try {
      console.log(`🔍 Loading existing survey for feature: ${featureId}, scheme: ${surveyType}`);
      
      const response = await fetch(`/api/surveys?featureId=${featureId}&scheme=${surveyType}`);
      
      if (!response.ok) {
        console.log('No existing survey found or error loading');
        return null;
      }

      const data = await response.json();
      console.log('📊 Survey API response:', data);
      
      // Check if we have surveys in the response
      if (data.surveys && data.surveys.length > 0) {
        // Get the most recent survey (first one, as API returns sorted by date)
        const latestSurvey = data.surveys[0];
        console.log('✅ Found existing survey:', latestSurvey);
        
        setExistingSurvey(latestSurvey);
        return latestSurvey;
      }
      
      console.log('ℹ️ No existing survey found for this feature');
      return null;
    } catch (error) {
      console.error('❌ Error loading existing survey:', error);
      return null;
    } finally {
      setIsLoadingSurvey(false);
    }
  }, []);

  // Load survey configuration
  const loadSurveyConfig = useCallback(async (surveyType, existingSurveyData = null) => {
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
            // Check if we have existing survey data for this field
            if (existingSurveyData?.values && existingSurveyData.values[sub.key] !== undefined) {
              // Use existing value from survey
              initialValues[sub.key] = existingSurveyData.values[sub.key];
            } else {
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
            }
          });
        }
      });
      
      console.log('📝 Initialized form values:', initialValues);
      setFormValues(initialValues);
      
      // If we have existing survey data with score, set it
      if (existingSurveyData?.scoreTotal !== undefined) {
        setScore({
          score: existingSurveyData.scoreTotal,
          qualityClass: existingSurveyData.scoreClass,
          categoryScores: existingSurveyData.scoreDetail?.categoryScores || {}
        });
      } else {
        setScore(null);
      }
      
      setErrors({});
      setActiveTab(0);
    } catch (error) {
      console.error('Error loading survey config:', error);
      setErrors({ general: 'Gagal memuat konfigurasi survey. Silakan coba lagi.' });
    }
  }, []);

  // Function to change scheme
  const handleChangeScheme = useCallback(async (newScheme) => {
    if (!featureData?.properties?.featureId) {
      alert('❌ Feature ID tidak ditemukan');
      return;
    }

    // Confirm scheme change
    const confirmed = window.confirm(
      `⚠️ Apakah Anda yakin ingin mengubah skema ke "${newScheme === 'utama' ? 'Saluran Utama' : 'Saluran Tersier'}"?\n\n` +
      `Data form yang sudah diisi akan dihapus dan dimulai dari awal.`
    );

    if (!confirmed) {
      setShowSchemeDropdown(false);
      return;
    }

    setIsChangingScheme(true);
    setShowSchemeDropdown(false);

    try {
      // Update scheme via API
      const response = await fetch(`/api/features/${featureData.properties.featureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheme: newScheme }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengupdate skema');
      }

      const result = await response.json();

      // Update local feature data
      if (featureData.properties) {
        featureData.properties.scheme = newScheme;
      }

      // Clear existing survey data when changing scheme
      setExistingSurvey(null);

      // Reload survey config with new scheme (without existing data)
      await loadSurveyConfig(newScheme, null);

      // Show success message
      alert(`✅ Skema berhasil diubah ke "${newScheme === 'utama' ? 'Saluran Utama' : 'Saluran Tersier'}"!\n\nForm telah direset, silakan isi kembali.`);

    } catch (error) {
      console.error('❌ Error changing scheme:', error);
      alert(`Gagal mengubah skema: ${error.message}`);
    } finally {
      setIsChangingScheme(false);
    }
  }, [featureData, loadSurveyConfig, loadExistingSurvey]);

  // Effect to load config and existing survey when modal opens
  useEffect(() => {
    if (isOpen && featureData) {
      const surveyType = getSurveyType(featureData);
      const featureId = featureData.properties?.featureId;
      
      // Load existing survey first, then load config with that data
      const loadData = async () => {
        const existingData = await loadExistingSurvey(featureId, surveyType);
        await loadSurveyConfig(surveyType, existingData);
      };
      
      loadData();
    }
  }, [isOpen, featureData, getSurveyType, loadSurveyConfig, loadExistingSurvey]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen && !isClosing) {
        if (showSchemeDropdown) {
          setShowSchemeDropdown(false);
        } else {
          handleClose();
        }
      }
    };

    const handleClickOutside = (event) => {
      if (showSchemeDropdown && !event.target.closest('.scheme-dropdown-container')) {
        setShowSchemeDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.classList.add('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, isClosing, handleClose, showSchemeDropdown]);

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

      console.log('💾 Submitting survey:', surveyData);
      console.log('📝 Existing survey:', existingSurvey);

      // Determine if this is an update or new survey
      const isUpdate = existingSurvey && existingSurvey.id;
      const apiUrl = isUpdate ? `/api/surveys/${existingSurvey.id}` : '/api/surveys';
      const method = isUpdate ? 'PUT' : 'POST';

      console.log(`📤 ${method} request to: ${apiUrl}`);

      // Save or update survey to database using API
      const response = await fetch(apiUrl, {
        method: method,
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

      console.log('✅ Survey saved successfully:', result);

      // Call the callback with the result
      onSurveySubmit({
        ...result.survey,
        message: isUpdate ? 'Survey berhasil diperbarui! ✅' : 'Survey berhasil disimpan! 🎉'
      });

      // Close modal
      handleClose();
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
    <div 
      className={`survey-modal-overlay fixed inset-0 ${isClosing ? 'closing' : ''}`}
      style={{ zIndex: 1001 }}
      onClick={() => !isClosing && handleClose()}
    >
      {/* Modal positioned at center */}
      <div 
        className={`survey-modal-bottom fixed bg-white rounded-3xl shadow-2xl max-h-[80vh] flex flex-col ${isClosing ? 'closing' : ''}`}
        style={{ 
          zIndex: 1002,
          maxWidth: '1200px', 
          width: 'calc(100% - 2rem)',
          left: '50%',
          top: '50%',
          transform: 'translateX(-50%) translateY(-50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  IKSI Penilaian Irigasi
                </h2>
                {surveyConfig && (
                  <div className="relative scheme-dropdown-container">
                    <button
                      onClick={() => setShowSchemeDropdown(!showSchemeDropdown)}
                      disabled={isChangingScheme}
                      className={`
                        px-2.5 py-0.5 text-xs font-semibold rounded-full
                        transition-all duration-200
                        ${surveyConfig.scheme === 'utama' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200' 
                          : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                        }
                        ${isChangingScheme ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                      `}
                      title="Klik untuk mengubah skema"
                    >
                      {isChangingScheme ? (
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          Mengubah...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          {surveyConfig.scheme === 'utama' ? '🏗️ Utama' : '🌾 Tersier'}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      )}
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showSchemeDropdown && !isChangingScheme && (
                      <div 
                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                      >
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Ubah Skema Survey
                          </div>
                          
                          {/* Option: Utama */}
                          <button
                            onClick={() => handleChangeScheme('utama')}
                            disabled={surveyConfig.scheme === 'utama'}
                            className={`
                              w-full text-left px-3 py-2.5 rounded-md transition-colors
                              ${surveyConfig.scheme === 'utama'
                                ? 'bg-blue-50 text-blue-700 cursor-default'
                                : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏗️</span>
                              <div className="flex-1">
                                <div className="font-medium text-sm">Saluran Utama</div>
                                <div className="text-xs text-gray-500">Primer/Sekunder</div>
                              </div>
                              {surveyConfig.scheme === 'utama' && (
                                <CheckCircle className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </button>
                          
                          {/* Option: Tersier */}
                          <button
                            onClick={() => handleChangeScheme('tersier')}
                            disabled={surveyConfig.scheme === 'tersier'}
                            className={`
                              w-full text-left px-3 py-2.5 rounded-md transition-colors
                              ${surveyConfig.scheme === 'tersier'
                                ? 'bg-green-50 text-green-700 cursor-default'
                                : 'hover:bg-green-50 text-gray-700 hover:text-green-700'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🌾</span>
                              <div className="flex-1">
                                <div className="font-medium text-sm">Saluran Tersier</div>
                                <div className="text-xs text-gray-500">Ke lahan pertanian</div>
                              </div>
                              {surveyConfig.scheme === 'tersier' && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          </button>
                        </div>
                        
                        <div className="border-t border-gray-100 px-3 py-2 bg-yellow-50">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-yellow-800">
                              Mengubah skema akan mereset semua data form yang sudah diisi
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {featureData.properties.nama || featureData.properties.n_di || 'Fasilitas Irigasi'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all duration-200 bg-white bg-opacity-50"
            title="Tutup modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Form Section */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Info: Editing Existing Survey */}
            {existingSurvey && !isLoadingSurvey && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-blue-900">Mengedit Survey yang Sudah Ada</span>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Survey terakhir diisi: {new Date(existingSurvey.createdAt).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
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
            {(!surveyConfig || isLoadingSurvey) && (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">
                  {isLoadingSurvey ? 'Memuat data survey...' : 'Memuat formulir...'}
                </span>
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
          <div className="w-80 border-l border-gray-200 px-4 py-4 bg-gradient-to-b from-gray-50 to-white">
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
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between rounded-b-3xl">
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
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !score || isLoadingSurvey}
              className="
                px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md 
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center space-x-2
              "
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>{existingSurvey ? 'Memperbarui...' : 'Menyimpan...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{existingSurvey ? 'Perbarui Survey' : 'Simpan Survey'}</span>
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
