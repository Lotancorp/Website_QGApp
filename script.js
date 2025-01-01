function toggleSection(button) {
    const section = button.parentElement; // Mengakses section terkait
    section.classList.toggle('expanded'); // Menambahkan/menghapus kelas 'expanded'
}
