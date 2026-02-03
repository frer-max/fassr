// ===================================
// Admin Categories Logic
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // ⚡ Instant Render
    if (getCategories().length > 0) {
        renderCategories();
    }

    initializeData({ categories: true, meals: true }).then(() => {
        // We load meals too effectively for delete safety check (deleteCategoryData in data.js handles it, 
        // but frontend confirmation might want to know count? Admin.js said "Delete this category will delete all meals".
        renderCategories();
    });

    // Listen for background updates
    document.addEventListener('categories-updated', renderCategories);
    
    // Load Static Icons - MOVED TO MODAL OPEN
    // loadStaticIcons();

    // Setup Category SVG Input
    const categoryIconInput = document.getElementById('categoryIconInput');
    if (categoryIconInput) {
        categoryIconInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
                    showToast('يرجى اختيار ملف SVG صحيح', 'error');
                    this.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64Content = e.target.result;
                    
                    // Use Base64 string directly - Safest for "Any Icon"
                    document.getElementById('categoryIcon').value = base64Content;
                    
                    const preview = document.getElementById('categoryIconPreview');
                    preview.innerHTML = `<img src="${base64Content}" style="width:100%; height:100%; object-fit:contain;">`;
                    preview.style.display = 'flex';
                    
                    // Deselect any static icon
                    if (typeof highlightSelectedStaticIcon === 'function') {
                        highlightSelectedStaticIcon(null);
                    }
                }
                reader.readAsDataURL(file); // Read as Safe Base64 String
            }
        });
    }
});

function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    const categories = getCategories();
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; background: var(--bg-surface); border-radius: 16px; border: 2px dashed rgba(0,0,0,0.05); margin-top: 0; width: 100%;">
                <div style="font-size: 4rem; margin-bottom: 24px; opacity: 0.8; filter: grayscale(0.2);">📂</div>
                <h3 style="font-size: 1.35rem; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">لا يوجد أقسام حالياً</h3>
                <p style="color: var(--text-secondary); font-size: 1rem; max-width: 400px; margin: 0 auto 32px; line-height: 1.6;">
                    لم تقم بإضافة أي أقسام لقائمة الطعام بعد.
                    <br>يمكنك البدء بإضافة قسم جديد مثل "مشويات"، "مشروبات" أو "حلويات".
                </p>
                <button onclick="openCategoryModal()" class="btn btn-primary" style="padding: 12px 28px; font-size: 1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    إضافة قسم جديد
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = categories.map(cat => `
        <div class="category-card-new ${!cat.active ? 'inactive' : ''}">
            <div class="category-card-header">
                <div class="status-light ${cat.active ? 'on' : 'off'}"></div>
                <label class="switch">
                    <input type="checkbox" onchange="toggleCategoryActive(${cat.id})" ${cat.active ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            
            <div class="category-card-body">
                <div class="category-icon-wrapper ${!cat.active ? 'dimmed' : ''}">
                    <span class="category-icon" style="overflow:hidden; display:flex; align-items:center; justify-content:center;">
                        ${window.getCategoryIconHtml ? window.getCategoryIconHtml(cat, 'height:100%;') : cat.icon}
                    </span>
                </div>
                <h3 class="category-name">${cat.name}</h3>
            </div>
            
            <div class="category-card-actions">
                <button class="cat-btn cat-btn-edit" onclick="editCategory('${cat.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> تعديل
                </button>
                <button class="cat-btn cat-btn-delete" onclick="deleteCategory('${cat.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> حذف
                </button>
            </div>
        </div>
    `).join('');
}

