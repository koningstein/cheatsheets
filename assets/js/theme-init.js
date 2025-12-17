(function() {
    // Dit voert DIRECT uit, nog voordat de pagina getoond wordt
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedColor = localStorage.getItem('color') || 'red';

    // Zet de attributen direct op de HTML tag
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-color', savedColor);
})();