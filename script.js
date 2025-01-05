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
document.addEventListener('DOMContentLoaded', () => {
    const bannerImages = document.querySelectorAll('.sliding-banner img');
    let currentIndex = 0;

    function showNextBanner() {
        const currentImage = bannerImages[currentIndex];
        currentIndex = (currentIndex + 1) % bannerImages.length;
        const nextImage = bannerImages[currentIndex];

        // Update classes for sliding effect
        currentImage.classList.remove('active');
        currentImage.classList.add('previous');
        nextImage.classList.add('active');

        // Reset previous image
        setTimeout(() => {
            currentImage.classList.remove('previous');
        }, 1000); // Match the CSS transition time
    }

    // Set initial active image
    bannerImages[currentIndex].classList.add('active');

    // Change banner every 3 seconds
    setInterval(showNextBanner, 3000);
});

