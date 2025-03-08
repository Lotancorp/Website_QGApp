// google.js

// Data kredensial yang diberikan
const CLIENT_ID = '284760466526-ba5afbo1afi136f5pun6eov1jceunpp6.apps.googleusercontent.com';
// Scope untuk akses read-only ke Google Photos
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

// Mendapatkan elemen DOM untuk tombol dan konten
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const contentDiv = document.getElementById('content');

let tokenClient;      // Untuk inisialisasi token client
let accessToken = null; // Menyimpan token akses yang diperoleh

// Inisialisasi token client menggunakan Google Identity Services
function initializeTokenClient() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      // Callback dipanggil setelah user memberikan izin
      if (tokenResponse.error) {
        console.error(tokenResponse);
        return;
      }
      accessToken = tokenResponse.access_token;
      console.log("Access Token:", accessToken);
      // Setelah mendapatkan token, panggil fungsi untuk mengambil album
      listAlbums();
      // Update tampilan: sembunyikan tombol authorize dan tampilkan sign out
      authorizeButton.style.display = 'none';
      signoutButton.style.display = 'block';
    },
  });
}

// Fungsi untuk meminta akses token
function handleAuthClick(event) {
  // Jika token sudah ada, tokenClient.requestAccessToken() akan memicu prompt jika perlu
  tokenClient.requestAccessToken();
}

// Fungsi untuk "sign out" dengan cara mencabut token
function handleSignoutClick(event) {
  if (!accessToken) return;
  google.accounts.oauth2.revoke(accessToken, () => {
    console.log("Token revoked");
    accessToken = null;
    contentDiv.innerHTML = "";
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
  });
}

// Fungsi untuk mengambil dan menampilkan daftar album dari Google Photos
function listAlbums() {
  if (!accessToken) {
    console.error("Access token belum tersedia.");
    return;
  }
  fetch("https://photoslibrary.googleapis.com/v1/albums?pageSize=10", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.albums && data.albums.length > 0) {
        let output = '<h2>Daftar Album:</h2><ul>';
        data.albums.forEach((album) => {
          output += `<li>${album.title} (ID: ${album.id})</li>`;
        });
        output += '</ul>';
        contentDiv.innerHTML = output;
      } else {
        contentDiv.innerHTML = '<p>Tidak ada album yang ditemukan.</p>';
      }
    })
    .catch((error) => {
      console.error("Error fetching albums:", error);
      contentDiv.innerHTML = '<p>Error fetching albums.</p>';
    });
}

// Set up event listeners dan inisialisasi token client saat window selesai dimuat
window.onload = () => {
  initializeTokenClient();
  authorizeButton.addEventListener("click", handleAuthClick);
  signoutButton.addEventListener("click", handleSignoutClick);
};
