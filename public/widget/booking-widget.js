/**
 * SmartDVM Appointment Booking Widget
 * Embeddable widget for practice websites
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
  
  // Widget configuration will be fetched from API
  let widgetConfig = null;

  // Widget state
  let isLoaded = false;
  let selectedDate = null;
  let selectedTime = null;
  let selectedType = null;
  let appointmentTypes = [];

  // Show error message
  function showError(message) {
    const container = document.getElementById('smartdvm-booking-widget');
    if (!container) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'sdvm-error';
    errorDiv.innerHTML = `
      <div style="
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 8px;
        margin: 10px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>${message}</span>
      </div>
    `;
    
    container.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  // Fetch complete widget configuration
  async function fetchWidgetConfig() {
    try {
      const response = await fetch(`${baseUrl}/api/widget/config?practiceId=${practiceId}&apiKey=${apiKey}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      widgetConfig = data;
      appointmentTypes = data.appointmentTypes || [];
      return data;
    } catch (error) {
      console.error('SmartDVM: Failed to fetch widget configuration:', error);
      showError('Failed to load widget configuration. Please try again later.');
      return null;
    }
  }

  // Utility functions
  function createElement(tag, className, innerHTML) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  }

  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  function isDateAvailable(date) {
    if (!widgetConfig) return false;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return widgetConfig.availableDays.includes(dayName);
  }

  function generateTimeSlots() {
    if (!widgetConfig) return [];
    const slots = [];
    const { start, end } = widgetConfig.workingHours;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    for (let time = startTime; time < endTime; time += widgetConfig.timeSlotDuration) {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
    
    return slots;
  }

  // API functions
  async function submitAppointmentRequest(formData) {
    try {
      const response = await fetch(`${baseUrl}/api/external/appointment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Practice-ID': practiceId.toString()
        },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          reason: getSelectedAppointmentTypeName(),
          source: 'WEBSITE',
          clientInfo: {
            name: formData.get('clientName'),
            email: formData.get('clientEmail'),
            phone: formData.get('clientPhone')
          },
          petInfo: {
            name: formData.get('petName'),
            species: formData.get('petType'),
            breed: formData.get('petBreed') || '',
            age: formData.get('petAge') || ''
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit appointment request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting appointment:', error);
      throw error;
    }
  }

  function getSelectedAppointmentTypeName() {
    const selectedAppointmentType = widgetConfig.appointmentTypes
      .filter(type => type.enabled)
      .find(type => type.id === selectedType);
    return selectedAppointmentType ? selectedAppointmentType.name : 'General Appointment';
  }

  // Widget UI functions
  function createDatePicker() {
    const container = createElement('div', 'sdvm-date-picker');
    const title = createElement('h3', 'sdvm-step-title', 'Select Date');
    container.appendChild(title);

    const calendar = createElement('div', 'sdvm-calendar');
    const today = new Date();
    
    for (let i = 0; i < widgetConfig.advanceBookingDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (isDateAvailable(date)) {
        const dateBtn = createElement('button', 'sdvm-date-btn', 
          date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })
        );
        dateBtn.dataset.date = formatDate(date);
        dateBtn.onclick = () => selectDate(formatDate(date), dateBtn);
        calendar.appendChild(dateBtn);
      }
    }
    
    container.appendChild(calendar);
    return container;
  }

  function createTimePicker() {
    const container = createElement('div', 'sdvm-time-picker');
    const title = createElement('h3', 'sdvm-step-title', 'Select Time');
    container.appendChild(title);

    const timeGrid = createElement('div', 'sdvm-time-grid');
    const slots = generateTimeSlots();
    
    slots.forEach(time => {
      const timeBtn = createElement('button', 'sdvm-time-btn', 
        new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        })
      );
      timeBtn.dataset.time = time;
      timeBtn.onclick = () => selectTime(time, timeBtn);
      timeGrid.appendChild(timeBtn);
    });
    
    container.appendChild(timeGrid);
    return container;
  }

  function createAppointmentTypePicker() {
    const container = createElement('div', 'sdvm-type-picker');
    const title = createElement('h3', 'sdvm-step-title', 'Select Service');
    container.appendChild(title);

    const enabledTypes = appointmentTypes.filter(type => type.enabled);
    
    if (enabledTypes.length === 0) {
      const emptyState = createElement('div', 'sdvm-empty-state', 
        '<p>No appointment types available. Please contact us directly.</p>'
      );
      container.appendChild(emptyState);
      return container;
    }
    
    // Create dropdown container
    const dropdown = createElement('div', 'sdvm-dropdown');
    dropdown.innerHTML = `
      <div class="sdvm-dropdown-trigger" id="serviceDropdownTrigger">
        <div class="sdvm-dropdown-content">
          <div class="sdvm-dropdown-label">Choose a service...</div>
          <div class="sdvm-dropdown-description"></div>
        </div>
        <svg class="sdvm-dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      
      <div class="sdvm-dropdown-menu" id="serviceDropdownMenu">
        <div class="sdvm-search-container">
          <svg class="sdvm-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input type="text" class="sdvm-search-input" placeholder="Search services..." id="serviceSearch">
        </div>
        
        <div class="sdvm-options-container" id="serviceOptions">
          ${enabledTypes.map(type => `
            <div class="sdvm-option" data-type-id="${type.id}" data-type-name="${type.name}" data-type-description="${type.description}" data-type-duration="${type.duration}">
              <div class="sdvm-option-content">
                <div class="sdvm-option-name">${type.name}</div>
                <div class="sdvm-option-description">${type.description}</div>
              </div>
              <div class="sdvm-option-meta">
                <span class="sdvm-option-duration" style="color: ${type.color}">${type.duration}min</span>
                <div class="sdvm-option-color" style="background-color: ${type.color}"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    container.appendChild(dropdown);
    
    // Add event listeners
    const trigger = dropdown.querySelector('#serviceDropdownTrigger');
    const menu = dropdown.querySelector('#serviceDropdownMenu');
    const searchInput = dropdown.querySelector('#serviceSearch');
    const options = dropdown.querySelectorAll('.sdvm-option');
    
    // Toggle dropdown
    trigger.onclick = (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      if (menu.style.display === 'block') {
        searchInput.focus();
      }
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });
    
    // Search functionality
    searchInput.oninput = (e) => {
      const searchTerm = e.target.value.toLowerCase();
      options.forEach(option => {
        const name = option.dataset.typeName.toLowerCase();
        const description = option.dataset.typeDescription.toLowerCase();
        const matches = name.includes(searchTerm) || description.includes(searchTerm);
        option.style.display = matches ? 'flex' : 'none';
      });
    };
    
    // Option selection
    options.forEach(option => {
      option.onclick = (e) => {
        e.stopPropagation();
        const typeId = option.dataset.typeId;
        const typeName = option.dataset.typeName;
        const typeDescription = option.dataset.typeDescription;
        const typeDuration = option.dataset.typeDuration;
        
        // Update trigger display
        trigger.querySelector('.sdvm-dropdown-label').textContent = typeName;
        trigger.querySelector('.sdvm-dropdown-description').textContent = `${typeDescription} • ${typeDuration}min`;
        
        // Select the type
        selectType(typeId, option);
        menu.style.display = 'none';
      };
    });
    
    return container;
  }

  function createContactForm() {
    const container = createElement('div', 'sdvm-contact-form');
    const title = createElement('h3', 'sdvm-step-title', 'Your Information');
    container.appendChild(title);

    const form = createElement('form', 'sdvm-form');
    form.innerHTML = `
      <div class="sdvm-form-group">
        <label for="clientName">Your Name *</label>
        <input type="text" id="clientName" name="clientName" required>
      </div>
      <div class="sdvm-form-group">
        <label for="clientEmail">Email *</label>
        <input type="email" id="clientEmail" name="clientEmail" required>
      </div>
      <div class="sdvm-form-group">
        <label for="clientPhone">Phone *</label>
        <input type="tel" id="clientPhone" name="clientPhone" required>
      </div>
      <div class="sdvm-form-group">
        <label for="petName">Pet's Name *</label>
        <input type="text" id="petName" name="petName" required>
      </div>
      <div class="sdvm-form-group">
        <label for="petType">Pet Type *</label>
        <select id="petType" name="petType" required>
          <option value="">Select pet type</option>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
          <option value="bird">Bird</option>
          <option value="rabbit">Rabbit</option>
          <option value="reptile">Reptile</option>
          <option value="other">Other</option>
        </select>
      </div>
      ${widgetConfig.requiredFields.petBreed ? `
        <div class="sdvm-form-group">
          <label for="petBreed">Pet Breed</label>
          <input type="text" id="petBreed" name="petBreed">
        </div>
      ` : ''}
      ${widgetConfig.requiredFields.petAge ? `
        <div class="sdvm-form-group">
          <label for="petAge">Pet Age</label>
          <input type="text" id="petAge" name="petAge" placeholder="e.g., 2 years">
        </div>
      ` : ''}
      <button type="submit" class="sdvm-submit-btn">${widgetConfig.customTexts.buttonText}</button>
    `;

    form.onsubmit = handleFormSubmit;
    container.appendChild(form);
    return container;
  }

  // Event handlers
  function selectDate(date, element) {
    selectedDate = date;
    document.querySelectorAll('.sdvm-date-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
    // Removed showStep(2) - keep all sections visible
  }

  function selectTime(time, element) {
    selectedTime = time;
    document.querySelectorAll('.sdvm-time-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
    // Removed showStep(3) - keep all sections visible
  }

  function selectType(typeId, element) {
    selectedType = typeId;
    
    // Update dropdown text and hide dropdown
    const dropdownButton = document.querySelector('.sdvm-dropdown-button');
    const dropdownList = document.querySelector('.sdvm-dropdown-list');
    
    if (dropdownButton && element) {
      dropdownButton.innerHTML = `${element.textContent} <span class="sdvm-dropdown-arrow">▼</span>`;
      dropdownButton.classList.add('selected');
    }
    
    if (dropdownList) {
      dropdownList.style.display = 'none';
    }
    
    // Removed showStep(4) - keep all sections visible
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.sdvm-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
      const formData = new FormData(e.target);
      await submitAppointmentRequest(formData);
      
      showSuccessMessage();
    } catch (error) {
      showErrorMessage();
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  function showStep(stepNumber) {
    const widget = document.getElementById('smartdvm-booking-widget');
    const steps = widget.querySelectorAll('.sdvm-step');
    
    steps.forEach((step, index) => {
      step.style.display = index + 1 === stepNumber ? 'block' : 'none';
    });
  }

  function showSuccessMessage() {
    const widget = document.getElementById('smartdvm-booking-widget');
    widget.innerHTML = `
      <div class="sdvm-success">
        <div class="sdvm-success-icon">✓</div>
        <h3>${widgetConfig.customTexts.successMessage}</h3>
        <p>${widgetConfig.customTexts.footerText}</p>
        <button onclick="location.reload()" class="sdvm-reset-btn">Book Another Appointment</button>
      </div>
    `;
  }

  function showErrorMessage() {
    const widget = document.getElementById('smartdvm-booking-widget');
    const errorDiv = createElement('div', 'sdvm-error', 
      `<p>${widgetConfig.customTexts.errorMessage}</p>`
    );
    widget.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  // CSS Styles
  function injectStyles() {
    if (document.getElementById('smartdvm-widget-styles')) return;
    if (!widgetConfig) return; // Wait for config to be loaded

    // Base styles for the widget
    let widgetStyles = `
      font-family: ${widgetConfig.fontFamily};
      max-width: 600px;
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: ${widgetConfig.borderRadius}px;
      background: ${widgetConfig.theme === 'dark' ? '#1a202c' : '#ffffff'};
      color: ${widgetConfig.theme === 'dark' ? '#ffffff' : '#1a202c'};
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;

    // Add position-specific styles
    switch (widgetConfig.position) {
      case 'floating-right':
        widgetStyles += `
          position: fixed;
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
          z-index: 9999;
          max-width: 400px;
          max-height: 80vh;
          overflow-y: auto;
        `;
        break;
      case 'floating-left':
        widgetStyles += `
          position: fixed;
          top: 50%;
          left: 20px;
          transform: translateY(-50%);
          z-index: 9999;
          max-width: 400px;
          max-height: 80vh;
          overflow-y: auto;
        `;
        break;
      case 'modal':
        widgetStyles += `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10000;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
        `;
        break;
      default: // 'inline'
        widgetStyles += `
          margin: 0 auto;
        `;
    }

    const styles = `
      #smartdvm-booking-widget {
        ${widgetStyles}
      }

      ${widgetConfig.position === 'modal' ? `
        #smartdvm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        #smartdvm-modal-trigger {
          background: ${widgetConfig.primaryColor};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: ${widgetConfig.borderRadius}px;
          font-family: ${widgetConfig.fontFamily};
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        #smartdvm-modal-trigger:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      ` : ''}

      ${(widgetConfig.position === 'floating-right' || widgetConfig.position === 'floating-left') ? `
        #smartdvm-floating-trigger {
          position: fixed;
          ${widgetConfig.position === 'floating-right' ? 'right: 20px;' : 'left: 20px;'}
          bottom: 20px;
          background: ${widgetConfig.primaryColor};
          color: white;
          border: none;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          z-index: 9998;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }
        
        #smartdvm-floating-trigger:hover {
          transform: scale(1.1);
        }
        
        #smartdvm-booking-widget.floating-hidden {
          display: none;
        }
        
        #smartdvm-close-widget {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: ${widgetConfig.theme === 'dark' ? '#ffffff' : '#666666'};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        #smartdvm-close-widget:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      ` : ''}

      .sdvm-header {
        text-align: center;
        margin-bottom: 30px;
      }

      .sdvm-step-title {
        font-size: 1.5rem;
        margin-bottom: 20px;
        color: ${widgetConfig.primaryColor};
      }

      .sdvm-calendar, .sdvm-time-grid, .sdvm-type-grid {
        display: grid;
        gap: 10px;
        margin-bottom: 20px;
      }

      .sdvm-calendar {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      }

      .sdvm-time-grid {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      }

      .sdvm-type-grid {
        grid-template-columns: 1fr;
      }

      .sdvm-date-btn, .sdvm-time-btn {
        padding: 12px;
        border: 2px solid #e2e8f0;
        border-radius: ${widgetConfig.borderRadius}px;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
      }

      .sdvm-date-btn:hover, .sdvm-time-btn:hover {
        border-color: ${widgetConfig.primaryColor};
        background: ${widgetConfig.primaryColor}10;
      }

      .sdvm-date-btn.selected, .sdvm-time-btn.selected {
        background: ${widgetConfig.primaryColor};
        color: white;
        border-color: ${widgetConfig.primaryColor};
      }

      .sdvm-dropdown {
        position: relative;
      }

      .sdvm-dropdown-trigger {
        width: 100%;
        padding: 16px;
        border: 2px solid #e2e8f0;
        border-radius: ${widgetConfig.borderRadius}px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.2s;
      }

      .sdvm-dropdown-trigger:hover {
        border-color: ${widgetConfig.primaryColor};
        background: ${widgetConfig.primaryColor}05;
      }

      .sdvm-dropdown-content {
        flex: 1;
      }

      .sdvm-dropdown-label {
        font-weight: 600;
        color: #1a202c;
        margin-bottom: 4px;
      }

      .sdvm-dropdown-description {
        font-size: 0.875rem;
        color: #64748b;
      }

      .sdvm-dropdown-arrow {
        width: 20px;
        height: 20px;
        color: #64748b;
        transition: transform 0.2s;
      }

      .sdvm-dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: ${widgetConfig.borderRadius}px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 50;
        margin-top: 4px;
        max-height: 300px;
        overflow: hidden;
      }

      .sdvm-search-container {
        position: relative;
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
      }

      .sdvm-search-icon {
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: #64748b;
      }

      .sdvm-search-input {
        width: 100%;
        padding: 8px 12px 8px 40px;
        border: 1px solid #e2e8f0;
        border-radius: ${widgetConfig.borderRadius}px;
        background: #f8fafc;
        font-size: 0.875rem;
        outline: none;
      }

      .sdvm-search-input:focus {
        border-color: ${widgetConfig.primaryColor};
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

      .sdvm-option:last-child {
        border-bottom: none;
      }

      .sdvm-option.selected {
        background-color: ${widgetConfig.primaryColor}10;
        color: ${widgetConfig.primaryColor};
      }

      .sdvm-option-content {
        flex: 1;
      }

      .sdvm-option-name {
        font-weight: 600;
        color: #1a202c;
        margin-bottom: 4px;
      }

      .sdvm-option-description {
        font-size: 0.875rem;
        color: #64748b;
      }

      .sdvm-option-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sdvm-option-duration {
        font-size: 0.875rem;
        font-weight: 600;
      }

      .sdvm-option-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      .sdvm-form-group {
        margin-bottom: 20px;
      }

      .sdvm-form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }

      .sdvm-form-group input, .sdvm-form-group select {
        width: 100%;
        padding: 12px;
        border: 2px solid #e2e8f0;
        border-radius: ${widgetConfig.borderRadius}px;
        font-size: 1rem;
      }

      .sdvm-form-group input:focus, .sdvm-form-group select:focus {
        outline: none;
        border-color: ${widgetConfig.primaryColor};
      }

      .sdvm-submit-btn, .sdvm-reset-btn {
        width: 100%;
        padding: 15px;
        background: ${widgetConfig.primaryColor};
        color: white;
        border: none;
        border-radius: ${widgetConfig.borderRadius}px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .sdvm-submit-btn:hover, .sdvm-reset-btn:hover {
        opacity: 0.9;
      }

      .sdvm-submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .sdvm-success {
        text-align: center;
        padding: 40px 20px;
      }

      .sdvm-success-icon {
        font-size: 3rem;
        color: #10b981;
        margin-bottom: 20px;
      }

      .sdvm-error {
        background: #fee2e2;
        color: #dc2626;
        padding: 15px;
        border-radius: ${widgetConfig.borderRadius}px;
        margin: 20px 0;
      }

      .sdvm-step {
        margin-bottom: 30px;
      }
      
      .sdvm-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        font-size: 16px;
        color: ${widgetConfig.theme === 'dark' ? '#ffffff' : '#666666'};
      }
      
      .sdvm-loading::before {
        content: '';
        width: 20px;
        height: 20px;
        border: 2px solid ${widgetConfig.primaryColor};
        border-top-color: transparent;
        border-radius: 50%;
        margin-right: 10px;
        animation: sdvm-spin 1s linear infinite;
      }
      
      @keyframes sdvm-spin {
        to { transform: rotate(360deg); }
      }
      
      .sdvm-empty-state {
        text-align: center;
        padding: 20px;
        color: ${widgetConfig.theme === 'dark' ? '#ffffff' : '#666666'};
        background: ${widgetConfig.theme === 'dark' ? '#2d3748' : '#f7fafc'};
        border-radius: ${widgetConfig.borderRadius}px;
        border: 1px dashed #cbd5e0;
      }

      @media (max-width: 768px) {
        #smartdvm-booking-widget {
          padding: 15px;
        }
        
        .sdvm-calendar {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .sdvm-time-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `;

    const styleSheet = createElement('style');
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
    container.innerHTML = '<div class="sdvm-loading">Loading appointment form...</div>';

    // Fetch widget configuration first
    const config = await fetchWidgetConfig();
    if (!config) {
      container.innerHTML = '<div class="sdvm-error">Failed to load widget. Please check your API key and try again.</div>';
      return;
    }

    injectStyles();
    
    // Handle different positioning modes
    if (widgetConfig.position === 'modal') {
      initModalWidget(container);
    } else if (widgetConfig.position === 'floating-right' || widgetConfig.position === 'floating-left') {
      initFloatingWidget(container);
    } else {
      initInlineWidget(container);
    }
    
    isLoaded = true;
  }

  function initInlineWidget(container) {
    renderWidgetContent(container);
    attachEventHandlers();
  }

  function initModalWidget(container) {
    // Create modal trigger button
    container.innerHTML = `
      <button id="smartdvm-modal-trigger">
        ${widgetConfig.customTexts.buttonText || 'Book Appointment'}
      </button>
    `;
    
    // Add click handler to show modal
    const trigger = document.getElementById('smartdvm-modal-trigger');
    trigger.addEventListener('click', showModal);
  }

  function initFloatingWidget(container) {
    // Create floating trigger button
    const trigger = document.createElement('button');
    trigger.id = 'smartdvm-floating-trigger';
    trigger.innerHTML = '📅'; // Calendar emoji
    trigger.title = 'Book Appointment';
    document.body.appendChild(trigger);
    
    // Initially hide the widget
    container.classList.add('floating-hidden');
    renderWidgetContent(container);
    
    // Add close button to widget
    const closeBtn = document.createElement('button');
    closeBtn.id = 'smartdvm-close-widget';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    container.insertBefore(closeBtn, container.firstChild);
    
    // Event handlers
    trigger.addEventListener('click', () => {
      container.classList.remove('floating-hidden');
    });
    
    closeBtn.addEventListener('click', () => {
      container.classList.add('floating-hidden');
    });
    
    attachEventHandlers();
  }

  function showModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'smartdvm-modal-overlay';
    
    // Create modal content container
    const modalWidget = document.createElement('div');
    modalWidget.id = 'smartdvm-booking-widget';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: ${widgetConfig.theme === 'dark' ? '#ffffff' : '#666666'};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    renderWidgetContent(modalWidget);
    modalWidget.insertBefore(closeBtn, modalWidget.firstChild);
    
    overlay.appendChild(modalWidget);
    document.body.appendChild(overlay);
    
    // Close handlers
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    // Escape key handler
    document.addEventListener('keydown', function escapeHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    });
    
    function closeModal() {
      document.body.removeChild(overlay);
    }
    
    attachEventHandlers();
  }

  function renderWidgetContent(container) {
    container.innerHTML = `
      <div class="sdvm-header">
        <h2>${widgetConfig.customTexts.headerTitle}</h2>
        <p>${widgetConfig.customTexts.headerSubtitle}</p>
      </div>
      
      <div class="sdvm-step">${createAppointmentTypePicker().outerHTML}</div>
      <div class="sdvm-step">${createDatePicker().outerHTML}</div>
      <div class="sdvm-step">${createTimePicker().outerHTML}</div>
      <div class="sdvm-step">${createContactForm().outerHTML}</div>
    `;
  }

  function attachEventHandlers() {
    // Type selection - now handled within the dropdown component

    // Date selection
    document.querySelectorAll('.sdvm-date-btn').forEach(btn => {
      const date = btn.dataset.date;
      btn.onclick = () => selectDate(date, btn);
    });

    // Time selection
    document.querySelectorAll('.sdvm-time-btn').forEach(btn => {
      const time = btn.dataset.time;
      btn.onclick = () => selectTime(time, btn);
    });

    // Form submission
    const form = document.querySelector('.sdvm-form');
    if (form) {
      form.onsubmit = handleFormSubmit;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
