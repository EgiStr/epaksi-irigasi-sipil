# Fix: Robust PAI Checking & Priority Button States

## 🐛 Problem

Tombol prioritas masih bisa diklik meskipun data PAI belum ada, menyebabkan error saat mencoba membuka modal prioritas.

## ✅ Solution

Implementasi pengecekan PAI yang robust dengan:

1. **Visual Feedback** - Tampilkan status PAI di popup
2. **Button States** - Disable tombol jika PAI belum ada  
3. **User Guidance** - Alert informatif untuk user
4. **Error Handling** - Handle semua kasus error dengan graceful

## 🔧 Changes Made

### 1. Enhanced `loadPAIInfo` Function

**Before:**
```javascript
// Hanya check response.ok, tidak handle berbagai format response
if (response.ok) {
  const data = await response.json();
  const hasPAI = data.data && data.data.length > 0;
  // ...
}
```

**After:**
```javascript
// Check response status terlebih dahulu
if (!response.ok) {
  // Show error state
  paiInfoElement.innerHTML = '<div>❌ Gagal memuat data PAI</div>';
  priorityBtn.disabled = true;
  return;
}

const data = await response.json();
console.log('PAI API Response:', data); // Debug log

// Support multiple response formats
const paiList = data.data || data;
const hasPAI = Array.isArray(paiList) && paiList.length > 0;

if (hasPAI) {
  // Enable priority button
  priorityBtn.disabled = false;
  priorityBtn.onclick = null; // Remove override
} else {
  // Disable with visual feedback
  priorityBtn.disabled = true;
  priorityBtn.style.opacity = '0.5';
  priorityBtn.onclick = (e) => {
    e.preventDefault();
    alert('⚠️ Data PAI belum tersedia...');
    return false;
  };
}
```

### 2. Improved `openPriorityModalForPAI`

**Before:**
```javascript
const paiList = await response.json();
if (paiList && paiList.length > 0) {
  // Open modal
} else {
  alert('Belum ada data PAI...');
}
```

**After:**
```javascript
if (!response.ok) {
  throw new Error('Gagal mengambil data PAI');
}

const data = await response.json();
const paiList = data.data || data; // Support both formats

if (!Array.isArray(paiList) || paiList.length === 0) {
  alert('⚠️ Data PAI belum tersedia\n\nSilakan buat...');
  return;
}

// Proceed with modal
```

### 3. Visual States

#### No PAI (Warning State)
```html
<div style="padding: 8px; background: #fef3c7; border-left: 3px solid #f59e0b;">
  <div style="color: #92400e; font-weight: 600;">
    ℹ️ Belum ada data PAI
  </div>
  <div style="color: #78350f; font-size: 11px;">
    Silakan buat data PAI terlebih dahulu dengan klik tombol "📝 PAI"
  </div>
</div>
```

#### Error State
```html
<div style="padding: 8px; background: #fee2e2; border-left: 3px solid #ef4444;">
  <div style="color: #991b1b; font-weight: 600;">
    ❌ Gagal memuat data PAI
  </div>
  <div style="color: #7f1d1d; font-size: 11px;">
    Error message here
  </div>
</div>
```

#### PAI Exists (Success State)
```javascript
// Show PAI info with priority if exists
infoHTML += `<div style="color: #374151;">
  <div><strong>${paiTypeIcon} ${paiTypeName}</strong></div>
  <div>${pai.paiData?.aset?.nama}</div>
  ...
  // Priority info if available
  ${priorityInfo}
</div>`;
```

## 🎯 Button State Logic

| Condition | Button State | Visual | onClick Behavior |
|-----------|--------------|--------|------------------|
| PAI exists | Enabled | opacity: 1 | Open modal normally |
| No PAI | Disabled | opacity: 0.5 | Show alert message |
| Error loading | Disabled | opacity: 0.5 | Show error tooltip |
| Loading | Disabled | opacity: 0.7 | No action |

## 📊 Response Format Support

Function now supports both API response formats:

**Format 1: Wrapped**
```json
{
  "data": [
    { "id": "...", "paiType": "saluran", ... }
  ],
  "total": 1,
  "page": 1
}
```

**Format 2: Direct Array**
```json
[
  { "id": "...", "paiType": "saluran", ... }
]
```

## 🔍 Debug Logging

Added console logs for troubleshooting:

```javascript
console.log('PAI API Response:', data); // Full response
console.log('PAI data for priority:', data); // When opening modal
```

Check browser console untuk melihat struktur response jika ada masalah.

## 🧪 Testing Checklist

- [x] Click feature tanpa PAI → Button disabled dengan alert
- [x] Click feature dengan PAI → Button enabled, modal terbuka
- [x] API error → Button disabled dengan error message
- [x] Create PAI → Reload popup → Button enabled
- [x] Priority sudah di-set → Tampil di PAI info section

