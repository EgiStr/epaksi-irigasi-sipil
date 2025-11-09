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
  const [allExistingKuesioners, setAllExistingKuesioners] = useState([]);
  const [isLoadingKuesioner, setIsLoadingKuesioner] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubs, setExpandedSubs] = useState({});
  const [showSchemeDropdown, setShowSchemeDropdown] = useState(false);
  const [isChangingScheme, setIsChangingScheme] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);

  // Handle modal close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // Determine scheme based on feature data (auto-detection fallback)
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

    // Helper function to check for bangunan indicators and return specific type
    const getBangunanType = (text) => {
      if (!text) return null;
      const upperText = text.toUpperCase();
      if (upperText.includes('B01')) return 'bendung-tetap';
      if (upperText.includes('C06')) return 'jembatan';
      if (upperText.includes('C09')) return 'tempat-cuci';
      if (upperText.includes('C13')) return 'terjunan';
      if (upperText.includes('F02')) return 'perumahan';
      if (upperText.includes('F03')) return 'gudang';
      if (upperText.includes('P02')) return 'bagi-sadap';
      if (upperText.includes('P03')) return 'sadap';
      if (upperText.includes('P21')) return 'box-tersier';
      if (upperText.includes('P22')) return 'box-kuarter';
      // Remove the generic 'bangunan' fallback
      return null;
    };

    // Helper function to check for other schemes
    const checkScheme = (text, schemeType) => {
      if (!text) return false;
      return text.toLowerCase().includes(schemeType);
    };

    // Check all possible fields for kuarter (highest priority)
    const allFields = [
      featureData.scheme,
      featureData.sourceLayer,
      featureData.name,
      JSON.stringify(featureData.props || {}), // Check props JSON
      featureData.properties?.scheme,
      featureData.properties?.sourceLayer,
      featureData.properties?.nama,
      featureData.properties?.n_di,
      featureData.properties?.description,
      JSON.stringify(featureData.properties || {}) // Check all properties
    ];

    // First check for kuarter in any field
    if (allFields.some(field => isKuarter(field))) {
      return 'kuarter';
    }

    // Then check for specific bangunan types
    for (const field of allFields) {
      const bangunanType = getBangunanType(field);
      if (bangunanType) {
        return bangunanType;
      }
    }

    // Check if any field contains building indicators (fallback to bendung-tetap)
    const hasBuildingIndicators = allFields.some(field => 
      field && (field.toUpperCase().includes('BANGUNAN') || field.toUpperCase().includes('BUILDING'))
    );
    if (hasBuildingIndicators) {
      return 'bendung-tetap';
    }
    
    // Then check for other schemes
    if (allFields.some(field => checkScheme(field, 'sekunder'))) {
      return 'sekunder';
    }
    
    if (allFields.some(field => checkScheme(field, 'tersier'))) {
      return 'tersier';
    }
    
    if (allFields.some(field => checkScheme(field, 'primer'))) {
      return 'primer';
    }
    
    // Default to primer
    return 'primer';
  }, []);

  // Kuesioner scheme options based on PAI type
  const getKuesionerSchemes = useCallback(() => {
    // Determine paiType from featureData or infer from scheme
    let paiType = featureData?.paiType;

    // If paiType is not set, try to infer from the current scheme or detected scheme
    if (!paiType && selectedScheme) {
      const saluranSchemes = ['primer', 'sekunder', 'tersier', 'kuarter'];
      paiType = saluranSchemes.includes(selectedScheme) ? 'saluran' : 'bangunan';
    }

    // If still not determined, try to infer from auto-detected scheme
    if (!paiType && featureData) {
      const autoDetectedScheme = getSchemeType(featureData);
      const saluranSchemes = ['primer', 'sekunder', 'tersier', 'kuarter'];
      paiType = saluranSchemes.includes(autoDetectedScheme) ? 'saluran' : 'bangunan';
    }

    if (paiType === 'saluran') {
      return [
        { key: 'primer', label: 'Saluran Primer', description: 'Saluran utama dari sumber', icon: '🏗️' },
        { key: 'sekunder', label: 'Saluran Sekunder', description: 'Pembagi dari primer', icon: '🌊' },
        { key: 'tersier', label: 'Saluran Tersier', description: 'Langsung ke sawah', icon: '🌾' },
        { key: 'kuarter', label: 'Saluran Kuarter', description: 'Pembagi terkecil', icon: '💧' }
      ];
    } else if (paiType === 'bangunan') {
      return [
        { key: 'bendung-tetap', label: 'Bendung Tetap', description: 'Bangunan pengatur tinggi muka air', icon: '🏗️' },
        { key: 'jembatan', label: 'Jembatan', description: 'Bangunan penyeberangan', icon: '🌉' },
        { key: 'gudang', label: 'Gudang', description: 'Bangunan penyimpanan peralatan', icon: '🏭' },
        { key: 'perumahan', label: 'Perumahan', description: 'Bangunan tempat tinggal', icon: '🏠' },
        { key: 'box-tersier', label: 'Box Tersier', description: 'Bangunan pengatur saluran tersier', icon: '📦' },
        { key: 'box-kuarter', label: 'Box Kuarter', description: 'Bangunan pengatur saluran kuarter', icon: '📦' },
        { key: 'syphon', label: 'Syphon', description: 'Bangunan saluran bawah tanah', icon: '🔧' },
        { key: 'gorong-gorong', label: 'Gorong-gorong', description: 'Saluran pembuangan silang', icon: '🌊' },
        { key: 'gorong-gorong-silang', label: 'Gorong-gorong Silang', description: 'Gorong-gorong persilangan', icon: '🌊' },
        { key: 'pelimpah-samping', label: 'Pelimpah Samping', description: 'Bangunan pelimpah banjir', icon: '💦' },
        { key: 'terjunan', label: 'Terjunan', description: 'Bangunan pengatur debit jatuh', icon: '🏞️' },
        { key: 'tempat-cuci', label: 'Tempat Cuci', description: 'Fasilitas pencucian peralatan', icon: '🧽' },
        { key: 'sadap', label: 'Sadap', description: 'Bangunan pengambilan air', icon: '🚰' },
        { key: 'bagi-sadap', label: 'Bagi Sadap', description: 'Bangunan pembagian pengambilan', icon: '🔀' },
        { key: 'talang', label: 'Talang', description: 'Bangunan talang irigasi', icon: '🏗️' },
        { key: 'pengukur-debit', label: 'Pengukur Debit', description: 'Bangunan pengukur debit air', icon: '📏' }
      ];
    }

    // Fallback: return all schemes if paiType cannot be determined
    return [
      { key: 'primer', label: 'Saluran Primer', description: 'Saluran utama dari sumber', icon: '🏗️' },
      { key: 'sekunder', label: 'Saluran Sekunder', description: 'Pembagi dari primer', icon: '🌊' },
      { key: 'tersier', label: 'Saluran Tersier', description: 'Langsung ke sawah', icon: '🌾' },
      { key: 'kuarter', label: 'Saluran Kuarter', description: 'Pembagi terkecil', icon: '💧' },
      { key: 'bendung-tetap', label: 'Bendung Tetap', description: 'Bangunan pengatur tinggi muka air', icon: '🏗️' },
      { key: 'jembatan', label: 'Jembatan', description: 'Bangunan penyeberangan', icon: '🌉' },
      { key: 'gudang', label: 'Gudang', description: 'Bangunan penyimpanan peralatan', icon: '🏭' },
      { key: 'perumahan', label: 'Perumahan', description: 'Bangunan tempat tinggal', icon: '🏠' },
      { key: 'box-tersier', label: 'Box Tersier', description: 'Bangunan pengatur saluran tersier', icon: '📦' },
      { key: 'box-kuarter', label: 'Box Kuarter', description: 'Bangunan pengatur saluran kuarter', icon: '📦' },
      { key: 'syphon', label: 'Syphon', description: 'Bangunan saluran bawah tanah', icon: '🔧' },
      { key: 'gorong-gorong', label: 'Gorong-gorong', description: 'Saluran pembuangan silang', icon: '🌊' },
      { key: 'gorong-gorong-silang', label: 'Gorong-gorong Silang', description: 'Gorong-gorong persilangan', icon: '🌊' },
      { key: 'pelimpah-samping', label: 'Pelimpah Samping', description: 'Bangunan pelimpah banjir', icon: '💦' },
      { key: 'terjunan', label: 'Terjunan', description: 'Bangunan pengatur debit jatuh', icon: '🏞️' },
      { key: 'tempat-cuci', label: 'Tempat Cuci', description: 'Fasilitas pencucian peralatan', icon: '🧽' },
      { key: 'sadap', label: 'Sadap', description: 'Bangunan pengambilan air', icon: '🚰' },
      { key: 'bagi-sadap', label: 'Bagi Sadap', description: 'Bangunan pembagian pengambilan', icon: '🔀' },
      { key: 'talang', label: 'Talang', description: 'Bangunan talang irigasi', icon: '🏗️' },
      { key: 'pengukur-debit', label: 'Pengukur Debit', description: 'Bangunan pengukur debit air', icon: '📏' }
    ];
  }, [featureData, selectedScheme, getSchemeType]);

  const kuesionerSchemes = getKuesionerSchemes();

  // Get scheme display info
  const getSchemeInfo = (schemeKey) => {
    return kuesionerSchemes.find(s => s.key === schemeKey) || {
      key: schemeKey,
      label: schemeKey.charAt(0).toUpperCase() + schemeKey.slice(1),
      description: 'Skema kuesioner',
      icon: '📋'
    };
  };

  // Handle scheme change
  const handleChangeScheme = useCallback(async (newScheme) => {
    if (newScheme === selectedScheme) return;

    setIsChangingScheme(true);
    setShowSchemeDropdown(false);

    try {
      // Clear existing data
      setKuesionerConfig(null);
      setFormValues({});
      setScore(null);
      setErrors({});
      setExistingKuesioner(null);
      setAllExistingKuesioners([]);

      // Load new config and check for existing data
      const featureId = featureData?.properties?.featureId;
      const existingData = await loadExistingKuesioner(featureId, newScheme);
      await loadKuesionerConfig(newScheme, existingData);
      setSelectedScheme(newScheme);

    } catch (error) {
      console.error('❌ Error changing scheme:', error);
      setErrors({ general: 'Gagal mengubah skema kuesioner' });
    } finally {
      setIsChangingScheme(false);
    }
  }, [selectedScheme, featureData]);

  // Load existing kuesioner data
  const loadExistingKuesioner = useCallback(async (featureId, scheme) => {
    if (!featureId) {
      return null;
    }

    setIsLoadingKuesioner(true);
    try {
      
      // Load all kuesioners for this feature
      const allResponse = await fetch(`/api/kuesioner?featureId=${featureId}`);
      if (allResponse.ok) {
        const allData = await allResponse.json();
        if (allData.kuesioner && allData.kuesioner.length > 0) {
          setAllExistingKuesioners(allData.kuesioner);
        }
      }
      
      // Load specific kuesioner for selected scheme
      const response = await fetch(`/api/kuesioner?featureId=${featureId}&scheme=${scheme}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.kuesioner && data.kuesioner.length > 0) {
        const latestKuesioner = data.kuesioner[0];
        
        setExistingKuesioner(latestKuesioner);
        return latestKuesioner;
      }
      
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
      const configResponse = await fetch(`/api/kuesioner-configs?scheme=${scheme}`);
      if (!configResponse.ok) {
        throw new Error(`Failed to load config: ${configResponse.status}`);
      }
      const responseData = await configResponse.json();

      if (!responseData.success || !responseData.data || responseData.data.length === 0) {
        throw new Error('Konfigurasi kuesioner tidak ditemukan');
      }

      const configData = responseData.data[0].json; // Get the config from database

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
    if (isOpen && featureData && !selectedScheme) {
      // Auto-detect initial scheme, but allow user to change it
      const autoDetectedScheme = getSchemeType(featureData);
      setSelectedScheme(autoDetectedScheme);

      const featureId = featureData.featureId;

      const loadData = async () => {
        const existingData = await loadExistingKuesioner(featureId, autoDetectedScheme);
        await loadKuesionerConfig(autoDetectedScheme, existingData);
      };

      loadData();
    }
  }, [isOpen, featureData, getSchemeType, loadKuesionerConfig, loadExistingKuesioner, selectedScheme]);

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

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSchemeDropdown && !event.target.closest('.scheme-dropdown-container')) {
        setShowSchemeDropdown(false);
      }
    };

    if (showSchemeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSchemeDropdown]);

  // Close dropdown when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowSchemeDropdown(false);
    }
  }, [isOpen]);

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

    if (!featureData?.featureId) {
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
        featureId: featureData.featureId,
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
                  <div className="relative scheme-dropdown-container">
                    <button
                      onClick={() => setShowSchemeDropdown(!showSchemeDropdown)}
                      disabled={isChangingScheme}
                      className={`
                        px-2.5 py-0.5 text-xs font-semibold rounded-full
                        transition-all duration-200 flex items-center gap-1
                        ${kuesionerConfig.scheme === 'primer' ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200' : ''}
                        ${kuesionerConfig.scheme === 'sekunder' ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200' : ''}
                        ${kuesionerConfig.scheme === 'tersier' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200' : ''}
                        ${kuesionerConfig.scheme === 'kuarter' ? 'bg-cyan-100 text-cyan-700 border border-cyan-300 hover:bg-cyan-200' : ''}
                        ${kuesionerConfig.scheme === 'bangunan' ? 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200' : ''}
                        ${isChangingScheme ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                      `}
                      title="Klik untuk mengubah skema kuesioner"
                    >
                      {isChangingScheme ? (
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          Mengubah...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          {getSchemeInfo(kuesionerConfig.scheme).icon} {getSchemeInfo(kuesionerConfig.scheme).label}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {showSchemeDropdown && !isChangingScheme && (
                      <div
                        className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                      >
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Pilih Skema Kuesioner
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {kuesionerSchemes.map((scheme) => (
                              <button
                                key={scheme.key}
                                onClick={() => handleChangeScheme(scheme.key)}
                                disabled={kuesionerConfig.scheme === scheme.key}
                                className={`
                                  w-full text-left px-3 py-2.5 rounded-md transition-colors
                                  ${kuesionerConfig.scheme === scheme.key
                                    ? 'bg-gray-50 text-gray-700 cursor-default'
                                    : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                                  }
                                `}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{scheme.icon}</span>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{scheme.label}</div>
                                    <div className="text-xs text-gray-500">{scheme.description}</div>
                                  </div>
                                  {kuesionerConfig.scheme === scheme.key && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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

            {/* All existing kuesioners for this feature */}
            {allExistingKuesioners.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">Kuesioner yang Sudah Ada untuk Feature Ini</span>
                </div>
                <div className="space-y-1">
                  {allExistingKuesioners.map((kuesioner) => (
                    <div key={kuesioner.id} className="text-xs text-amber-700 flex justify-between items-center">
                      <span>
                        {getSchemeInfo(kuesioner.scheme)?.label || kuesioner.scheme} 
                        ({kuesioner.tahun})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        kuesioner.scoreClass === 'BAIK' ? 'bg-green-100 text-green-800' :
                        kuesioner.scoreClass === 'SEDANG' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {kuesioner.scoreTotal?.toFixed(1) || 'N/A'}% - {kuesioner.scoreClass || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  💡 Anda dapat membuat kuesioner dengan skema berbeda untuk feature yang sama
                </p>
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
