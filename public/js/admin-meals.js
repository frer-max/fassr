// ===================================
// Admin Meals Logic
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Need Meals and Categories
    initializeData({ meals: true, categories: true }).then(() => {
        initMealsPage();
    });

    // Image Input Handler (Direct Resize)
    const imageInput = document.getElementById('mealImageInput');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        
                        const MAX_SIZE = 1000;
                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const dataUrl = canvas.toDataURL('image/webp', 0.85); // Compress
                        
                        // Preview
                        const preview = document.getElementById('mealImagePreview');
                        preview.querySelector('img').src = dataUrl;
                        preview.style.display = 'flex';
                        
                        // Hidden Input
                        let hiddenInput = document.getElementById('croppedImageData');
                        if (!hiddenInput) {
                            hiddenInput = document.createElement('input');
                            hiddenInput.type = 'hidden';
                            hiddenInput.id = 'croppedImageData';
                            document.getElementById('mealForm').appendChild(hiddenInput);
                        }
                        hiddenInput.value = dataUrl;
                        
                        // Hide Label
                        const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                        if(uploadLabel) uploadLabel.style.display = 'none';

                        // Delete Btn
                        if (!preview.querySelector('.btn-delete-image')) {
                            const deleteBtn = document.createElement('button');
                            deleteBtn.className = 'btn-delete-image';
                            deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> حذف الصورة';
                            deleteBtn.type = 'button';
                            deleteBtn.onclick = function(e) {
                                e.stopPropagation(); 
                                if(confirm('هل أنت متأكد من حذف الصورة؟')) {
                                    preview.querySelector('img').src = '';
                                    preview.style.display = 'none';
                                    const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                                    if(uploadLabel) uploadLabel.style.display = 'flex'; 
                                    document.getElementById('mealImageInput').value = '';
                                    const hidden = document.getElementById('croppedImageData');
                                    if(hidden) hidden.value = '';
                                }
                            };
                            preview.appendChild(deleteBtn);
                            preview.style.position = 'relative'; 
                        }
                    }
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function initMealsPage() {
    const categories = getCategories();
    const select = document.getElementById('mealsCategorySelect');
    
    if (select) {
        select.innerHTML = '<option value="all">كل الأقسام</option>' + 
            categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }
        
    renderMeals();
}

