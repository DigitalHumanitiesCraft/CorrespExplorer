// Navbar Component Loader - HSA
// Loads the shared navbar component and initializes functionality

const DEBUG = false;

const log = {
    debug: (msg) => DEBUG && console.log(`[Navbar] ${msg}`),
    error: (msg, error) => console.error(`[Navbar] ${msg}`, error || '')
};

export async function loadNavbar(variant = 'full') {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');

    if (!navbarPlaceholder) {
        log.debug('Navbar placeholder not found');
        return;
    }

    const navbarFile = 'components/navbar.html';

    try {
        const response = await fetch(navbarFile);
        if (!response.ok) throw new Error('Failed to load navbar');

        const html = await response.text();
        navbarPlaceholder.innerHTML = html;

        // Initialize components after navbar is loaded
        setTimeout(() => {
            initBurgerMenu();
            setActiveView();
            updateViewLabels();

            // Update labels on resize
            window.addEventListener('resize', updateViewLabels);
        }, 0);

        log.debug('Navbar component loaded');
    } catch (error) {
        log.error('Failed to load navbar:', error);
        navbarPlaceholder.innerHTML = `
            <nav class="navbar" role="navigation">
                <div class="nav-brand">
                    <a href="index.html" style="color: inherit; text-decoration: none;">HSA</a>
                </div>
            </nav>
        `;
    }
}

// Set active view button based on current page
function setActiveView() {
    const currentPath = window.location.pathname;
    const viewButtons = document.querySelectorAll('.view-btn');

    viewButtons.forEach(btn => {
        const view = btn.getAttribute('data-view');
        let isActive = false;

        if (view === 'map' && (currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.endsWith('/docs/'))) {
            isActive = true;
        } else if (view === 'persons' && currentPath.includes('persons.html')) {
            isActive = true;
        } else if (view === 'stats' && currentPath.includes('stats.html')) {
            isActive = true;
        } else if (view === 'subjects' && currentPath.includes('subjects.html')) {
            isActive = true;
        } else if (view === 'places' && currentPath.includes('places.html')) {
            isActive = true;
        }

        if (isActive) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    });

    log.debug('Active view set based on URL');
}

// Update view button labels based on screen size
function updateViewLabels() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const isMobile = window.innerWidth <= 768;

    viewButtons.forEach(btn => {
        const textSpan = btn.querySelector('.view-btn-text');
        if (!textSpan) return;

        if (isMobile) {
            const mobileLabel = btn.getAttribute('data-label-mobile');
            if (mobileLabel) {
                textSpan.textContent = mobileLabel;
            }
        } else {
            // Restore original labels
            const view = btn.getAttribute('data-view');
            if (view === 'map') textSpan.textContent = 'Karte';
            else if (view === 'persons') textSpan.textContent = 'Korrespondenten';
            else if (view === 'stats') textSpan.textContent = 'Brief-Explorer';
            else if (view === 'subjects') textSpan.textContent = 'Themen';
            else if (view === 'places') textSpan.textContent = 'Orte';
        }
    });
}

// Initialize burger menu functionality
function initBurgerMenu() {
    const burger = document.getElementById('nav-burger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    const overlay = document.getElementById('nav-overlay');

    if (!burger || !mobileMenu || !overlay) {
        log.debug('Burger menu elements not found');
        return;
    }

    log.debug('Initializing burger menu');

    // Toggle menu on burger click
    burger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isActive = mobileMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        burger.classList.toggle('active');
        burger.setAttribute('aria-expanded', isActive);
        burger.setAttribute('aria-label', isActive ? 'Navigation schliessen' : 'Navigation oeffnen');

        // Prevent body scroll when menu is open
        document.body.style.overflow = isActive ? 'hidden' : '';

        log.debug('Mobile menu toggled: ' + isActive);
    });

    // Close menu when clicking overlay
    overlay.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        burger.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Navigation oeffnen');
        document.body.style.overflow = '';
        log.debug('Mobile menu closed via overlay');
    });

    // Close menu when clicking a link
    const mobileLinks = mobileMenu.querySelectorAll('.nav-mobile-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            overlay.classList.remove('active');
            burger.classList.remove('active');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Navigation oeffnen');
            document.body.style.overflow = '';
        });
    });

    // Close menu when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            overlay.classList.remove('active');
            burger.classList.remove('active');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Navigation oeffnen');
            document.body.style.overflow = '';
            log.debug('Mobile menu closed via Escape');
        }
    });
}
