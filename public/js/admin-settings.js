// ===================================
// Admin Settings Logic (Modern)
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instant Load (Optimistic from Cache)
    loadSettings();
    
    // 2. Background Refresh
    initializeData({ settings: true }).then(() => {
        loadSettings();
    });
});

let originalSettings = null; // To track changes if needed

function loadSettings() {
    const settings = getSettings();
    originalSettings = JSON.stringify(settings); // Deep copy for comparison if needed

    // Basic Info
    setValue('settingName', settings.restaurantName);
    setValue('settingPhone', settings.phone);
    setValue('settingAddress', settings.address);
    setChecked('settingIsOpen', settings.isOpen);
    
    // Notifications
    setValue('settingTelegramToken', settings.telegramBotToken);
    setValue('settingTelegramChatId', settings.telegramChatId);
    
    // Delivery
    if (settings.delivery) {
        const type = settings.delivery.type || 'fixed';
        const radio = document.querySelector(`input[name="deliveryType"][value="${type}"]`);
        if (radio) radio.checked = true;
        
        setValue('settingFixedCost', settings.delivery.fixedCost);
        setValue('settingCostPerKm', settings.delivery.costPerKm);
        setValue('settingMaxDistance', settings.delivery.maxDistance);
    }
    
    toggleDeliveryMode();
    setupChangeDetection();
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
}

function setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
}

function toggleDeliveryMode() {
    const selected = document.querySelector('input[name="deliveryType"]:checked');
    const type = selected ? selected.value : 'fixed';
    
    const fixedGroup = document.getElementById('fixedCostGroup');
    const distanceGroup = document.getElementById('distanceCostGroup');
    
    if (fixedGroup) fixedGroup.style.display = (type === 'fixed') ? 'block' : 'none';
    
    // Feature 'Distance Calculation' replaced by 'Unspecified', so we hide settings.
    if (distanceGroup) distanceGroup.style.display = 'none'; 
}

// detectRestaurantLocation Removed
// updateCoordsDisplay Removed

async function handleSaveSettings() {
    const btn = document.querySelector('.btn-floating-save');
    const originalText = btn ? btn.innerHTML : 'حفظ التغييرات';
    
    if (btn) {
        // Use a clean spinner SVG with the new CSS class
        btn.innerHTML = `<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> <span>جاري الحفظ...</span>`;
        btn.disabled = true;
        btn.style.opacity = '0.9'; // Visual feedback
    }
    
    try {
        // Deep clone to avoid mutating reference before save (though we replace it anyway)
        let settings = JSON.parse(JSON.stringify(getSettings() || {}));
        
        // Basic Info - Safe Extract
        const safeVal = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';
        
        settings.restaurantName = safeVal('settingName');
        settings.phone = safeVal('settingPhone');
        settings.address = safeVal('settingAddress');
        
        const openEl = document.getElementById('settingIsOpen');
        settings.isOpen = openEl ? openEl.checked : true;
        
        // Delivery
        if (!settings.delivery) settings.delivery = {};
        settings.delivery.enabled = true;
        
        const selectedType = document.querySelector('input[name="deliveryType"]:checked');
        settings.delivery.type = selectedType ? selectedType.value : 'fixed';
        
        // Ensure numbers are valid
        const parseNum = (id) => {
            const el = document.getElementById(id);
            if (!el) return 0;
            const val = parseFloat(el.value);
            return isNaN(val) ? 0 : val;
        };
        
        settings.delivery.fixedCost = parseNum('settingFixedCost');
        settings.delivery.costPerKm = parseNum('settingCostPerKm');
        settings.delivery.maxDistance = parseNum('settingMaxDistance');
        
        // Notifications
        settings.telegramBotToken = safeVal('settingTelegramToken');
        settings.telegramChatId = safeVal('settingTelegramChatId');
        
        // Save
        if (typeof updateSettingsData === 'function') {
            await updateSettingsData(settings);
        } else {
            localStorage.setItem('settings', JSON.stringify(settings));
        }
        
        showToast('تم حفظ الإعدادات بنجاح', 'success');
        hideSaveBar();
        
    } catch (e) {
        console.error("Save Error:", e);
        showToast(e.message || 'فشل حفظ الإعدادات', 'error');
    } finally {
        if (btn) {
            // Restore original text with a slight delay for smoothness
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.opacity = '';
            }, 300);
        }
    }
}

function setupChangeDetection() {
    // Debounce or just explicit 'change' for heavier inputs, 'input' for text
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        // 'input' fires on every keystroke. For a simple class toggle, it's fine.
        // It ensures the bar appears immediately when user types.
        input.addEventListener('input', showSaveBar);
        input.addEventListener('change', showSaveBar);
    });
}

function showSaveBar() {
    const bar = document.getElementById('saveBar');
    if (bar && !bar.classList.contains('visible')) {
        bar.classList.add('visible');
    }
}

function hideSaveBar() {
    const bar = document.getElementById('saveBar');
    if (bar) bar.classList.remove('visible');
}

function changePassword() {
     const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    const settings = getSettings();
    const storedPassword = settings.adminPassword || 'admin123'; 
    
    if (currentPassword !== storedPassword) {
        showToast('كلمة السر الحالية غير صحيحة', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('كلمة السر الجديدة غير متطابقة', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('كلمة السر يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    settings.adminPassword = newPassword;
    
    if (typeof updateSettingsData === 'function') {
        updateSettingsData(settings); 
    } else {
        localStorage.setItem('settings', JSON.stringify(settings));
    }
    
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    showToast('تم تغيير كلمة السر بنجاح', 'success');
}