function renderMeals(categoryId = 'all') {
    const container = document.getElementById('mealsGrid');
    if (!container) return;
    
    let allMeals = getMeals();
    const categories = getCategories();
    
    let meals = allMeals;
    // Check filter from select if argument matches
    const select = document.getElementById('mealsCategorySelect');
    if (select && select.value !== 'all') categoryId = select.value;

    if (categoryId && categoryId !== 'all') {
        meals = allMeals.filter(m => m.categoryId == categoryId);
    }
    
    updateMealsStats(meals);
    
    container.innerHTML = meals.map(meal => {
        const cat = categories.find(c => c.id === meal.categoryId);
        
        let priceDisplay = '';
        if (meal.hasSizes && meal.sizes && meal.sizes.length > 0) {
            const sizesChips = meal.sizes.map(s => 
                `<span class="size-chip"><span class="size-chip-name">${s.name}</span><span class="size-chip-price">${formatPrice(s.price)}</span></span>`
            ).join('');
            priceDisplay = `<div class="meal-sizes-display">${sizesChips}</div>`;
        } else {
            priceDisplay = `<div class="meal-price">${formatPrice(meal.price)}</div>`;
        }
        
        return `
            <div class="meal-card-admin ${!meal.active ? 'meal-inactive' : ''}" onclick="openMealModal(${meal.id})">
                <div class="meal-card-image">
                    ${meal.image ? `<img src="${meal.image}" alt="${meal.name}">` : '<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#cbd5e1;"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>'}
                </div>
                <div class="meal-card-content">
                    <div class="meal-header">
                        <span class="meal-category-tag">${cat ? cat.name : 'Unknown'}</span>
                        <label class="switch" onclick="event.stopPropagation()">
                            <input type="checkbox" id="meal-toggle-${meal.id}" onchange="toggleMealActive(${meal.id})" ${meal.active ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <h3 class="meal-title">${meal.name}</h3>
                    <p class="meal-desc">${meal.description || ''}</p>
                    <div class="meal-footer">
                        ${priceDisplay}
                        <div class="meal-actions">
                            <button class="action-btn edit" onclick="event.stopPropagation(); openMealModal(${meal.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="action-btn danger" onclick="event.stopPropagation(); deleteMealFunc(${meal.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateMealsStats(meals) {
    const statsEl = document.getElementById('mealsStats');
    if (!statsEl) return;
    
    const total = meals.length;
    const active = meals.filter(m => m.active).length;
    const inactive = total - active;
    
    statsEl.innerHTML = `
        <span class="stat-pill stat-total"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> ${total} وجبة</span>
        <span class="stat-pill stat-active"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> ${active} متوفر</span>
        <span class="stat-pill stat-inactive"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> ${inactive} غير متوفر</span>
    `;
}

function filterMeals(catId) {
    renderMeals(catId);
}

function openMealModal(mealId = null) {
    const form = document.getElementById('mealForm');
    form.reset();
    document.getElementById('mealImagePreview').style.display = 'none';
    
    document.getElementById('mealHasSizes').checked = false;
    document.getElementById('sizesSection').style.display = 'none';
    document.getElementById('singlePriceGroup').style.display = 'block';
    document.getElementById('sizesContainer').innerHTML = '';
    
    const categories = getCategories();
    const catSelect = document.getElementById('mealCategory');
    catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    if (mealId) {
        const meal = getMeals().find(m => m.id === mealId);
        if (meal) {
            document.getElementById('mealId').value = meal.id;
            document.getElementById('mealName').value = meal.name;
            document.getElementById('mealPrice').value = meal.price || '';
            document.getElementById('mealDescription').value = meal.description;
            document.getElementById('mealCategory').value = meal.categoryId;
            document.getElementById('mealModalTitle').textContent = 'تعديل وجبة';
            
            if (meal.hasSizes && meal.sizes && meal.sizes.length > 0) {
                document.getElementById('mealHasSizes').checked = true;
                document.getElementById('sizesSection').style.display = 'block';
                document.getElementById('singlePriceGroup').style.display = 'none';
                meal.sizes.forEach(size => addSizeRow(size.name, size.price));
            }
            
            if (meal.image) {
                const preview = document.getElementById('mealImagePreview');
                preview.querySelector('img').src = meal.image;
                preview.style.display = 'flex';
                const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                if(uploadLabel) uploadLabel.style.display = 'none';
                
                // Add Delete Button if missing
                if (!preview.querySelector('.btn-delete-image')) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-delete-image';
                    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> حذف الصورة';
                    deleteBtn.type = 'button';
                    deleteBtn.onclick = function(e) {
                         e.stopPropagation();
                         if(confirm('هل أنت متأكد من حذف الصورة؟')) {
                             preview.querySelector('img').src = '';
                             preview.style.display = 'none';
                             const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                             if(uploadLabel) uploadLabel.style.display = 'flex';
                             document.getElementById('mealImageInput').value = '';
                         }
                    };
                    preview.appendChild(deleteBtn);
                    preview.style.position = 'relative';
                }
            } else {
                 const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                 if(uploadLabel) uploadLabel.style.display = 'flex';
            }
        }
    } else {
        document.getElementById('mealId').value = '';
        document.getElementById('mealModalTitle').textContent = 'إضافة وجبة جديدة';
        const uploadLabel = document.querySelector('label[for="mealImageInput"]');
        if(uploadLabel) uploadLabel.style.display = 'flex';
    }
    
    document.getElementById('mealModal').classList.add('active');
}

function closeMealModal() {
    document.getElementById('mealModal').classList.remove('active');
}

async function saveMeal(event) {
    event.preventDefault();
    const submitBtn = document.querySelector('#mealForm button[type="submit"]');
    if (submitBtn) { submitBtn.textContent = '⏳ جاري الحفظ...'; submitBtn.disabled = true; }
    
    try {
        const id = document.getElementById('mealId').value;
        const name = document.getElementById('mealName').value;
        const description = document.getElementById('mealDescription').value;
        const categoryId = parseInt(document.getElementById('mealCategory').value);
        const hasSizes = document.getElementById('mealHasSizes').checked;
        
        let price = 0;
        let sizes = [];
        
        if (hasSizes) {
            sizes = getSizesFromForm();
            if (sizes.length === 0) throw new Error('يرجى إضافة حجم واحد على الأقل');
            price = Math.min(...sizes.map(s => s.price));
        } else {
            price = parseFloat(document.getElementById('mealPrice').value) || 0;
            if (price <= 0) throw new Error('يرجى إدخال سعر صحيح');
        }
        
        let image = '';
        const preview = document.getElementById('mealImagePreview');
        if (preview.style.display !== 'none') {
            image = preview.querySelector('img').src;
        }
        const croppedData = document.getElementById('croppedImageData');
        if (croppedData && croppedData.value) image = croppedData.value;
        
        const mealData = { name, price, description, categoryId, image: image || null, hasSizes, sizes, active: true };
        
        if (id) {
            const existing = getMeals().find(m => m.id == id);
            await updateMealData({ ...existing, ...mealData, id: parseInt(id) });
            showToast('تم تحديث الوجبة بنجاح', 'success');
        } else {
            await createMealData({ ...mealData, popular: false, order: getMeals().length + 1 });
            showToast('تم إضافة الوجبة بنجاح', 'success');
        }
        
        closeMealModal();
        renderMeals();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (submitBtn) { submitBtn.textContent = 'حفظ'; submitBtn.disabled = false; }
    }
}

function toggleSizesSection() {
    const hasSizes = document.getElementById('mealHasSizes').checked;
    const sizesSection = document.getElementById('sizesSection');
    const singlePriceGroup = document.getElementById('singlePriceGroup');
    
    if (hasSizes) {
        sizesSection.style.display = 'block';
        singlePriceGroup.style.display = 'none';
        if (document.getElementById('sizesContainer').children.length === 0) {
            addSizeRow('صغير', '');
            addSizeRow('وسط', '');
            addSizeRow('كبير', '');
        }
    } else {
        sizesSection.style.display = 'none';
        singlePriceGroup.style.display = 'block';
    }
}

function addSizeRow(sizeName = '', sizePrice = '') {
    const container = document.getElementById('sizesContainer');
    const rowId = Date.now() + Math.random().toString(36).substr(2, 5);;
    
    const row = document.createElement('div');
    row.className = 'size-row';
    row.id = `size-row-${rowId}`;
    row.innerHTML = `
        <input type="text" class="form-input size-name" placeholder="اسم الحجم" value="${sizeName}">
        <input type="number" class="form-input size-price" placeholder="السعر" value="${sizePrice}">
        <button type="button" class="btn-remove-size" onclick="removeSizeRow('size-row-${rowId}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
    `;
    container.appendChild(row);
}

function removeSizeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    if (document.getElementById('sizesContainer').children.length === 0) addSizeRow('', '');
}

function getSizesFromForm() {
    const sizes = [];
    document.querySelectorAll('#sizesContainer .size-row').forEach(row => {
        const name = row.querySelector('.size-name').value.trim();
        const price = parseFloat(row.querySelector('.size-price').value) || 0;
        if (name && price > 0) sizes.push({ name, price });
    });
    return sizes;
}

async function toggleMealActive(id) {
    const meal = getMeals().find(m => m.id === id);
    if (meal) {
        const updated = { ...meal, active: !meal.active };
        await updateMealData(updated);
        renderMeals();
        showToast(`${updated.name} ${updated.active ? 'متاح الآن' : 'غير متاح'}`, updated.active ? 'success' : 'warning');
    }
}

function bulkToggleMeals(activate) {
    const currentCategory = document.getElementById('mealsCategorySelect').value;
    let meals = getMeals();
    let targetMeals = meals;
    if (currentCategory && currentCategory !== 'all') {
        targetMeals = meals.filter(m => m.categoryId == currentCategory);
    }
    
    if (!confirm(`هل تريد ${activate ? 'تفعيل' : 'إيقاف'} ${targetMeals.length} وجبة؟`)) return;
    
    // Save Meals is deprecated in data.js, but since we modify many, we iterate
    // Ideally backend has bulk update endpoint. For now iterating is acceptable on small scale
    // Or just update local state and let background sync?
    // data.js `saveMeals` warns.
    // Let's iterate promises for robustness or just update local if backend is not strict.
    // I'll update local and try to save individually or if api supports bulk? It doesn't seem to.
    
    // Optimistic Update
    targetMeals.forEach(m => {
       if (m.active !== activate) {
           m.active = activate;
           updateMealData(m); // Sends request
       }
    });

    renderMeals();
    showToast('تم تحديث الحالة', 'success');
}

async function deleteMealFunc(id) {
    if (confirm('هل أنت متأكد من حذف الوجبة؟')) {
        await deleteMealData(id);
        renderMeals();
        showToast('تم حذف الوجبة', 'warning');
    }
}