## 💡 User Flow

```
1. User klik feature di map
   ↓
2. Popup muncul, call loadPAIInfo()
   ↓
3. Check API response
   ├─ PAI exists → Enable button, show PAI info
   ├─ No PAI → Disable button, show warning
   └─ Error → Disable button, show error
   ↓
4. User click priority button
   ├─ If enabled → Open modal
   └─ If disabled → Show alert (onclick override)
```

## 🚨 Common Issues & Solutions

### Issue: Button masih bisa diklik meski disabled

**Solution:**
```javascript
// Add onclick override untuk disabled state
priorityBtn.onclick = function(e) {
  e.preventDefault();
  e.stopPropagation();
  alert('...');
  return false;
};
```

### Issue: PAI info tidak update setelah create PAI

**Solution:**
User harus close dan re-open popup untuk trigger loadPAIInfo() lagi, atau implement real-time update dengan:

```javascript
// After PAI created
window.dispatchEvent(new CustomEvent('paiUpdated', { 
  detail: { featureId } 
}));

// In LeafletMap
window.addEventListener('paiUpdated', (e) => {
  window.loadPAIInfo(e.detail.featureId);
});
```

### Issue: Multiple response formats dari API

**Solution:**
```javascript
// Normalize response
const paiList = data.data || data;
const hasPAI = Array.isArray(paiList) && paiList.length > 0;
```

## 📝 Code Quality Improvements

1. **Error Handling**: Try-catch di semua async functions
2. **Null Checks**: Check existence sebelum access properties
3. **User Feedback**: Visual states untuk semua conditions
4. **Debug Logs**: Console logs untuk troubleshooting
5. **Type Safety**: Array.isArray() checks

## 🎨 UX Enhancements

