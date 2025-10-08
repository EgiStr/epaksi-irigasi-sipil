# Print CSS Styles untuk Detail Infrastruktur

Tambahkan CSS berikut ke dalam fungsi `exportToPDF()` di bagian `<style>`:

```css
/* Print-specific comprehensive styles */
@media print {
  body {
    padding: 0;
    font-size: 9pt;
  }
  
  @page {
    margin: 15mm;
    size: A4 portrait;
  }
  
  /* Prevent page breaks */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    page-break-inside: avoid;
    margin-top: 8pt;
    margin-bottom: 4pt;
  }
  
  /* Allow page breaks for large sections */
  .survey-section, .pai-section {
    page-break-inside: auto;
  }
  
  /* Keep related content together */
  .info-grid > div,
  .parameter-item {
    page-break-inside: avoid;
    margin-bottom: 4pt;
  }
  
  table {
    page-break-inside: auto;
  }
  
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  
  /* Hide unnecessary elements */
  button, .no-print, input, select, textarea {
    display: none !important;
  }
  
  /* Ensure colors print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  /* Adjust spacing for print */
  .mb-4, .mb-6 {
    margin-bottom: 8pt !important;
  }
  
  .p-4, .p-6 {
    padding: 8pt !important;
  }
  
  /* Grid adjustments */
  .grid {
    display: block !important;
  }
  
  .grid > div {
    width: 100% !important;
    margin-bottom: 6pt;
  }
  
  /* Images */
  img {
    max-width: 100%;
    height: auto;
    page-break-inside: avoid;
  }
  
  /* Borders and shadows */
  .border {
    border: 1px solid #d1d5db !important;
  }
  
  .shadow, .shadow-sm, .shadow-md, .shadow-lg {
    box-shadow: none !important;
  }
}

/* Typography */
h1 { 
  font-size: 18pt; 
  font-weight: bold; 
  margin-bottom: 10pt;
  color: #111827;
}

h2 { 
  font-size: 14pt; 
  font-weight: 600; 
  margin-top: 12pt;
  margin-bottom: 8pt;
  color: #1f2937;
  border-bottom: 1pt solid #e5e7eb;
  padding-bottom: 4pt;
}

h3 { 
  font-size: 12pt; 
  font-weight: 600; 
  margin-top: 10pt;
  margin-bottom: 6pt;
  color: #374151;
}

h4 { 
  font-size: 11pt; 
  font-weight: 600; 
  margin-top: 8pt;
  margin-bottom: 4pt;
  color: #4b5563;
}

/* Parameter items */
.parameter-item {
  padding: 6pt;
  margin-bottom: 4pt;
  border: 1px solid #e5e7eb;
  border-radius: 3pt;
  background: white;
}

.parameter-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 2pt;
  font-size: 9pt;
}

.parameter-value {
  color: #1f2937;
  font-size: 9pt;
}
```

## Perubahan Yang Dilakukan:

1. **Page margins**: Dikurangi dari 1.5cm ke 15mm untuk lebih banyak ruang
2. **Font size**: Dikurangi dari 10pt ke 9pt untuk print
3. **Page breaks**: Diatur agar parameter items tidak terpotong
4. **Grid layout**: Diubah ke block display saat print untuk mencegah kolom ganda yang terpotong
5. **Spacing**: Dikurangi untuk muat lebih banyak konten per halaman
6. **Images**: Diatur max-width 100% dan prevent page breaks
7. **Typography**: Responsive untuk print (h1: 18pt, h2: 14pt, h3: 12pt)

## Cara Menggunakan:

1. Replace isi `<style>` tag di fungsi `exportToPDF()`
2. Test dengan klik tombol "Cetak / Simpan PDF"
3. Pada dialog print, pilih "Save as PDF"
4. Verify semua 24 parameter survey tertampil
