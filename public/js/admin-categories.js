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
                    const svgContent = e.target.result;
                    if (!svgContent.trim().startsWith('<svg') && !svgContent.includes('<svg')) {
                         showToast('الملف لا يحتوي على كود SVG صحيح', 'error');
                         return;
                    }
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
                    const svgEl = doc.querySelector('svg');

                    // Safety Check Removed as per user request to allow ANY icon
                    
                    if (svgEl) {
                        svgEl.removeAttribute('width');
                        svgEl.removeAttribute('height');
                        svgEl.style.width = '100%';
                        svgEl.style.height = '100%';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        
                        const serializer = new XMLSerializer();
                        let newSvgContent = serializer.serializeToString(svgEl);
                        
                        // Basic Minify (Safe)
                        newSvgContent = newSvgContent
                            .replace(/<!--[\s\S]*?-->/g, '') 
                            .replace(/\n/g, ' ') 
                            .replace(/\r/g, ' ')
                            .replace(/\t/g, ' ')
                            .replace(/\s\s+/g, ' ') 
                            .replace(/>\s+</g, '><');

                        document.getElementById('categoryIcon').value = newSvgContent;
                        
                        const preview = document.getElementById('categoryIconPreview');
                        preview.innerHTML = newSvgContent;
                        preview.style.display = 'flex';
                    } else {
                         showToast('ملف SVG غير صالح', 'error');
                    }
                }
                reader.readAsText(file);
            }
        });
    }
});

function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    const categories = getCategories();
    
    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">لا يوجد أقسام حالياً</p>';
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
                    <span class="category-icon">${cat.icon}</span>
                </div>
                <h3 class="category-name">${cat.name}</h3>
            </div>
            
            <div class="category-card-actions">
                <button class="cat-btn cat-btn-edit" onclick="editCategory(${cat.id})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> تعديل
                </button>
                <button class="cat-btn cat-btn-delete" onclick="deleteCategory(${cat.id})">
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
                if (cat.icon.includes('<svg') || cat.icon.includes('svg')) {
                    preview.innerHTML = cat.icon;
                    preview.style.display = 'flex';
                } else {
                    preview.innerHTML = `<span style="font-size: 2rem;">${cat.icon}</span>`;
                    preview.style.display = 'flex';
                }
            }
        }
    } else {
        document.getElementById('categoryModalTitle').textContent = 'إضافة قسم جديد';
    }
    
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
        const icon = document.getElementById('categoryIcon').value || '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        
        if (!name) throw new Error('يرجى إدخال اسم القسم');

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