1. **Color Coding**:
   - Yellow (#fef3c7): Warning/Info (no PAI)
   - Red (#fee2e2): Error
   - Green/Blue: Success/Normal

2. **Icons**:
   - ℹ️ : Information
   - ⚠️ : Warning
   - ❌ : Error
   - ✅ : Success

3. **Tooltips**:
   - Enabled: "Atur prioritas perbaikan"
   - Disabled: "Buat data PAI terlebih dahulu..."

## 🔄 Future Improvements

- [ ] Real-time PAI status updates
- [ ] Loading spinner saat fetch PAI
- [ ] Retry mechanism untuk failed requests
- [ ] Cache PAI data di client
- [ ] Batch fetch PAI untuk multiple features

## 📚 Related Files

- `components/LeafletMap.jsx` - Main implementation
- `app/api/pai/route.js` - API endpoint
- `components/PriorityScoreModal.jsx` - Priority modal
- `docs/PRIORITY_FEATURE.md` - Main feature docs

### 1. **Smart Button State Management**

Button prioritas sekarang memiliki 3 state:

```javascript
// State 1: Loading (default saat popup dibuka)
disabled=true
opacity=0.5
title="Memuat status PAI..."

// State 2: PAI tersedia (setelah loadPAIInfo sukses)
disabled=false
opacity=1
cursor=pointer
title="Atur prioritas perbaikan"

// State 3: PAI tidak tersedia
disabled=true
opacity=0.5
cursor=not-allowed
title="Buat data PAI terlebih dahulu..."
onclick => Alert dengan instruksi
```

### 2. **Visual Indicators**

**PAI Info Section (Baru)**
- Container hijau muda di popup
- Loading state dengan pulse animation
- Menampilkan info PAI lengkap jika tersedia
- Menampilkan prioritas jika sudah diset

**Priority Display in Popup**
```javascript
// Jika PAI memiliki priorityScore
⚠️ Prioritas: Sangat Mendesak (5)
[Catatan prioritas jika ada]
```

### 3. **Enhanced loadPAIInfo Function**

```javascript
window.loadPAIInfo = async (featureId) => {
  // Fetch PAI data
  const response = await fetch(`/api/pai?featureId=${featureId}`)
  const data = await response.json()
  
  if (hasPAI) {
    // Show PAI info + priority info
    // Enable priority button
    priorityBtn.disabled = false
    priorityBtn.style.opacity = '1'
  } else {
    // Show "Belum ada data PAI"
    // Disable button with helpful alert
    priorityBtn.onclick = (e) => {
      e.preventDefault()
      alert('⚠️ Data PAI belum tersedia\n\n...')
      return false
    }
  }
}
```

### 4. **Fixed API Validation**

**Before:**
```javascript
Query params received: {
  featureId: 'xxx',
  paiType: null,  // ❌ Caused validation error
  page: '1',
  limit: '20',
  latest: null    // ❌ Caused validation error
}
```

**After:**
```javascript
// Updated queryPAISchema with robust preprocessing
z.preprocess(
  (val) => val === null || val === 'null' || val === '' ? undefined : val,
  z.string().optional()
)
```

### 5. **User Feedback Flow**

```
1. User clicks feature → Popup opens
2. PAI info section shows "Memuat data PAI..."
3. loadPAIInfo() called automatically
4. 
   IF PAI exists:
     ✅ Show PAI details
     ✅ Enable priority button
   ELSE:
     ⚠️ Show "Belum ada data PAI"
     ⚠️ Disable priority button
     ⚠️ Add helpful onclick alert
```

## 📁 Files Modified

1. **components/LeafletMap.jsx**
   - Added PAI info section to popup
   - Enhanced `window.loadPAIInfo()` function
   - Added ID to priority buttons (`priority-btn-${featureId}`)
   - Set default disabled state for priority buttons
   - Added priority display in PAI info

2. **lib/validations/pai-schema.js**
   - Fixed `queryPAISchema` validation
   - Added robust preprocessing for all query params
   - Added `includeFeature` param support

## 🎨 UI Changes

### Before
```
[📋 Survey] [📝 PAI] [⚠️ Prioritas]
                       ↑ Always clickable
```

### After
```
┌─────────────────────────────────┐
│ 📋 Info PAI                     │
│ Memuat data PAI... (loading)    │
└─────────────────────────────────┘

[📋 Survey] [📝 PAI] [⚠️ Prioritas]
                       ↑ Disabled until PAI loaded
                       ↑ Visual opacity indicator
                       ↑ Helpful tooltip
```

### With PAI Data
```
┌─────────────────────────────────┐
│ 📋 Info PAI                     │
│ 🚰 Saluran                      │
│ Saluran Primer A                │
│ Saluran • SP-001                │
│ ⚠️ Prioritas: Mendesak (4)      │
│ Perlu perbaikan bocor di KM 2.5 │
│ Updated: 8 Okt 2025             │
└─────────────────────────────────┘

[📋 Survey] [📝 PAI] [⚠️ Prioritas]
                       ↑ Enabled & clickable
```

### Without PAI Data
```
┌─────────────────────────────────┐
│ 📋 Info PAI                     │
│ Belum ada data PAI              │
└─────────────────────────────────┘

[📋 Survey] [📝 PAI] [⚠️ Prioritas]
                       ↑ Disabled (grayed out)
                       ↑ Shows alert on click
```

## 🔧 Technical Details

### Button Element Structure
```html
<button 
  id="priority-btn-${featureId}"
  onclick="window.openPriorityModal('${featureId}')"
  style="opacity: 0.5; cursor: not-allowed;"
  disabled
  title="Memuat status PAI..."
>
  ⚠️ Prioritas
</button>
```

### Alert Message
```
⚠️ Data PAI belum tersedia

Silakan buat data PAI terlebih dahulu 
dengan klik tombol "📝 PAI" sebelum 
mengatur prioritas perbaikan.
```

### Priority Info Color Coding
```javascript
const priorityLabels = {
  5: { label: 'Sangat Mendesak', color: '#ef4444' },
  4: { label: 'Mendesak', color: '#f97316' },
  3: { label: 'Sedang', color: '#f59e0b' },
  2: { label: 'Rendah', color: '#3b82f6' },
  1: { label: 'Sangat Rendah', color: '#6b7280' }
}
```

## 🧪 Testing Checklist

- [x] Button starts disabled on popup open
- [x] LoadPAIInfo called on popup open
- [x] Button enables when PAI exists
- [x] Button stays disabled when no PAI
- [x] Alert shows when clicking disabled button
- [x] Priority info displays correctly
- [x] API validation works with null params
- [x] No console errors on load
- [x] Visual states are clear and intuitive

## 🚀 Benefits

1. **Better UX**: Clear visual feedback on button state
2. **Prevents Errors**: No more 400 errors from clicking without PAI
3. **Helpful Guidance**: Alert tells users exactly what to do
4. **Performance**: Async loading doesn't block popup
5. **Informative**: Shows priority info directly in popup
6. **Robust**: Handles all edge cases (no PAI, loading, errors)

## 📝 Usage Example

```javascript
// Automatic flow - no user action needed
onEachFeature() {
  layer.on('popupopen', () => {
    // Auto-call loadPAIInfo
    window.loadPAIInfo(featureId)
  })
}

// Result: Button automatically enabled/disabled
// based on PAI availability
```

## 🔮 Future Enhancements

- [ ] Show PAI creation date in info section
- [ ] Add quick edit button for PAI from popup
- [ ] Cache PAI status to avoid repeated fetches
- [ ] Add visual indicator for outdated PAI data
- [ ] Support bulk priority setting from map

## 📚 Related Documentation

- See `docs/PRIORITY_FEATURE.md` for full priority system docs
- See `.github/copilot-instructions.md` for development guidelines
