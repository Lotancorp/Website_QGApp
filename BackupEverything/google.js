const albums = [
    {
      title: "Armor Skin",
      url: "https://www.flickr.com/photos/197513634@N03/albums/72177720305528974",
      thumb: "https://live.staticflickr.com/65535/52648968342_3a8288da48_b.jpg"
    },
    {
      title: "Weapon Skin",
      url: "https://www.flickr.com/photos/197513634@N03/albums/72177720305522927",
      thumb: "https://live.staticflickr.com/65535/52650109768_380bbae75e_z.jpg"
    },
    {
      title: "Booster Skin",
      url: "https://www.flickr.com/photos/197513634@N03/albums/72177720305515926",
      thumb: "https://live.staticflickr.com/65535/52650018723_b3af4a2900_b.jpg"
    },
    {
      title: "Shield Skin",
      url: "https://www.flickr.com/photos/197513634@N03/albums/72177720305516620",
      thumb: "https://live.staticflickr.com/65535/52649183982_1cc9ea2de0_b.jpg"
    },
    {
      title: "Others Skin",
      url: "https://www.flickr.com/photos/197513634@N03/albums/72177720305516840",
      thumb: "https://live.staticflickr.com/65535/52650173508_496d721522_b.jpg"
    },
    {
      title: "Monster Skin",
      url: "https://www.flickr.com/photos/197513634@N03/albums/72177720305535603",
      thumb: "https://live.staticflickr.com/65535/52649957444_0abebaa688_b.jpg"
    }
  ];
  
  // Fungsi untuk memperbarui embed berdasarkan pilihan
  function updateEmbed() {
    const selector = document.getElementById('albumSelector');
    const container = document.getElementById('albumEmbedContainer');
    const index = parseInt(selector.value);
    const album = albums[index];
    
    // Masukkan kode embed (anchor dengan atribut data-flickr-embed)
    container.innerHTML = `
      <a data-flickr-embed="true" href="${album.url}" title="${album.title}">
        <img src="${album.thumb}" width="1024" height="768" alt="${album.title}" />
      </a>
    `;
    
    // Hapus script embed lama jika ada
    let oldScript = document.getElementById('flickrEmbedScript');
    if (oldScript) {
      oldScript.parentNode.removeChild(oldScript);
    }
    
    // Buat dan tambahkan ulang script embed Flickr untuk memproses elemen baru
    const script = document.createElement('script');
    script.id = 'flickrEmbedScript';
    script.async = true;
    script.src = "//embedr.flickr.com/assets/client-code.js";
    script.charset = "utf-8";
    container.appendChild(script);
  }
  
  // Update embed saat dropdown berubah
  document.getElementById('albumSelector').addEventListener('change', updateEmbed);
  
  // Tampilkan album pertama saat halaman dimuat
  window.addEventListener('load', updateEmbed);