// Navbar Component Loader
// Loads the shared navbar component and initializes search

export async function loadNavbar() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');

    if (!navbarPlaceholder) {
        console.warn('Navbar placeholder not found');
        return;
    }

    try {
        const response = await fetch('components/navbar.html');
        if (!response.ok) throw new Error('Failed to load navbar');

        const html = await response.text();
        navbarPlaceholder.innerHTML = html;

        console.log('✅ Navbar component loaded');
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
