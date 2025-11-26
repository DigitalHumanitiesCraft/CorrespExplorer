// HerData Utilities
// Shared utility functions for the HerData application

/**
 * Toast notification constants
 */
const TOAST_CONFIG = {
    SHOW_DELAY: 10,
    DURATION: 3000,
    HIDE_DELAY: 300
};

/**
 * Toast notification utility
 * Displays temporary toast messages with different types
 */
export const Toast = {
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success|warning|error|info)
     */
    show(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        const icon = document.createElement('i');
        icon.className = this.getIconClass(type);
        toast.prepend(icon);

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), TOAST_CONFIG.SHOW_DELAY);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), TOAST_CONFIG.HIDE_DELAY);
        }, TOAST_CONFIG.DURATION);
    },

    /**
     * Get Font Awesome icon class for toast type
     * @param {string} type - Toast type
     * @returns {string} Font Awesome icon class
     * @private
     */
    getIconClass(type) {
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
};

/**
 * Download helper utility
 * Creates and triggers a file download
 */
export const Download = {
    /**
     * Download content as a file
     * @param {string} content - File content
     * @param {string} filename - Name of the file
     * @param {string} mimeType - MIME type of the file
     */
    file(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

/**
 * Debounce utility
 * delays execution of a function until after a wait period
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.Toast = Toast;
    window.Download = Download;
    window.debounce = debounce;
}
