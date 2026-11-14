// scriptadd.js
        // Filter and Search Addons
        const filterEl    = document.getElementById('filter');
        const searchInput = document.getElementById('search');
        const cards       = Array.from(document.querySelectorAll('#addons-grid > div'));

        function applyFilters() {
            const term   = searchInput.value.trim().toLowerCase();
            const choice = filterEl.value;  // "All" | "Free" | "Paid"

            cards.forEach(card => {
            // cek title
            const title = card.querySelector('h3').textContent.toLowerCase();
            const okSearch = !term || title.includes(term);

            // cek free/paid (span tag)
            const tagsText = Array.from(card.querySelectorAll('span'))
                            .map(el => el.textContent.trim());
            const isFree = tagsText.includes('Free Plugin');
            const isPaid = tagsText.includes('Paid Plugin');
            const okFilter = choice === 'All'
                            || (choice === 'Free' && isFree)
                            || (choice === 'Paid' && isPaid);

            card.style.display = (okSearch && okFilter) ? '' : 'none';
            });
        }

        // trigger on dropdown change, on typing, atau click icon
        filterEl.addEventListener('change', applyFilters);
        searchInput.addEventListener('input', applyFilters);
        document.getElementById('search-btn')
                .addEventListener('click', applyFilters);
