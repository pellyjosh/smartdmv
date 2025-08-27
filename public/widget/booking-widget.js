/**
 * SmartDVM Appointment Booking Widget
 * Embeddable widget for practice websites - EXACT MATCH to preview
 */

(function() {
  'use strict';

  // Configuration check
  if (!window.smartDVMConfig) {
    console.error('SmartDVM: Configuration not found. Please include the configuration script before the widget script.');
    return;
  }

  const config = window.smartDVMConfig;
  const { practiceId, apiKey, baseUrl } = config;
  
  // Debug logging
  console.log('🔧 Widget Configuration:', { practiceId, apiKey, baseUrl });
  
  // Global widget variables
  let widgetConfig = null;
  let appointmentTypes = [];
  
  // Form validation state
  let validationErrors = {};
  let isFormValid = false;

  // Real-time validation rules
  const validationRules = {
    clientName: {
      required: true,
      minLength: 2,
      pattern: /^[a-zA-Z\s]+$/,
      message: 'Full name must be at least 2 characters and contain only letters'
    },
    clientEmail: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    },
    clientPhone: {
      required: true,
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
      message: 'Please enter a valid phone number'
    },
    petName: {
      required: true,
      minLength: 2,
      pattern: /^[a-zA-Z\s]+$/,
      message: 'Pet name must be at least 2 characters and contain only letters'
    },
    petType: {
      required: true,
      message: 'Please select a pet type'
    },
    reason: {
      required: true,
      minLength: 10,
      message: 'Please provide at least 10 characters describing the reason for visit'
    }
  };

  // Validate individual field
  function validateField(fieldName, value) {
    const rules = validationRules[fieldName];
    if (!rules) return { isValid: true };

    const errors = [];

    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      errors.push(`${getFieldLabel(fieldName)} is required`);
      return { isValid: false, errors };
    }

    // Skip other validations if field is empty and not required
    if (!value || value.trim() === '') {
      return { isValid: true };
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${getFieldLabel(fieldName)} must be at least ${rules.minLength} characters`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get field label for error messages
  function getFieldLabel(fieldName) {
    const labels = {
      clientName: 'Full Name',
      clientEmail: 'Email Address',
      clientPhone: 'Phone Number',
      petName: 'Pet Name',
      petType: 'Pet Type',
      reason: 'Reason for Visit'
    };
    return labels[fieldName] || fieldName;
  }

  // Update field validation state
  function updateFieldValidation(fieldName, value) {
    const validation = validateField(fieldName, value);
    const fieldElement = document.querySelector(`[name="${fieldName}"]`);
    const errorElement = document.getElementById(`${fieldName}-error`);

    if (!fieldElement) return;

    // Remove existing validation classes
    fieldElement.classList.remove('field-valid', 'field-invalid');
    
    if (value && value.trim() !== '') {
      if (validation.isValid) {
        fieldElement.classList.add('field-valid');
        validationErrors[fieldName] = null;
      } else {
        fieldElement.classList.add('field-invalid');
        validationErrors[fieldName] = validation.errors[0];
      }
    } else {
      validationErrors[fieldName] = null;
    }

    // Update error message
    if (errorElement) {
      if (validation.isValid || (!value || value.trim() === '')) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
      } else {
        errorElement.style.display = 'block';
        errorElement.textContent = validation.errors[0];
      }
    }

    // Update form validity
    updateFormValidity();
  }

  // Check overall form validity
  function updateFormValidity() {
    const hasErrors = Object.values(validationErrors).some(error => error !== null);
    const requiredFields = ['clientName', 'clientEmail', 'clientPhone', 'petName', 'petType', 'reason'];
    
    // Check if all required fields have values
    const allRequiredFilled = requiredFields.every(fieldName => {
      const field = document.querySelector(`[name="${fieldName}"]`);
      return field && field.value && field.value.trim() !== '';
    });

    isFormValid = !hasErrors && allRequiredFilled && selectedType && previewState.selectedDate && previewState.selectedTime;
    
    // Update submit button state
    const submitButton = document.querySelector('.sdvm-submit-btn');
    if (submitButton) {
      submitButton.disabled = !isFormValid;
      if (isFormValid) {
        submitButton.style.opacity = '1';
        submitButton.style.cursor = 'pointer';
      } else {
        submitButton.style.opacity = '0.6';
        submitButton.style.cursor = 'not-allowed';
      }
    }
  }

  // Widget state - matches preview exactly
  let isLoaded = false;
  let selectedDate = null;
  let selectedTime = null;
  let selectedType = null;
  let previewState = {
    selectedType: '',
    selectedDate: '',
    selectedTime: '',
    dropdownOpen: false,
    searchTerm: '',
    formData: {
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
      petName: '',
      petType: 'dog', 
      petBreed: '',
      petAge: '',
      reason: '',
      preferredDoctor: ''
    }
  };

  // Fetch widget configuration from database
  async function fetchWidgetConfig() {
    try {
      const response = await fetch(`${baseUrl}/api/widget/config?practiceId=${practiceId}&apiKey=${apiKey}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch widget configuration: HTTP ${response.status}`);
      }
      
      const config = await response.json();
      
      // Check if response has error field (error case)
      if (config.error) {
        throw new Error(config.error || 'Failed to load widget configuration');
      }
      
      // API returns config directly, not wrapped in success/config structure
      widgetConfig = config;
      appointmentTypes = config.appointmentTypes || [];
      
      console.log('✅ Widget configuration loaded:', widgetConfig);
      return config;
    } catch (error) {
      console.error('❌ Failed to fetch widget configuration:', error);
      
      // Show error to user instead of using dummy data
      const container = document.getElementById('smartdvm-booking-widget');
      if (container) {
        container.innerHTML = `
          <div style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0 auto;
            background: white;
            border: 1px solid #fee2e2;
            border-radius: 8px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          ">
            <div style="padding: 24px; text-align: center;">
              <div style="width: 48px; height: 48px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <svg style="width: 24px; height: 24px; color: #dc2626;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h2 style="font-size: 1.5rem; font-weight: 600; color: #111827; margin: 0 0 8px 0;">
                Configuration Error
              </h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Unable to load the booking widget configuration. Please check your practice ID and API key.
              </p>
              <p style="font-size: 0.875rem; color: #9ca3af; margin: 0;">
                Error: ${error.message}
              </p>
            </div>
          </div>
        `;
      }
      
      throw error;
    }
  }

  // Utility functions
  function createElement(tag, className, innerHTML) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  }

  // Business hours and availability configuration
  const businessConfig = {
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday (0 = Sunday, 1 = Monday, etc.)
    workingHours: {
      start: '09:00',
      end: '17:00',
      timeSlots: [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
        '15:00', '15:30', '16:00', '16:30'
      ]
    },
    // This will be populated from the API with real booking data
    bookedSlots: [],
    maxMonthsAhead: 3 // Allow booking up to 3 months ahead
  };

  // Load real availability data from API
  async function loadAvailability() {
    try {
      // Use practiceId from URL, not from widget config
      const currentPracticeId = practiceId || widgetConfig.practiceId;
      // Include past month to show historical bookings correctly
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 month ago
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 months ahead
      
      const response = await fetch(`${baseUrl}/api/widget/availability?practiceId=${currentPracticeId}&apiKey=${apiKey}&startDate=${startDate}&endDate=${endDate}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          businessConfig.bookedSlots = data.bookedSlots || [];
          console.log('✅ Loaded availability data:', data.bookedSlots.length, 'booked slots for practice', currentPracticeId);
          console.log('📅 Booked slots:', data.bookedSlots);
          // Force re-render widget with updated availability
          setTimeout(() => renderWidget(), 100);
        } else {
          console.warn('❌ API returned error:', data);
        }
      } else {
        console.warn('❌ Failed to load availability data, HTTP status:', response.status);
      }
    } catch (error) {
      console.warn('Error loading availability data:', error);
      // Widget will work with empty booked slots (all times available)
    }
  }

  // Calendar state
  let calendarState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: null
  };

  // Helper functions for calendar and availability
  function isWorkingDay(date) {
    const dayOfWeek = new Date(date).getDay();
    return businessConfig.workingDays.includes(dayOfWeek);
  }

  function isAvailableDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + businessConfig.maxMonthsAhead);
    
    return selectedDate >= today && 
           selectedDate <= maxDate && 
           isWorkingDay(date);
  }

  function isAvailableTime(date, time) {
    if (!date || !time) return false;
    
    const dateTime = `${date}T${time}`;
    const selectedDateTime = new Date(dateTime);
    const now = new Date();
    
    // Check if it's in the future
    if (selectedDateTime <= now) return false;
    
    // Check if it's a working day
    if (!isWorkingDay(date)) return false;
    
    // Check if time is within business hours
    if (!businessConfig.workingHours.timeSlots.includes(time)) return false;
    
    // Check if slot is not booked
    const slotKey = `${date}_${time}`;
    const isBooked = businessConfig.bookedSlots.includes(slotKey);
    
    // Debug logging for specific dates
    if (date === '2025-08-20' || date === '2025-08-15') {
      console.log(`🔍 Checking ${date} ${time}:`, {
        slotKey,
        isBooked,
        bookedSlots: businessConfig.bookedSlots,
        available: !isBooked
      });
    }
    
    return !isBooked;
  }

  function hasAvailableSlots(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    // If date is in the past, it's closed (not fully booked)
    if (selectedDate < today) return false;
    
    // If it's not a working day, it's closed
    if (!isWorkingDay(date)) return false;
    
    // If it's beyond our booking window, it's closed
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + businessConfig.maxMonthsAhead);
    if (selectedDate > maxDate) return false;
    
    // Check if any time slot is available for this date
    return businessConfig.workingHours.timeSlots.some(time => 
      isAvailableTime(date, time)
    );
  }

  function generateCalendarMonth(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 6 weeks (42 days) to fill calendar grid
    for (let i = 0; i < 42; i++) {
      const dateString = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.toDateString() === new Date().toDateString();
      const currentDateObj = new Date(current);
      currentDateObj.setHours(0, 0, 0, 0);
      
      let dayStatus = 'unavailable'; // Default for non-working days or past dates
      
      if (isCurrentMonth) {
        if (currentDateObj < today) {
          // Past dates are closed
          dayStatus = 'unavailable';
        } else if (!isWorkingDay(dateString)) {
          // Weekends are closed
          dayStatus = 'unavailable';
        } else if (hasAvailableSlots(dateString)) {
          // Working day with available slots
          dayStatus = 'available';
        } else {
          // Working day but fully booked
          dayStatus = 'working-no-slots';
        }
      }
      
      days.push({
        date: dateString,
        dayNumber: current.getDate(),
        isCurrentMonth,
        isToday,
        isAvailable: dayStatus === 'available',
        isWorkingDay: isWorkingDay(dateString) && currentDateObj >= today,
        status: dayStatus
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  function getMonthName(month, year) {
    return new Date(year, month).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }

  function navigateMonth(direction) {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + businessConfig.maxMonthsAhead);
    
    if (direction === 'prev') {
      if (calendarState.currentYear > today.getFullYear() || 
         (calendarState.currentYear === today.getFullYear() && calendarState.currentMonth > today.getMonth())) {
        calendarState.currentMonth--;
        if (calendarState.currentMonth < 0) {
          calendarState.currentMonth = 11;
          calendarState.currentYear--;
        }
      }
    } else if (direction === 'next') {
      if (calendarState.currentYear < maxDate.getFullYear() || 
         (calendarState.currentYear === maxDate.getFullYear() && calendarState.currentMonth < maxDate.getMonth())) {
        calendarState.currentMonth++;
        if (calendarState.currentMonth > 11) {
          calendarState.currentMonth = 0;
          calendarState.currentYear++;
        }
      }
    }
    
    renderWidget();
  }
  // Event handlers - updated for custom calendar/time picker
  function handleTypeSelect(typeId) {
    previewState.selectedType = typeId;
    previewState.dropdownOpen = false;
    previewState.searchTerm = '';
    selectedType = typeId;
    updateFormValidity(); // Update form validity when selection changes
    renderWidget(); // Re-render to update UI
  }

  function handleDateSelect(date) {
    if (isAvailableDate(date)) {
      previewState.selectedDate = date;
      previewState.selectedTime = ''; // Reset time when date changes
      selectedDate = date;
      selectedTime = '';
      updateFormValidity(); // Update form validity when selection changes
      renderWidget();
    }
  }

  function handleTimeSelect(time) {
    if (isAvailableTime(previewState.selectedDate, time)) {
      previewState.selectedTime = time;
      selectedTime = time;
      updateFormValidity(); // Update form validity when selection changes
      renderWidget();
    }
  }

  function handleFormChange(field, value) {
    previewState.formData[field] = value;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate required selections
    if (!selectedType) {
      showAlert('Please select a service type.', 'error');
      return;
    }

    if (!previewState.selectedDate) {
      showAlert('Please select an appointment date.', 'error');
      return;
    }

    if (!previewState.selectedTime) {
      showAlert('Please select an appointment time.', 'error');
      return;
    }

    // Get form element - look for the actual form within the widget
    const form = document.querySelector('#smartdvm-booking-widget form') || 
                 document.querySelector('#widget-container form') || 
                 document.querySelector('.sdvm-widget form') ||
                 document.querySelector('.booking-form');
    
    console.log('🔍 Form element found:', !!form, form ? form.tagName : 'null');
    
    // If no form found, collect data manually
    let formData;
    if (form) {
      formData = new FormData(form);
    } else {
      // Fallback: collect data manually from input fields
      formData = new FormData();
      const fields = ['clientName', 'clientEmail', 'clientPhone', 'petName', 'petType', 'petBreed', 'petAge', 'reason', 'preferredDoctor'];
      fields.forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
          formData.append(fieldName, field.value || '');
        }
      });
    }

    // Collect all form data
    const bookingData = {
      practiceId: practiceId,
      apiKey: apiKey,
      appointmentType: appointmentTypes.find(t => t.id == selectedType)?.name || 'General Appointment',
      appointmentDate: previewState.selectedDate,
      appointmentTime: previewState.selectedTime,
      clientName: formData.get('clientName') || '',
      clientEmail: formData.get('clientEmail') || '',
      clientPhone: formData.get('clientPhone') || '',
      petName: formData.get('petName') || '',
      petType: formData.get('petType') || 'dog',
      petBreed: formData.get('petBreed') || '',
      petAge: formData.get('petAge') || '',
      reason: formData.get('reason') || '',
      preferredDoctor: formData.get('preferredDoctor') || ''
    };

    // Debug logging
    console.log('📤 Booking Data being sent:', bookingData);

    // Final validation of all fields
    const requiredFields = ['clientName', 'clientEmail', 'clientPhone', 'petName', 'petType', 'reason'];
    let hasErrors = false;    for (const fieldName of requiredFields) {
      const validation = validateField(fieldName, bookingData[fieldName]);
      if (!validation.isValid) {
        updateFieldValidation(fieldName, bookingData[fieldName]);
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      showAlert(
        'Please correct the errors in the form before submitting.',
        'error'
      );
      return;
    }
    
    // Show loading state
    showAlert('Booking your appointment...', 'loading');
    
    try {
      const response = await fetch(`${baseUrl}/api/widget/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Close loading alert
        window.closeAlert();
        
        showAlert(
          `
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #166534;">
              ${widgetConfig?.customTexts?.successMessage || 'Appointment Booked Successfully!'}
            </div>
            <div style="margin-bottom: 16px;">
              <strong>Appointment Details:</strong><br>
              📅 <strong>Date:</strong> ${new Date(previewState.selectedDate + 'T' + previewState.selectedTime).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}<br>
              🏥 <strong>Service:</strong> ${bookingData.appointmentType}<br>
              🐾 <strong>Pet:</strong> ${bookingData.petName}<br>
              📞 <strong>Contact:</strong> ${bookingData.clientEmail}
            </div>
            <div style="font-size: 14px; color: #059669; line-height: 1.5;">
              ${widgetConfig?.customTexts?.footerText || 'We will contact you shortly to confirm your appointment.'}
            </div>
          </div>
          `,
          'success',
          0 // Don't auto-close
        );
        
        // Reset form if it exists
        if (form && typeof form.reset === 'function') {
          try {
            form.reset();
            console.log('✅ Form reset successfully');
          } catch (resetError) {
            console.warn('⚠️ Form reset failed:', resetError);
          }
        } else {
          console.log('ℹ️ No form to reset or form.reset not available');
        }
        
        // Clear form fields manually as fallback
        const formFields = document.querySelectorAll('#smartdvm-booking-widget input, #smartdvm-booking-widget select, #smartdvm-booking-widget textarea');
        formFields.forEach(field => {
          if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = false;
          } else {
            field.value = '';
          }
        });
        
        previewState.selectedType = '';
        previewState.selectedDate = '';
        previewState.selectedTime = '';
        selectedType = null;
        selectedDate = null;
        selectedTime = null;
        validationErrors = {};
        
        // Re-render widget to show reset state
        setTimeout(() => {
          renderWidget();
        }, 5000);
        
      } else {
        // Close loading alert
        window.closeAlert();
        
        showAlert(
          result.error || widgetConfig?.customTexts?.errorMessage || 'Failed to book appointment. Please try again.',
          'error'
        );
      }
      
    } catch (error) {
      console.error('Booking error:', error);
      // Close loading alert
      window.closeAlert();
      
      showAlert(
        'Network error. Please check your connection and try again.',
        'error'
      );
    }
  }
  
  // Show centered modal alerts
  function showAlert(message, type = 'info', duration = 5000) {
    // Remove existing alerts
    const existingAlert = document.getElementById('sdvm-alert-modal');
    if (existingAlert) {
      existingAlert.remove();
    }

    let bgColor, borderColor, textColor, icon, buttonColor;
    switch (type) {
      case 'success':
        bgColor = '#f0fdf4';
        borderColor = '#22c55e';
        textColor = '#166534';
        buttonColor = '#22c55e';
        icon = `<svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>`;
        break;
      case 'error':
        bgColor = '#fef2f2';
        borderColor = '#dc2626';
        textColor = '#dc2626';
        buttonColor = '#dc2626';
        icon = `<svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>`;
        break;
      case 'warning':
        bgColor = '#fef3c7';
        borderColor = '#f59e0b';
        textColor = '#92400e';
        buttonColor = '#f59e0b';
        icon = `<svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
        break;
      case 'loading':
        bgColor = '#fef3c7';
        borderColor = '#f59e0b';
        textColor = '#92400e';
        buttonColor = '#f59e0b';
        icon = `<svg style="width: 32px; height: 32px; animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>`;
        break;
      default:
        bgColor = '#dbeafe';
        borderColor = '#3b82f6';
        textColor = '#1e40af';
        buttonColor = '#3b82f6';
        icon = `<svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
    }

    // Create modal overlay
    const alertModal = document.createElement('div');
    alertModal.id = 'sdvm-alert-modal';
    alertModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 400px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          animation: slideIn 0.3s ease-out;
        ">
          <div style="
            background: ${bgColor};
            border: 2px solid ${borderColor};
            padding: 24px;
            text-align: center;
            border-radius: 12px;
          ">
            <div style="
              color: ${textColor};
              margin-bottom: 16px;
              display: flex;
              justify-content: center;
            ">
              ${icon}
            </div>
            <div style="
              color: ${textColor};
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 24px;
              font-weight: 500;
            ">
              ${message}
            </div>
            ${type !== 'loading' ? `
              <button onclick="closeAlert()" style="
                background: ${buttonColor};
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                min-width: 80px;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                OK
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { transform: translateY(-20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(alertModal);

    // Global close function
    window.closeAlert = () => {
      const modal = document.getElementById('sdvm-alert-modal');
      if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => modal.remove(), 300);
      }
    };

    // Auto-close for non-loading alerts
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        window.closeAlert();
      }, duration);
    }

    // Close on overlay click
    alertModal.addEventListener('click', (e) => {
      if (e.target === alertModal) {
        window.closeAlert();
      }
    });

    // Close on Escape key
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        window.closeAlert();
        document.removeEventListener('keydown', handleKeyPress);
      }
    };
    document.addEventListener('keydown', handleKeyPress);
  }

  // Legacy showMessage function for backward compatibility
  function showMessage(message, type = 'info') {
    showAlert(message, type);
  }

  // Main render function - EXACT copy of preview structure
  // Generate form fields based on configuration - exact match to admin preview
  function generateFormFields() {
    if (!widgetConfig || !widgetConfig.enabledFields) {
      return '<p style="color: #6b7280; text-align: center;">Loading form fields...</p>';
    }

    const fields = [];
    const enabledFields = widgetConfig.enabledFields;
    
    // Convert enabled fields object to array format
    const formFields = [];
    if (enabledFields.clientName) {
      formFields.push({ 
        fieldType: 'text', 
        fieldName: 'clientName',
        label: 'Full Name', 
        placeholder: 'Enter your full name',
        required: true,
        enabled: true
      });
    }
    if (enabledFields.clientEmail) {
      formFields.push({ 
        fieldType: 'email', 
        fieldName: 'clientEmail',
        label: 'Email Address', 
        placeholder: 'Enter your email address',
        required: true,
        enabled: true
      });
    }
    if (enabledFields.clientPhone) {
      formFields.push({ 
        fieldType: 'tel', 
        fieldName: 'clientPhone',
        label: 'Phone Number', 
        placeholder: 'Enter your phone number',
        required: true,
        enabled: true
      });
    }
    if (enabledFields.petName) {
      formFields.push({ 
        fieldType: 'text', 
        fieldName: 'petName',
        label: 'Pet Name', 
        placeholder: 'Enter your pet\'s name',
        required: true,
        enabled: true
      });
    }
    if (enabledFields.petType) {
      formFields.push({ 
        fieldType: 'select', 
        fieldName: 'petType',
        label: 'Pet Type', 
        placeholder: 'Select pet type',
        required: true,
        enabled: true,
        options: [
          { value: 'cat', label: 'Cat' },
          { value: 'dog', label: 'Dog' },
          { value: 'bird', label: 'Bird' },
          { value: 'rabbit', label: 'Rabbit' },
          { value: 'other', label: 'Other' }
        ]
      });
    }
    if (enabledFields.petBreed) {
      formFields.push({ 
        fieldType: 'text', 
        fieldName: 'petBreed',
        label: 'Pet Breed', 
        placeholder: 'Enter your pet\'s breed',
        required: false,
        enabled: true
      });
    }
    if (enabledFields.petAge) {
      formFields.push({ 
        fieldType: 'text', 
        fieldName: 'petAge',
        label: 'Pet Age', 
        placeholder: 'Enter your pet\'s age',
        required: false,
        enabled: true
      });
    }
    if (enabledFields.reason) {
      formFields.push({ 
        fieldType: 'textarea', 
        fieldName: 'reason',
        label: 'Reason for Visit', 
        placeholder: 'Describe the reason for your visit',
        required: true,
        enabled: true
      });
    }
    if (enabledFields.preferredDoctor) {
      formFields.push({ 
        fieldType: 'text', 
        fieldName: 'preferredDoctor',
        label: 'Preferred Doctor', 
        placeholder: 'Enter preferred doctor name (optional)',
        required: false,
        enabled: true
      });
    }
    
    // Group fields into rows based on their layout configuration
    const fieldRows = [];
    let currentRow = [];
    
    formFields.forEach(field => {
      // Determine if field should be in its own row or can share
      const isFullWidth = field.fieldType === 'textarea' || field.fieldType === 'tel' || 
                         field.label.toLowerCase().includes('reason') || 
                         field.label.toLowerCase().includes('doctor');
      
      if (isFullWidth) {
        // Add current row if it has fields
        if (currentRow.length > 0) {
          fieldRows.push([...currentRow]);
          currentRow = [];
        }
        // Add full-width field as its own row
        fieldRows.push([field]);
      } else {
        currentRow.push(field);
        // If we have 2 fields in current row, start a new row
        if (currentRow.length === 2) {
          fieldRows.push([...currentRow]);
          currentRow = [];
        }
      }
    });
    
    // Add any remaining fields in current row
    if (currentRow.length > 0) {
      fieldRows.push(currentRow);
    }
    
    // Generate HTML for each row
    fieldRows.forEach(row => {
      if (row.length === 1) {
        // Full width field
        const field = row[0];
        fields.push(`
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151;">
              ${field.label}${field.required ? ' *' : ''}
            </label>
            ${field.fieldType === 'textarea' ? 
              `<textarea
                name="${field.fieldName}"
                placeholder="${field.placeholder || ''}"
                ${field.required ? 'required' : ''}
                rows="4"
                style="
                  width: 100%;
                  padding: 12px 16px;
                  border: 1px solid #d1d5db;
                  border-radius: ${widgetConfig.borderRadius || 8}px;
                  background: white;
                  font-size: 1rem;
                  transition: all 0.2s;
                  outline: none;
                  box-sizing: border-box;
                  resize: vertical;
                  min-height: 100px;
                "
                onfocus="this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
                oninput="updateFieldValidation('${field.fieldName}', this.value)"
              ></textarea>` :
              field.fieldType === 'select' ?
              `<select
                name="${field.fieldName}"
                ${field.required ? 'required' : ''}
                style="
                  width: 100%;
                  padding: 12px 16px;
                  border: 1px solid #d1d5db;
                  border-radius: ${widgetConfig.borderRadius || 8}px;
                  background: white;
                  font-size: 1rem;
                  transition: all 0.2s;
                  outline: none;
                  box-sizing: border-box;
                  cursor: pointer;
                "
                onfocus="this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
                onchange="updateFieldValidation('${field.fieldName}', this.value)"
              >
                <option value="">${field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                ${field.options ? field.options.map(option => 
                  `<option value="${option.value}">${option.label}</option>`
                ).join('') : ''}
              </select>` :
              `<input
                type="${field.fieldType}"
                name="${field.fieldName}"
                placeholder="${field.placeholder || ''}"
                ${field.required ? 'required' : ''}
                style="
                  width: 100%;
                  padding: 12px 16px;
                  border: 1px solid #d1d5db;
                  border-radius: ${widgetConfig.borderRadius || 8}px;
                  background: white;
                  font-size: 1rem;
                  transition: all 0.2s;
                  outline: none;
                  box-sizing: border-box;
                "
                onfocus="this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
                oninput="updateFieldValidation('${field.fieldName}', this.value)"
              />`
            }
            <div id="${field.fieldName}-error" style="
              color: #dc2626;
              font-size: 0.875rem;
              margin-top: 4px;
              display: none;
            "></div>
          </div>
        `);
      } else if (row.length === 2) {
        // Two fields side by side
        fields.push(`
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${row.map(field => `
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151;">
                  ${field.label}${field.required ? ' *' : ''}
                </label>
                ${field.fieldType === 'select' ?
                `<select
                  name="${field.fieldName}"
                  ${field.required ? 'required' : ''}
                  style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: ${widgetConfig.borderRadius || 8}px;
                    background: white;
                    font-size: 1rem;
                    transition: all 0.2s;
                    outline: none;
                    box-sizing: border-box;
                    cursor: pointer;
                  "
                  onfocus="this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                  onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
                  onchange="updateFieldValidation('${field.fieldName}', this.value)"
                >
                  <option value="">${field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                  ${field.options ? field.options.map(option => 
                    `<option value="${option.value}">${option.label}</option>`
                  ).join('') : ''}
                </select>` :
                `<input
                  type="${field.fieldType}"
                  name="${field.fieldName}"
                  placeholder="${field.placeholder || ''}"
                  ${field.required ? 'required' : ''}
                  style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: ${widgetConfig.borderRadius || 8}px;
                    background: white;
                    font-size: 1rem;
                    transition: all 0.2s;
                    outline: none;
                    box-sizing: border-box;
                  "
                  onfocus="this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                  onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
                  oninput="updateFieldValidation('${field.fieldName}', this.value)"
                />`}
                <div id="${field.fieldName}-error" style="
                  color: #dc2626;
                  font-size: 0.875rem;
                  margin-top: 4px;
                  display: none;
                "></div>
              </div>
            `).join('')}
          </div>
        `);
      }
    });
    
    return fields.join('');
  }

  function renderWidget() {
    const container = document.getElementById('smartdvm-booking-widget');
    if (!container) return;

    // Check if configuration is loaded
    if (!widgetConfig) {
      container.innerHTML = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          padding: 40px;
          text-align: center;
          color: #6b7280;
        ">
          Loading booking configuration...
        </div>
      `;
      return;
    }

    const enabledTypes = appointmentTypes.filter(type => type.enabled);
    const selectedTypeData = enabledTypes.find(t => t.id == previewState.selectedType) || enabledTypes[0];
    
    // If we have a default type but no selection, select it
    if (!previewState.selectedType && selectedTypeData) {
      previewState.selectedType = selectedTypeData.id;
      selectedType = selectedTypeData.id;
    }

    const filteredTypes = enabledTypes.filter(type =>
      type.name.toLowerCase().includes(previewState.searchTerm.toLowerCase()) ||
      (type.description || '').toLowerCase().includes(previewState.searchTerm.toLowerCase())
    );

    container.innerHTML = `
      <div style="
        font-family: ${widgetConfig.fontFamily || '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'};
        margin: 0 auto;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: ${widgetConfig.borderRadius || 8}px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        min-height: 600px;
        height: auto;
      ">
        <div style="padding: 24px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="
              font-size: 2rem;
              font-weight: 700;
              margin-bottom: 8px;
              color: ${widgetConfig.primaryColor || '#3b82f6'};
            ">
              ${widgetConfig?.customTexts?.headerTitle || 'Book an Appointment'}
            </h2>
            <p style="color: #6b7280; margin: 0;">
              ${widgetConfig?.customTexts?.headerSubtitle || 'Schedule your visit with us'}
            </p>
          </div>

          <form onsubmit="return false;" style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Service Selection -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">Select Service</h3>
              
              ${enabledTypes.length === 0 ? `
                <div style="
                  border: 2px dashed #d1d5db;
                  border-radius: 8px;
                  padding: 32px;
                  text-align: center;
                  background: #f9fafb;
                  color: #6b7280;
                ">
                  <h4 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; color: #374151;">No Services Available</h4>
                  <p style="font-size: 0.875rem; line-height: 1.5; max-width: 400px; margin: 0 auto;">No appointment services are currently configured. Please contact the practice directly to schedule an appointment.</p>
                </div>
              ` : `
              <div style="position: relative;" class="sdvm-dropdown-container">
                <button
                  type="button"
                  onclick="toggleDropdown()"
                  style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: ${widgetConfig.borderRadius || 8}px;
                    background: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: all 0.2s;
                    text-align: left;
                  "
                  onmouseover="this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'"
                  onmouseout="this.style.borderColor='#d1d5db'"
                >
                  <div style="flex: 1;">
                    ${selectedTypeData ? `
                      <div style="font-weight: 500; color: #111827;">${selectedTypeData.name}</div>
                      <div style="font-size: 0.875rem; color: #6b7280; margin-top: 4px;">${selectedTypeData.description} • ${selectedTypeData.duration}min</div>
                    ` : `
                      <div style="color: #9ca3af;">Select a service...</div>
                    `}
                  </div>
                  <svg style="width: 20px; height: 20px; color: #6b7280; transition: transform 0.2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                <div id="dropdown-menu" style="
                  position: absolute;
                  top: 100%;
                  left: 0;
                  right: 0;
                  background: white;
                  border: 1px solid #e5e7eb;
                  border-radius: ${widgetConfig.borderRadius || 8}px;
                  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                  z-index: 50;
                  margin-top: 4px;
                  max-height: 300px;
                  overflow: hidden;
                  display: ${previewState.dropdownOpen ? 'block' : 'none'};
                ">
                  <div style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <div style="position: relative;">
                      <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                      <input
                        type="text"
                        id="dropdown-search-input"
                        placeholder="Search services..."
                        value="${previewState.searchTerm}"
                        style="
                          width: 100%;
                          padding: 8px 12px 8px 40px;
                          border: 1px solid #e5e7eb;
                          border-radius: 6px;
                          background: #f9fafb;
                          font-size: 0.875rem;
                          outline: none;
                          box-sizing: border-box;
                        "
                        onfocus="this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'; this.style.background='white'"
                        onblur="this.style.borderColor='#e5e7eb'; this.style.background='#f9fafb'"
                      >
                    </div>
                  </div>
                  
                  <div style="max-height: 200px; overflow-y: auto;">
                    ${filteredTypes.length === 0 ? `
                      <div style="padding: 16px; text-align: center; font-size: 0.875rem; color: #6b7280;">
                        No services found matching "${previewState.searchTerm}"
                      </div>
                    ` : filteredTypes.map(type => `
                      <button
                        type="button"
                        onclick="selectType('${type.id}')"
                        style="
                          width: 100%;
                          padding: 12px 16px;
                          cursor: pointer;
                          transition: background-color 0.2s;
                          border: none;
                          background: ${type.id == previewState.selectedType ? '#eff6ff' : 'white'};
                          color: ${type.id == previewState.selectedType ? (widgetConfig?.primaryColor || '#3b82f6') : 'inherit'};
                          display: flex;
                          align-items: center;
                          justify-content: space-between;
                          text-align: left;
                        "
                        onmouseover="if('${type.id}' != '${previewState.selectedType}') this.style.background='#f8fafc'"
                        onmouseout="if('${type.id}' != '${previewState.selectedType}') this.style.background='white'"
                      >
                        <div style="flex: 1;">
                          <div style="font-weight: 600; color: #111827;">${type.name}</div>
                          <div style="font-size: 0.875rem; color: #6b7280; margin-top: 2px;">${type.description || ''}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span style="font-size: 0.875rem; font-weight: 600; color: ${type.color || widgetConfig?.primaryColor || '#3b82f6'};">${type.duration}min</span>
                          <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${type.color || widgetConfig?.primaryColor || '#3b82f6'};"></div>
                        </div>
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>
              `}
            </div>

            <!-- Date & Time Selection -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">Select Date & Time</h3>
              
              <!-- Calendar Widget -->
              <div style="border: 1px solid #e5e7eb; border-radius: ${widgetConfig.borderRadius || 8}px; overflow: hidden;">
                <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 8px; padding: 16px 16px 0 16px;">Preferred Date *</label>
                
                <!-- Calendar Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                  <button type="button" onclick="navigateMonth('prev')" style="
                    padding: 8px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: #6b7280;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                    </svg>
                  </button>
                  <h4 style="font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0;">
                    ${getMonthName(calendarState.currentMonth, calendarState.currentYear)}
                  </h4>
                  <button type="button" onclick="navigateMonth('next')" style="
                    padding: 8px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: #6b7280;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                  </button>
                </div>
                
                <!-- Calendar Days Header -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #f1f5f9;">
                  ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `
                    <div style="padding: 12px 8px; text-align: center; font-size: 0.875rem; font-weight: 600; color: #64748b; border-right: 1px solid #e2e8f0;">${day}</div>
                  `).join('')}
                </div>
                
                <!-- Calendar Days Grid -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr);">
                  ${generateCalendarMonth(calendarState.currentMonth, calendarState.currentYear).map(day => `
                    <button
                      type="button"
                      onclick="${day.isAvailable ? `selectDate('${day.date}')` : 'return false;'}"
                      ${!day.isAvailable || !day.isCurrentMonth ? 'disabled' : ''}
                      title="${
                        !day.isCurrentMonth ? '' :
                        day.status === 'available' ? `Available: ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` : 
                        day.status === 'working-no-slots' ? 'Fully booked' : 'Closed'
                      }"
                      style="
                        position: relative;
                        padding: 12px 8px;
                        border: none;
                        border-right: 1px solid #e2e8f0;
                        border-bottom: 1px solid #e2e8f0;
                        background: ${
                          !day.isCurrentMonth ? '#f9fafb' :
                          previewState.selectedDate === day.date ? (widgetConfig?.primaryColor || '#3b82f6') :
                          day.status === 'available' ? 'white' :
                          day.status === 'working-no-slots' ? '#fef3c7' : '#f3f4f6'
                        };
                        color: ${
                          !day.isCurrentMonth ? '#d1d5db' :
                          previewState.selectedDate === day.date ? 'white' :
                          day.status === 'available' ? '#059669' :
                          day.status === 'working-no-slots' ? '#d97706' : '#9ca3af'
                        };
                        cursor: ${day.isAvailable && day.isCurrentMonth ? 'pointer' : 'not-allowed'};
                        transition: all 0.2s;
                        text-align: center;
                        font-size: 0.9rem;
                        font-weight: ${day.isToday ? '700' : '500'};
                        min-height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      "
                      ${day.isAvailable && day.isCurrentMonth ? `
                        onmouseover="this.style.background='#ecfdf5'; this.style.color='#047857'; this.style.transform='scale(1.05)'"
                        onmouseout="this.style.background='${previewState.selectedDate === day.date ? (widgetConfig?.primaryColor || '#3b82f6') : 'white'}'; this.style.color='${previewState.selectedDate === day.date ? 'white' : '#059669'}'; this.style.transform='scale(1)'"
                      ` : ''}
                    >
                      ${day.dayNumber}
                      ${day.isToday ? `<div style="position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: ${previewState.selectedDate === day.date ? 'white' : (widgetConfig?.primaryColor || '#3b82f6')}; border-radius: 50%;"></div>` : ''}
                      ${day.isCurrentMonth && day.status === 'available' ? '<div style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></div>' : ''}
                      ${day.isCurrentMonth && day.status === 'working-no-slots' ? '<div style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; background: #f59e0b; border-radius: 50%;"></div>' : ''}
                    </button>
                  `).join('')}
                </div>
                
                <!-- Calendar Legend -->
                <div style="display: flex; justify-content: center; gap: 16px; padding: 12px; background: #f8fafc; font-size: 0.75rem; color: #6b7280;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
                    <span>Available</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></div>
                    <span>Fully Booked</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%;"></div>
                    <span>Closed</span>
                  </div>
                </div>
              </div>
              
              <!-- Time Slots -->
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <label style="font-size: 0.875rem; font-weight: 500; color: #374151; margin: 0;">Preferred Time *</label>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                  ${businessConfig.workingHours.timeSlots.map(time => {
                    const isAvailable = isAvailableTime(previewState.selectedDate, time);
                    const isSelected = previewState.selectedTime === time;
                    return `
                      <button
                        type="button"
                        onclick="${isAvailable ? `selectTime('${time}')` : 'return false;'}"
                        ${!isAvailable ? 'disabled' : ''}
                        title="${isAvailable ? time : 'Not available'}"
                        style="
                          padding: 12px 16px;
                          border: 2px solid ${isSelected ? (widgetConfig?.primaryColor || '#3b82f6') : isAvailable ? '#d1d5db' : '#e5e7eb'};
                          border-radius: ${widgetConfig?.borderRadius || 8}px;
                          background: ${isSelected ? '#eff6ff' : isAvailable ? 'white' : '#f9fafb'};
                          color: ${isSelected ? (widgetConfig?.primaryColor || '#3b82f6') : isAvailable ? '#374151' : '#9ca3af'};
                          cursor: ${isAvailable ? 'pointer' : 'not-allowed'};
                          transition: all 0.2s;
                          text-align: center;
                          font-size: 0.9rem;
                          font-weight: 500;
                          opacity: ${isAvailable ? '1' : '0.6'};
                        "
                        ${isAvailable ? `
                          onmouseover="if(!${isSelected}) { this.style.borderColor='${widgetConfig?.primaryColor || '#3b82f6'}'; this.style.background='#f0f9ff'; this.style.transform='translateY(-1px)'; }"
                          onmouseout="if(!${isSelected}) { this.style.borderColor='#d1d5db'; this.style.background='white'; this.style.transform='translateY(0)'; }"
                        ` : ''}
                      >
                        ${time}
                      </button>
                    `;
                  }).join('')}
                </div>
                ${!previewState.selectedDate ? '<p style="font-size: 0.875rem; color: #6b7280; text-align: center; margin: 8px 0 0 0;">Please select a date first</p>' : ''}
                <p style="font-size: 0.875rem; color: #6b7280; text-align: center; margin: 8px 0 0 0;">Business Hours: 9:00 AM - 5:00 PM • Monday - Friday</p>
              </div>
            </div>

            <!-- Your Information -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">Your Information</h3>
              
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${generateFormFields()}
                
                <button
                  type="submit"
                  class="sdvm-submit-btn"
                  onclick="submitForm(event)"
                  disabled
                  style="
                    width: 100%;
                    padding: 18px 24px;
                    background: ${widgetConfig.primaryColor || '#3b82f6'};
                    color: white;
                    border: none;
                    border-radius: ${widgetConfig.borderRadius || 8}px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: not-allowed;
                    transition: all 0.2s;
                    margin-top: 8px;
                    opacity: 0.6;
                  "
                  onmouseover="if (!this.disabled) { this.style.background='#2563eb'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'; }"
                  onmouseout="if (!this.disabled) { this.style.background='${widgetConfig.primaryColor || '#3b82f6'}'; this.style.transform='translateY(0)'; this.style.boxShadow='none'; }"
                >
                  ${widgetConfig?.customTexts?.buttonText || 'Schedule Appointment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    // Attach global event handlers
    window.toggleDropdown = () => {
      previewState.dropdownOpen = !previewState.dropdownOpen;
      renderWidget();
    };

    window.selectType = (typeId) => {
      handleTypeSelect(typeId);
      updateFormValidity();
    };
    window.selectDate = (date) => {
      handleDateSelect(date);
      updateFormValidity();
    };
    window.selectTime = (time) => {
      handleTimeSelect(time);
      updateFormValidity();
    };
    window.navigateMonth = navigateMonth;
    window.updateFormData = (field, value) => handleFormChange(field, value);
    window.submitForm = (e) => handleSubmit(e);
    window.updateFieldValidation = updateFieldValidation;

    // Attach search input event listener after rendering to prevent focus loss
    const searchInput = document.getElementById('dropdown-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        previewState.searchTerm = e.target.value;
        // Store cursor position
        const cursorPosition = e.target.selectionStart;
        renderWidget();
        // Restore cursor position after re-render
        setTimeout(() => {
          const newSearchInput = document.getElementById('dropdown-search-input');
          if (newSearchInput) {
            newSearchInput.focus();
            newSearchInput.setSelectionRange(cursorPosition, cursorPosition);
          }
        }, 0);
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sdvm-dropdown-container')) {
        if (previewState.dropdownOpen) {
          previewState.dropdownOpen = false;
          renderWidget();
        }
      }
    });
    
    // Update form validity after rendering
    setTimeout(() => {
      updateFormValidity();
    }, 0);
  }

  // CSS Styles - EXACT match to preview styling
  function injectStyles() {
    // Remove existing styles if they exist
    const existingStyles = document.getElementById('smartdvm-widget-styles');
    if (existingStyles) {
      existingStyles.remove();
    }

    const styles = `
      #smartdvm-booking-widget {
        font-family: ${widgetConfig?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'};
        max-width: 800px;
        margin: 0 auto;
        background: ${widgetConfig?.backgroundColor || 'white'};
        border: 1px solid #e5e7eb;
        border-radius: ${widgetConfig?.borderRadius || 12}px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        color: ${widgetConfig?.textColor || '#1F2937'};
      }

      .sdvm-widget-container {
        padding: 40px;
      }

      .sdvm-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .sdvm-label {
        display: block;
        font-weight: 600;
        color: ${widgetConfig?.textColor || '#374151'};
        margin-bottom: 8px;
        font-size: 0.875rem;
      }

      .sdvm-title {
        font-size: 2rem;
        font-weight: 600;
        color: ${widgetConfig?.primaryColor || '#3b82f6'};
        margin: 0 0 8px 0;
        line-height: 1.2;
      }

      .sdvm-subtitle {
        color: #6b7280;
        font-size: 1rem;
        margin: 0;
      }

      .sdvm-section {
        margin-bottom: 32px;
      }

      .sdvm-section-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 20px;
        color: #111827;
      }

      /* Service Selection Styles */
      .sdvm-dropdown-container {
        position: relative;
        margin-bottom: 16px;
      }

      .sdvm-dropdown-trigger {
        width: 100%;
        padding: 16px 20px;
        border: 2px solid #d1d5db;
        border-radius: ${widgetConfig?.borderRadius || 8}px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.2s;
        min-height: 60px;
        font-size: 1rem;
      }

      .sdvm-dropdown-trigger:hover {
        border-color: ${widgetConfig?.primaryColor || '#3b82f6'};
      }

      .sdvm-dropdown-content {
        flex: 1;
        text-align: left;
      }

      .sdvm-dropdown-label {
        font-weight: 500;
        color: #111827;
        font-size: 1rem;
        margin-bottom: 2px;
      }

      .sdvm-dropdown-description {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .sdvm-dropdown-arrow {
        width: 20px;
        height: 20px;
        color: #6b7280;
        transition: transform 0.2s;
      }

      .sdvm-dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: ${widgetConfig?.borderRadius || 8}px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 50;
        margin-top: 4px;
        max-height: 300px;
        overflow: hidden;
      }

      .sdvm-search-container {
        position: relative;
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
      }

      .sdvm-search-icon {
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: #6b7280;
      }

      .sdvm-search-input {
        width: 100%;
        padding: 8px 12px 8px 40px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: #f9fafb;
        font-size: 0.875rem;
        outline: none;
        box-sizing: border-box;
      }

      .sdvm-search-input:focus {
        border-color: ${widgetConfig?.primaryColor || '#3b82f6'};
        background: white;
      }

      .sdvm-options-container {
        max-height: 200px;
        overflow-y: auto;
      }

      .sdvm-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color 0.2s;
        border-bottom: 1px solid #f1f5f9;
      }

      .sdvm-option:hover {
        background-color: #f8fafc;
      }

      .sdvm-option.selected {
        background-color: #eff6ff;
        color: ${widgetConfig?.primaryColor || '#3b82f6'};
      }

      .sdvm-option-content {
        flex: 1;
      }

      .sdvm-option-name {
        font-weight: 600;
        color: #111827;
        margin-bottom: 2px;
      }

      .sdvm-option-description {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .sdvm-option-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sdvm-option-duration {
        font-size: 0.875rem;
        font-weight: 600;
        color: ${widgetConfig?.primaryColor || '#3b82f6'};
      }

      .sdvm-option-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      /* Calendar Widget Styles */
      .sdvm-calendar-widget {
        margin-bottom: 24px;
      }

      .sdvm-calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px 8px 0 0;
        margin-bottom: 0;
      }

      .sdvm-month-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
      }

      .sdvm-nav-btn {
        padding: 8px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .sdvm-nav-btn:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
        color: #374151;
      }

      .sdvm-nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .sdvm-calendar-days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-top: none;
      }

      .sdvm-day-header {
        padding: 12px 8px;
        text-align: center;
        font-size: 0.85rem;
        font-weight: 600;
        color: #64748b;
        border-right: 1px solid #e2e8f0;
      }

      .sdvm-day-header:last-child {
        border-right: none;
      }

      .sdvm-calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        border: 1px solid #e2e8f0;
        border-top: none;
        border-radius: 0 0 8px 8px;
        overflow: hidden;
      }

      .sdvm-calendar-day {
        position: relative;
        padding: 12px 8px;
        border: none;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        font-size: 0.9rem;
        font-weight: 500;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #374151;
      }

      .sdvm-calendar-day:nth-child(7n) {
        border-right: none;
      }

      .sdvm-calendar-day.other-month {
        color: #d1d5db;
        background: #f9fafb;
        cursor: not-allowed;
      }

      .sdvm-calendar-day.available {
        background: white;
        color: #059669;
        border-color: #e2e8f0;
      }

      .sdvm-calendar-day.available:hover {
        background: #ecfdf5;
        color: #047857;
        transform: scale(1.05);
      }

      .sdvm-calendar-day.working-no-slots {
        background: #fef3c7;
        color: #d97706;
      }

      .sdvm-calendar-day.unavailable {
        background: #f3f4f6;
        color: #9ca3af;
        cursor: not-allowed;
      }

      .sdvm-calendar-day.selected {
        background: #3b82f6;
        color: white;
        font-weight: 600;
      }

      .sdvm-calendar-day.today {
        font-weight: 700;
        position: relative;
      }

      .sdvm-calendar-day.today::after {
        content: '';
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: #3b82f6;
        border-radius: 50%;
      }

      .sdvm-calendar-day.selected.today::after {
        background: white;
      }

      .sdvm-availability-dot {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .sdvm-availability-dot.available {
        background: #10b981;
      }

      .sdvm-availability-dot.booked {
        background: #f59e0b;
      }

      .sdvm-calendar-legend {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-top: 12px;
        padding: 8px;
        font-size: 0.8rem;
        color: #6b7280;
      }

      .sdvm-legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .sdvm-legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .sdvm-legend-dot.available {
        background: #10b981;
      }

      .sdvm-legend-dot.booked {
        background: #f59e0b;
      }

      .sdvm-legend-dot.unavailable {
        background: #9ca3af;
      }

      /* Time Container Styles */
      .sdvm-time-container {
        margin-bottom: 20px;
      }

      .sdvm-time-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 10px;
      }

      .sdvm-time-slot {
        padding: 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .sdvm-time-slot.available {
        border-color: #d1d5db;
        color: #374151;
      }

      .sdvm-time-slot.available:hover {
        border-color: #3b82f6;
        background: #f0f9ff;
        transform: translateY(-1px);
      }

      .sdvm-time-slot.selected {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .sdvm-time-slot.unavailable {
        background: #f9fafb;
        color: #9ca3af;
        border-color: #e5e7eb;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .sdvm-time-note {
        font-size: 0.85rem;
        color: #6b7280;
        text-align: center;
        margin-top: 8px;
      }

      /* Responsive adjustments */
      @media (max-width: 640px) {
        .sdvm-calendar-header {
          padding: 12px;
        }
        
        .sdvm-month-title {
          font-size: 1rem;
        }
        
        .sdvm-calendar-day {
          min-height: 40px;
          font-size: 0.85rem;
        }
        
        .sdvm-time-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .sdvm-calendar-legend {
          gap: 12px;
          font-size: 0.75rem;
        }
      }

      .sdvm-time-prompt {
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0;
      }

      /* Form Validation Styles */
      .field-valid {
        border-color: #22c55e !important;
        background-color: #f0fdf4 !important;
      }

      .field-invalid {
        border-color: #dc2626 !important;
        background-color: #fef2f2 !important;
      }

      .field-valid:focus {
        border-color: #22c55e !important;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1) !important;
      }

      .field-invalid:focus {
        border-color: #dc2626 !important;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
      }

      /* Form Styles */
      .sdvm-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }

      .sdvm-input,
      .sdvm-select,
      .sdvm-textarea {
        width: 100%;
        padding: 16px 20px;
        border: 2px solid #d1d5db;
        border-radius: ${widgetConfig?.borderRadius || 8}px;
        font-size: 1rem;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
        background: white;
        color: ${widgetConfig?.textColor || '#111827'};
        margin-bottom: 16px;
      }

      .sdvm-input::placeholder,
      .sdvm-textarea::placeholder {
        color: #9ca3af;
      }

      .sdvm-input:focus,
      .sdvm-select:focus,
      .sdvm-textarea:focus {
        border-color: ${widgetConfig?.primaryColor || '#3b82f6'};
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .sdvm-select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 12px center;
        background-repeat: no-repeat;
        background-size: 16px;
        padding-right: 48px;
      }

      .sdvm-textarea {
        resize: vertical;
        min-height: 100px;
        font-family: inherit;
      }

      .sdvm-submit-btn {
        width: 100%;
        padding: 18px 24px;
        background: ${widgetConfig?.primaryColor || '#3b82f6'};
        color: white;
        border: none;
        border-radius: ${widgetConfig?.borderRadius || 8}px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 8px;
      }

      .sdvm-submit-btn:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      }

      .sdvm-submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .sdvm-widget-container {
          padding: 24px;
        }
        
        .sdvm-form-row {
          grid-template-columns: 1fr;
        }
        
        .sdvm-date-buttons {
          flex-direction: column;
        }
        
        .sdvm-time-slots {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .sdvm-title {
          font-size: 1.5rem;
        }
      }

      /* Preview message styles */
      .sdvm-preview-message {
        margin-top: 20px;
      }

      /* No services available styles */
      .sdvm-no-services {
        text-align: center;
        padding: 2rem;
        background: #f9fafb;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        color: #6b7280;
      }

      .sdvm-no-services-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 1rem;
        color: #9ca3af;
      }

      .sdvm-no-services-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #374151;
      }

      .sdvm-no-services-description {
        font-size: 0.875rem;
        line-height: 1.5;
        max-width: 400px;
        margin: 0 auto;
      }

      .sdvm-no-results {
        text-align: center;
        padding: 1rem;
        color: #6b7280;
        font-size: 0.875rem;
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'smartdvm-widget-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Main initialization function
  async function initWidget() {
    if (isLoaded) return;
    
    const container = document.getElementById('smartdvm-booking-widget');
    if (!container) {
      console.error('SmartDVM: Widget container not found. Please add <div id="smartdvm-booking-widget"></div> to your page.');
      return;
    }

    // Show loading state
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: #6b7280;">Loading appointment form...</div>';

    // Fetch widget configuration
    await fetchWidgetConfig();
    
    // Inject styles
    injectStyles();
    
    // Render widget
    renderWidget();
    
    // Load real availability data
    await loadAvailability();
    
    isLoaded = true;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
