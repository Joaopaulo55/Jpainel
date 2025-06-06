// Splash Screen Animation Controller
document.addEventListener('DOMContentLoaded', () => {
    // Create splash screen elements
    const splash = document.createElement('div');
    splash.className = 'splash-container';
    
    const spinnerTrack = document.createElement('div');
    spinnerTrack.className = 'spinner-track';
    
    const spinnerThumb = document.createElement('div');
    spinnerThumb.className = 'spinner-thumb';
    
    const jLogo = document.createElement('div');
    jLogo.className = 'j-logo pulse';
    jLogo.textContent = 'J';
    
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Inicializando JPainel...';
    
    // Build splash structure
    splash.appendChild(spinnerTrack);
    splash.appendChild(spinnerThumb);
    splash.appendChild(jLogo);
    splash.appendChild(loadingText);
    
    // Add to body
    document.body.prepend(splash);
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('jpainel-theme');
    if (savedTheme === 'light') {
        splash.classList.add('light-mode');
    }
    
    // Hide splash after 3 seconds or when everything is loaded
    const hideSplash = () => {
        splash.classList.add('splash-hidden');
        setTimeout(() => {
            splash.remove();
        }, 500); // Match the transition duration
    };
    
    // Hide after 3 seconds minimum, or when all assets are loaded
    const minimumLoadTime = 3000; // 3 seconds
    const startTime = Date.now();
    
    const hideWhenReady = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minimumLoadTime - elapsed);
        
        setTimeout(() => {
            if (document.readyState === 'complete') {
                hideSplash();
            } else {
                window.addEventListener('load', hideSplash);
            }
        }, remaining);
    };
    
    hideWhenReady();
});

