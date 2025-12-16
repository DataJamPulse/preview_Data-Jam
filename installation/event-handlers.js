/**
 * Event Handlers Module - Event Delegation for Security
 * v1.0.0 - Replaces inline onclick handlers for CSP compliance
 *
 * SECURITY: Using event delegation instead of inline onclick:
 * - Allows removing 'unsafe-inline' from CSP
 * - Prevents XSS attacks via injected HTML
 * - Centralizes all event handling for easier auditing
 *
 * Usage: Add data-action attribute instead of onclick
 *   <button data-action="logout">Logout</button>
 *   <button data-action="view-details" data-id="123">View</button>
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventHandlers);
  } else {
    initEventHandlers();
  }

  function initEventHandlers() {
    // Single event listener for all click actions
    document.body.addEventListener('click', handleClick);
    console.log('[EventHandlers] Initialized event delegation');
  }

  function handleClick(e) {
    // Find closest element with data-action
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    const value = target.dataset.value;

    // Log action for debugging (remove in production)
    // console.log('[EventHandlers] Action:', action, 'ID:', id, 'Value:', value);

    // Route to appropriate handler
    switch (action) {
      // ========================================
      // Authentication Actions
      // ========================================
      case 'logout':
        e.preventDefault();
        if (typeof SessionManager !== 'undefined') {
          SessionManager.logout();
        } else if (typeof AuthClient !== 'undefined') {
          if (confirm('Are you sure you want to log out?')) {
            AuthClient.logout(true);
          }
        }
        break;

      // ========================================
      // Navigation Actions
      // ========================================
      case 'navigate':
        e.preventDefault();
        if (value) {
          window.location.href = value;
        }
        break;

      case 'go-back':
        e.preventDefault();
        window.history.back();
        break;

      // ========================================
      // Modal Actions
      // ========================================
      case 'close-modal':
        e.preventDefault();
        const modal = target.closest('.modal');
        if (modal) modal.remove();
        break;

      case 'close-warning':
        e.preventDefault();
        const warning = target.closest('.low-stock-warning');
        if (warning) warning.remove();
        break;

      // ========================================
      // Print/PDF Actions
      // ========================================
      case 'print':
        e.preventDefault();
        window.print();
        break;

      case 'close-window':
        e.preventDefault();
        window.close();
        break;

      // ========================================
      // Installation List Actions
      // ========================================
      case 'switch-view':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && value) {
          listManager.switchView(value);
        }
        break;

      case 'view-details':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && id) {
          listManager.viewDetails(parseInt(id));
        }
        break;

      case 'print-report':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && id) {
          listManager.printReport(parseInt(id));
        }
        break;

      case 'save-pdf':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && id) {
          listManager.savePDF(parseInt(id));
        }
        break;

      case 'edit-installation':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && id) {
          listManager.editInstallation(parseInt(id));
        }
        break;

      case 'delete-installation':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && id) {
          listManager.deleteInstallation(parseInt(id));
        }
        break;

      // ========================================
      // Calendar Actions
      // ========================================
      case 'change-month':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && value !== undefined) {
          listManager.changeMonth(parseInt(value));
        }
        break;

      case 'filter-by-date':
        e.preventDefault();
        if (typeof listManager !== 'undefined' && value) {
          listManager.filterByDate(value);
        }
        break;

      case 'export-ics':
        e.preventDefault();
        if (typeof listManager !== 'undefined') {
          listManager.exportToICS();
        }
        break;

      case 'add-to-google-calendar':
        e.preventDefault();
        if (typeof listManager !== 'undefined') {
          listManager.addToGoogleCalendar();
        }
        break;

      // ========================================
      // Photo Actions
      // ========================================
      case 'remove-photo':
        e.preventDefault();
        if (typeof installManager !== 'undefined' && id !== undefined) {
          installManager.removePhoto(parseInt(id));
        }
        break;

      // ========================================
      // Project Actions
      // ========================================
      case 'view-project-details':
        e.preventDefault();
        if (typeof projectManager !== 'undefined' && id) {
          projectManager.viewProjectDetails(id);
        }
        break;

      // ========================================
      // Inventory/Shipment Actions
      // ========================================
      case 'mark-delivered':
        e.preventDefault();
        if (typeof inventoryManager !== 'undefined' && id) {
          inventoryManager.markDelivered(parseInt(id));
        }
        break;

      case 'delete-shipment':
        e.preventDefault();
        if (typeof inventoryManager !== 'undefined' && id) {
          inventoryManager.deleteShipment(parseInt(id));
        }
        break;

      // ========================================
      // User Management Actions
      // ========================================
      case 'open-edit-modal':
        e.preventDefault();
        if (typeof userManager !== 'undefined' && id) {
          userManager.openEditModal(id);
        }
        break;

      case 'close-edit-modal':
        e.preventDefault();
        if (typeof userManager !== 'undefined') {
          userManager.closeEditModal();
        }
        break;

      case 'open-password-modal':
        e.preventDefault();
        if (typeof userManager !== 'undefined' && id) {
          userManager.openPasswordModal(id);
        }
        break;

      case 'close-password-modal':
        e.preventDefault();
        if (typeof userManager !== 'undefined') {
          userManager.closePasswordModal();
        }
        break;

      case 'open-delete-modal':
        e.preventDefault();
        if (typeof userManager !== 'undefined' && id) {
          userManager.openDeleteModal(id);
        }
        break;

      case 'close-delete-modal':
        e.preventDefault();
        if (typeof userManager !== 'undefined') {
          userManager.closeDeleteModal();
        }
        break;

      case 'confirm-delete':
        e.preventDefault();
        if (typeof userManager !== 'undefined') {
          userManager.confirmDelete();
        }
        break;

      // ========================================
      // Customer Directory Actions
      // ========================================
      case 'view-customer-details':
        e.preventDefault();
        if (typeof customerManager !== 'undefined' && value) {
          customerManager.viewCustomerDetails(value);
        }
        break;

      default:
        console.warn('[EventHandlers] Unknown action:', action);
    }
  }

  // Export for use in other modules if needed
  window.EventHandlers = {
    handleClick: handleClick
  };

})();
