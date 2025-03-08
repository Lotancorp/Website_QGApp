// google.js

// Data kredensial yang diberikan
const CLIENT_ID = '284760466526-ba5afbo1afi136f5pun6eov1jceunpp6.apps.googleusercontent.com';
// Client secret tidak digunakan di sisi klien!

const API_KEY = ''; // Opsional, jika diperlukan

// URL discovery document untuk Google Photos API
const DISCOVERY_DOCS = ["https://photoslibrary.googleapis.com/$discovery/rest?version=v1"];
// Scope yang diperlukan untuk akses read-only ke Google Photos
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

// Mendapatkan elemen DOM untuk tombol authorize, sign out, dan konten
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const contentDiv = document.getElementById('content');

// Fungsi untuk memuat library client dan auth2
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

// Inisialisasi client dengan data kredensial dan konfigurasi yang diperlukan
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Mendengarkan perubahan status sign-in
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Cek status sign-in awal
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    
    // Pasangkan event listener ke tombol
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;
  }, function(error) {
    console.error(JSON.stringify(error, null, 2));
  });
}

// Update UI berdasarkan status sign-in
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';
    // Setelah berhasil sign in, panggil fungsi untuk mengambil daftar album
    listAlbums();
  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
    contentDiv.innerHTML = '';
  }
}

// Fungsi untuk melakukan sign in
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

// Fungsi untuk melakukan sign out
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

// Fungsi untuk mengambil dan menampilkan daftar album dari Google Photos
function listAlbums() {
  gapi.client.photoslibrary.albums.list({
    pageSize: 10
  }).then(function(response) {
    const albums = response.result.albums;
    if (albums && albums.length > 0) {
      let output = '<h2>Daftar Album:</h2><ul>';
      albums.forEach(album => {
        output += `<li>${album.title} (ID: ${album.id})</li>`;
      });
      output += '</ul>';
      contentDiv.innerHTML = output;
    } else {
      contentDiv.innerHTML = '<p>Tidak ada album yang ditemukan.</p>';
    }
  }, function(error) {
    console.error('Error fetching albums:', error);
    contentDiv.innerHTML = '<p>Error fetching albums.</p>';
  });
}

// Pastikan untuk memanggil fungsi handleClientLoad saat window selesai dimuat
window.onload = handleClientLoad;