function openCategoryModal(id = null) {
    const form = document.getElementById('categoryForm');
    form.reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryIcon').value = '';
    
    const preview = document.getElementById('categoryIconPreview');
    preview.innerHTML = '';
    preview.style.display = 'none';
    
    const iconInput = document.getElementById('categoryIconInput');
    if (iconInput) iconInput.value = '';
    
    if (id) {
        const cat = getCategories().find(c => c.id === id);
        if (cat) {
            document.getElementById('categoryId').value = cat.id;
            document.getElementById('categoryName').value = cat.name;
            document.getElementById('categoryIcon').value = cat.icon;
            document.getElementById('categoryModalTitle').textContent = 'تعديل قسم';
                      if (cat.icon) {
                // If it looks like an image path or data URL
                if (cat.icon.startsWith('data:') || cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('/icons/') || cat.icon.match(/\.(svg|png|jpg|jpeg)$/i)) {
                    preview.innerHTML = `<img src="${cat.icon}" style="width:100%; height:100%; object-fit:contain;">`;
                    preview.style.display = 'flex';
                    
                    // Highlight if it's a static icon
                    highlightSelectedStaticIcon(cat.icon);
                } else if (cat.icon.includes('<svg')) {
                    // It's an inline SVG string
                    preview.innerHTML = cat.icon;
                    preview.style.display = 'flex';
                    highlightSelectedStaticIcon(null);
                } else {
                    // It's likely text/emoji
                    preview.innerHTML = `<span style="font-size: 2rem;">${cat.icon}</span>`;
                    preview.style.display = 'flex';
                    highlightSelectedStaticIcon(null);
                }
            } else {
                highlightSelectedStaticIcon(null);
            }
        }
    } else {
        document.getElementById('categoryModalTitle').textContent = 'إضافة قسم جديد';
        highlightSelectedStaticIcon(null);
    }
    
    // Lazy Load Icons
    loadStaticIcons();
    
    document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

// ===================================
// Helper: Action Loader
// ===================================
function createActionLoader() {
    if (document.getElementById('globalActionLoader')) return;
    
    const loader = document.createElement('div');
    loader.id = 'globalActionLoader';
    loader.className = 'action-loader-overlay';
    loader.innerHTML = `
        <div class="action-loader-spinner"></div>
        <div class="action-loader-text">جاري المعالجة...</div>
    `;
    document.body.appendChild(loader);
}

function showActionLoader(text = 'جاري المعالجة...') {
    createActionLoader();
    const loader = document.getElementById('globalActionLoader');
    const textEl = loader.querySelector('.action-loader-text');
    if (textEl) textEl.textContent = text;
    loader.classList.add('active');
}

function hideActionLoader() {
    const loader = document.getElementById('globalActionLoader');
    if (loader) loader.classList.remove('active');
}


async function saveCategory(event) {
    event.preventDefault();
    const submitBtn = document.querySelector('#categoryForm button[type="submit"]');
    
    try {
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value.trim();
        const icon = document.getElementById('categoryIcon').value;
        
        if (!name) throw new Error('يرجى إدخال اسم القسم');
        if (!icon) throw new Error('يرجى اختيار صورة أو أيقونة للقسم');

        showActionLoader(id ? 'جاري تحديث القسم...' : 'جاري إضافة القسم...');
        
        if (id) {
            // Preserve existing consistency (especially 'active' status)
            const existingCat = getCategories().find(c => c.id == id);
            const isActive = existingCat ? existingCat.active : true;
            
            await updateCategoryData({ id: parseInt(id), name, icon, active: isActive });
            showToast('تم تحديث القسم', 'success');
        } else {
            // New Category
            await createCategoryData({ name, icon, order: getCategories().length + 1, active: true });
            showToast('تم إضافة القسم بنجاح', 'success');
        }
        
        closeCategoryModal();
        renderCategories();
    } catch (error) {
        showToast(error.message || 'خطأ غير معروف', 'error');
    } finally {
        hideActionLoader();
    }
}

function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (confirm('حذف هذا القسم سيحذف جميع الوجبات التابعة له! هل أنت متأكد؟')) {
        try {
            showActionLoader('جاري حذف القسم...');
            await deleteCategoryData(id);
            renderCategories();
            showToast('تم حذف القسم', 'warning');
        } catch (e) {
            console.error(e);
            showToast('حدث خطأ أثناء الحذف', 'error');
        } finally {
            hideActionLoader();
        }
    }
}

