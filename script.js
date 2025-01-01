function toggleSection(button) {
    const section = button.parentElement; // Mengakses parent section
    const content = section.querySelector('ul, .payment-content'); // Mencari elemen konten terkait

    // Toggle visibilitas konten
    if (content) {
        if (section.classList.contains('expanded')) {
            section.classList.remove('expanded');
            content.style.display = 'none';
        } else {
            section.classList.add('expanded');
            content.style.display = 'block';
        }
    }
}
