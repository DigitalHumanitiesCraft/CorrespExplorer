// Navbar Component Loader
// Loads the shared navbar component and initializes search

export async function loadNavbar(variant = 'full') {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');

    if (!navbarPlaceholder) {
        console.warn('Navbar placeholder not found');
        return;
    }

    const navbarFile = variant === 'simple'
        ? 'components/navbar-simple.html'
        : 'components/navbar.html';

    try {
        const response = await fetch(navbarFile);
        if (!response.ok) throw new Error('Failed to load navbar');

        const html = await response.text();
        navbarPlaceholder.innerHTML = html;

        // Initialize dropdown after navbar is loaded (wait for DOM to update)
        setTimeout(() => {
            initDropdown();
        }, 0);

        console.log(`✅ Navbar component loaded (${variant})`);
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

// Initialize dropdown functionality
function initDropdown() {
    const dropdown = document.querySelector('.nav-dropdown');
    const toggle = document.querySelector('.nav-dropdown-toggle');

    if (!dropdown || !toggle) {
        console.warn('Dropdown elements not found');
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
