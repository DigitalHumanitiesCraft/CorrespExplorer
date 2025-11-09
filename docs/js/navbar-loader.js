// Navbar Component Loader
// Loads the shared navbar component and initializes search

export async function loadNavbar(variant = 'full') {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');

    if (!navbarPlaceholder) {
        console.warn('Navbar placeholder not found');
        return;
    }

    // Determine navbar file path based on current location
    const isInSubfolder = window.location.pathname.includes('/synthesis/');
    const navbarFile = isInSubfolder ? '../components/navbar.html' : 'components/navbar.html';

    try {
        const response = await fetch(navbarFile);
        if (!response.ok) throw new Error('Failed to load navbar');

        const html = await response.text();
        navbarPlaceholder.innerHTML = html;

        // Initialize dropdown, burger menu, active state, and basket after navbar is loaded
        setTimeout(() => {
            initDropdown();
            initBurgerMenu();
            setActiveView();
            updateViewLabels();
            initBasket();

            // Update labels on resize
            window.addEventListener('resize', updateViewLabels);
        }, 0);

        console.log(`✅ Navbar component loaded`);
    } catch (error) {
        console.error('❌ Failed to load navbar:', error);
        navbarPlaceholder.innerHTML = `
            <nav class="navbar" role="navigation">
                <div class="nav-brand">
                    <a href="index.html" style="color: inherit; text-decoration: none;">HerData</a>
                </div>
            </nav>
        `;
    }
}

// Set active view button based on current page
function setActiveView() {
    const currentPath = window.location.pathname;
    const viewButtons = document.querySelectorAll('.view-btn');
    const isInSubfolder = currentPath.includes('/synthesis/');

    // Fix all navigation links for subfolder pages
    if (isInSubfolder) {
        // Fix view-switcher links
        viewButtons.forEach(btn => {
            const view = btn.getAttribute('data-view');
            const href = btn.getAttribute('href');
            if (view === 'map' && href === 'index.html') {
                btn.setAttribute('href', '../index.html');
            } else if (view === 'stats' && href === 'stats.html') {
                btn.setAttribute('href', '../stats.html');
            }
        });

        // Fix mobile menu links
        const mobileLinks = document.querySelectorAll('.nav-mobile-link');
        mobileLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('../') && !href.startsWith('http')) {
                link.setAttribute('href', '../' + href);
            }
        });

        // Fix desktop nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('../') && !href.startsWith('http')) {
                link.setAttribute('href', '../' + href);
            }
        });
    }

    // Set active state for view buttons
    viewButtons.forEach(btn => {
        const view = btn.getAttribute('data-view');
        let isActive = false;

        // Set active state
        if (view === 'map' && (currentPath.endsWith('index.html') || currentPath.endsWith('/'))) {
            isActive = true;
        } else if (view === 'synthesis' && currentPath.includes('/synthesis/')) {
            isActive = true;
        } else if (view === 'stats' && currentPath.includes('stats.html')) {
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

    console.log('✅ Active view set based on URL');
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
            else if (view === 'synthesis') textSpan.textContent = 'Personen';
            else if (view === 'stats') textSpan.textContent = 'Brief-Explorer';
        }
    });
}

// Initialize dropdown functionality
function initDropdown() {
    const dropdown = document.querySelector('.nav-dropdown');
    const toggle = document.querySelector('.nav-dropdown-toggle');

    if (!dropdown || !toggle) {
        // Dropdown is optional, silently skip if not present
        return;
    }

    console.log('✅ Initializing dropdown');

    // Toggle dropdown on click
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isActive = dropdown.classList.toggle('active');
        toggle.setAttribute('aria-expanded', isActive);
        console.log('Dropdown toggled:', isActive);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Close dropdown when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

// Initialize basket badge
function initBasket() {
    if (typeof BasketManager === 'undefined') {
        console.warn('⚠️ BasketManager not available, skipping basket init');
        return;
    }

    console.log('🧺 Initializing basket badge in navbar');

    // Update badge immediately
    updateBasketBadge();

    // Listen to basket changes
    BasketManager.on('change', updateBasketBadge);
    BasketManager.on('add', updateBasketBadge);
    BasketManager.on('remove', updateBasketBadge);
    BasketManager.on('clear', updateBasketBadge);
    BasketManager.on('sync', updateBasketBadge);
}

// Update basket badge display
function updateBasketBadge() {
    const badge = document.getElementById('nav-basket-badge');
    const mobileBadge = document.getElementById('nav-mobile-basket-badge');

    if (!badge) {
        console.warn('⚠️ Basket badge element not found');
        return;
    }

    const count = BasketManager.getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';

    if (mobileBadge) {
        mobileBadge.textContent = count;
        mobileBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Initialize burger menu functionality
function initBurgerMenu() {
    const burger = document.getElementById('nav-burger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    const overlay = document.getElementById('nav-overlay');

    if (!burger || !mobileMenu || !overlay) {
        console.warn('Burger menu elements not found');
        return;
    }

    console.log('✅ Initializing burger menu');

    // Toggle menu on burger click
    burger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isActive = mobileMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        burger.classList.toggle('active');
        burger.setAttribute('aria-expanded', isActive);
        burger.setAttribute('aria-label', isActive ? 'Navigation schließen' : 'Navigation öffnen');

        // Prevent body scroll when menu is open
        document.body.style.overflow = isActive ? 'hidden' : '';

        console.log('Mobile menu toggled:', isActive);
    });

    // Close menu when clicking overlay
    overlay.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        burger.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Navigation öffnen');
        document.body.style.overflow = '';
        console.log('Mobile menu closed via overlay');
    });

    // Close menu when clicking a link
    const mobileLinks = mobileMenu.querySelectorAll('.nav-mobile-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            overlay.classList.remove('active');
            burger.classList.remove('active');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Navigation öffnen');
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
            burger.setAttribute('aria-label', 'Navigation öffnen');
            document.body.style.overflow = '';
            console.log('Mobile menu closed via Escape');
        }
    });
}