async function toggleCategoryActive(id) {
    const category = getCategories().find(c => c.id === id);
    if (category) {
        // Toggle is fast, maybe no loader or just small one? 
        // User requested loader for "Delete or Upload". Toggle is usually instant.
        // We skip loader for toggle to keep it snappy.
        const updated = { ...category, active: !category.active };
        await updateCategoryData(updated);
        renderCategories();
        showToast(`${updated.name} ${updated.active ? 'مفعّل الآن' : 'تم إيقافه'}`, updated.active ? 'success' : 'info');
    }
}


// ===================================
// Static Icons Logic
// ===================================
// ===================================
// Static Icons Logic
// ===================================
let iconsLoaded = false;
let allIconsCache = [];

async function loadStaticIcons() {
    if (iconsLoaded) return; // Already loaded
    
    const list = document.getElementById('availableIconsList');
    if (!list) return;

    try {
        const response = await fetch('/api/icons');
        const data = await response.json();
        
        if (data && data.icons && data.icons.length > 0) {
            allIconsCache = data.icons;
            
            // Render first batch only to avoid lag
            renderIconsBatch(list, allIconsCache, 0, 50);
            
            // If more icons, add a "Load More" trigger or just render them in next frame
            if (allIconsCache.length > 50) {
                // Use setTimeout to render the rest without blocking UI
                setTimeout(() => {
                    renderIconsBatch(list, allIconsCache, 50, allIconsCache.length);
                }, 100);
            }

            // Add Styles for selection
            if (!document.getElementById('staticIconStyles')) {
                const style = document.createElement('style');
                style.id = 'staticIconStyles';
                style.textContent = `
                    .static-icon-item {
                        width: 48px;
                        height: 48px;
                        padding: 8px;
                        border: 2px solid transparent;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        background: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .static-icon-item:hover {
                        background: #f0f0f0;
                        border-color: #ddd;
                    }
                    .static-icon-item.selected {
                        border-color: #f59e0b; /* Primary Orange/Amber */
                        background: #fffbeb;
                        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
                    }
                    .static-icon-item img {
                        will-change: transform;
                    }
                `;
                document.head.appendChild(style);
            }
            
            iconsLoaded = true;
        } else {
            list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:10px; font-size:0.8rem;">لا توجد أيقونات ثابتة</div>';
        }
    } catch (e) {
        console.error('Failed to load icons', e);
        list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:10px; font-size:0.8rem; color:red;">فشل تحميل الأيقونات</div>';
    }
}

function renderIconsBatch(container, icons, start, end) {
    const batch = icons.slice(start, end);
    const html = batch.map(icon => `
        <div class="static-icon-item" onclick="selectStaticIcon('${icon.path}', this)" title="${icon.name}">
            <img src="${icon.path}" loading="lazy" style="width:100%; height:100%; object-fit:contain; pointer-events:none;">
        </div>
    `).join('');
    
    if (start === 0) {
        container.innerHTML = html;
    } else {
        container.insertAdjacentHTML('beforeend', html);
    }
}

function selectStaticIcon(path, element) {
    // Update Hidden Input
    document.getElementById('categoryIcon').value = path;
    
    // Update Preview
    const preview = document.getElementById('categoryIconPreview');
    preview.innerHTML = `<img src="${path}" style="width:100%; height:100%; object-fit:contain;">`;
    preview.style.display = 'flex';
    
    // Clear file input if any
    const fileInput = document.getElementById('categoryIconInput');
    if (fileInput) fileInput.value = '';

    // Highlight selection
    highlightSelectedStaticIcon(path);
}

function highlightSelectedStaticIcon(path) {
    const items = document.querySelectorAll('.static-icon-item');
    items.forEach(item => {
        item.classList.remove('selected');
        // Check if img src matches path (or somewhat matches)
        const img = item.querySelector('img');
        if (path && img && img.getAttribute('src') === path) {
            item.classList.add('selected');
        }
    });
}
