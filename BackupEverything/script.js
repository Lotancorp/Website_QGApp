function toggleSection(btn) {
  const section = btn.parentElement;
  // tambahkan semua jenis konten yang perlu di-toggle
  const content = section.querySelector(
    '.links-list, .thumbnail-list, .application-content, .payment-content, .price-container, .article-thumbnails'
  );
  if (!content) return;
  section.classList.toggle('expanded');
  // biar inline style juga konsisten
  content.style.display = section.classList.contains('expanded')
    ? (content.tagName === 'UL' ? 'block' : 'flex') // misal flex untuk list thumbnail
    : 'none';
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

    // Change banner every X seconds
    setInterval(showNextBanner, 10000);
});

// Objek konten modal untuk setiap metode payment
const paymentModalContent = {
    "bank-transfer-indonesia": `
      <h2>Bank Transfer (Indonesia)</h2>
      <p><strong>BCA:</strong> 7151851138 - Muhammad Taufan Firdaus</p>
      <p><strong>CIMB:</strong> 706444755500 - Muhammad Taufan Firdaus</p>
      <img src="Images/barcode-bank.png" alt="Barcode Bank Transfer" style="max-width:100%;">
    `,
    "e-wallet": `
      <h2>E-Wallet Payment</h2>
      <p><strong>Gopay:</strong> 081294648329</p>
      <img src="Images/barcode-gopay.png" alt="Barcode Gopay" style="max-width:100%;">
    `,
    "international": `
      <h2>International Payment</h2>
      <p><strong>PayPal:</strong> lotancorp@gmail.com - @quartzgallery</p>
      <p><strong>Binance USDT:</strong> BEP20/TRC20</p>
      <!-- Jika ada barcode untuk International, tambahkan di sini -->
    `,
    "whatsapp": `
      <h2>Contact via WhatsApp</h2>
      <p>Silahkan hubungi melalui WhatsApp: <a href="https://wa.me/6281294648329" target="_blank">081294648329</a></p>
    `
  };
  
  // Fungsi untuk membuka modal
  function openModal(content) {
    document.getElementById("modal-body").innerHTML = content;
    document.getElementById("paymentModal").style.display = "block";
  }
  
  // Fungsi untuk menutup modal
  function closeModal() {
    document.getElementById("paymentModal").style.display = "none";
  }
  
  // Ketika user klik di luar modal, modal tertutup
  window.addEventListener("click", function(event) {
    const modal = document.getElementById("paymentModal");
    if (event.target === modal) {
      closeModal();
    }
  });
  
  // Event listener untuk tombol "Continue"
  document.getElementById("continueBtn").addEventListener("click", function() {
    // Cari radio button yang sedang dipilih
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    
    if (!selectedPayment) {
      alert("Pilih dulu metode pembayaran, Taufan!");
      return;
    }
    
    const paymentType = selectedPayment.value;
    
    // Ambil konten yang sesuai dari objek paymentModalContent
    if (paymentModalContent[paymentType]) {
      openModal(paymentModalContent[paymentType]);
    } else {
      openModal("<p>Detail pembayaran belum tersedia.</p>");
    }
  });
  
  document.getElementById('continueBtn').addEventListener('click', function () {
  var selectedOption = document.querySelector('input[name="payment"]:checked');
  if (!selectedOption) {
    alert("Please select a payment method.");
    return;
  }

  var paymentMethod = selectedOption.value;
  // Update these URLs with your actual payment gateway or processing pages
  var paymentUrls = {
    "bank-transfer-indonesia": "accountbank.html", // Replace with your Bank Transfer URL
    "e-wallet": "accountbank.html",            // Replace with your E-Wallet URL
    "international": "accountbank.html",    // Replace with your International Payment URL
    "whatsapp": "accountbank.html"                        // WhatsApp Chat Link
  };

  // Redirect the user to the chosen payment URL
  var redirectUrl = paymentUrls[paymentMethod];
  if (redirectUrl) {
    window.location.href = redirectUrl;
  } else {
    alert("Selected payment method is not available.");
  }
});
