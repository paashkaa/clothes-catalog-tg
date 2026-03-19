// app.js - Каталог одежды v2.0
console.log('👗 Каталог одежды инициализирован');

// Конфигурация
const CONFIG = {
    apiUrl: 'data/structure.json',
    checkInterval: 60000,
    previewFolder: 'images_preview',
    fullFolder: 'images'
};

// Элементы DOM
const elements = {
    foldersContainer: document.getElementById('folders-container'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    toggleViewBtn: document.getElementById('toggle-view'),
    viewText: document.getElementById('view-text'),
    toggleThemeBtn: document.getElementById('toggle-theme'),
    themeText: document.getElementById('theme-text'),
    refreshBtn: document.getElementById('refresh-btn'),
    folderModal: document.getElementById('folder-modal'),
    modalTitle: document.getElementById('modal-title'),
    photosContainer: document.getElementById('photos-container'),
    modalClose: document.getElementById('modal-close'),
    lightbox: document.getElementById('lightbox'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxFilename: document.getElementById('lightbox-filename'),
    lightboxFolder: document.getElementById('lightbox-folder'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxClose: document.getElementById('lightbox-close'),
    photoCounter: document.getElementById('photo-counter'),
    photoLoading: document.getElementById('photo-loading'),
    folderChangeIndicator: document.getElementById('folder-change-indicator'),
    newFolderName: document.getElementById('new-folder-name'),
    lightboxSave: document.getElementById('lightbox-save')
};

// Состояние приложения
const state = {
    folders: [],
    flatList: [],
    currentView: 'folders',
    currentFolder: null,
    currentPhotoIndex: 0,
    searchQuery: '',
    isTelegram: false,
    theme: 'dark',
    isInitialized: false
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    console.log('Инициализация каталога одежды...');
    
    checkEnvironment();
    setupTheme();
    setupEventListeners();
    await loadData();
    initActionButtons();
    
    state.isInitialized = true;
    console.log('Каталог готов к работе');
}

function checkEnvironment() {
    state.isTelegram = !!(window.Telegram?.WebApp?.initData);
    
    if (state.isTelegram) {
        console.log('✅ Запущено в Telegram Web App');
        if (Telegram.WebApp.HapticFeedback?.impactOccurred) {
            Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        if (elements.refreshBtn) elements.refreshBtn.style.display = 'none';
        document.body.classList.add('telegram-env');
    } else {
        console.log('🌍 Запущено в обычном браузере');
        if (elements.refreshBtn) elements.refreshBtn.style.display = 'flex';
    }
}

function setupTheme() {
    const savedTheme = localStorage.getItem('catalogTheme');
    if (savedTheme) state.theme = savedTheme;
    
    if (state.isTelegram) {
        state.theme = Telegram.WebApp.colorScheme === 'dark' ? 'dark' : 'light';
        Telegram.WebApp.onEvent('themeChanged', () => {
            state.theme = Telegram.WebApp.colorScheme === 'dark' ? 'dark' : 'light';
            applyTheme();
        });
    }
    
    applyTheme();
    updateThemeButton();
}
/*
function applyTheme() {
    if (state.isTelegram) {
        document.documentElement.style.setProperty('--bg-dark', 'var(--tg-theme-bg-color)');
        document.documentElement.style.setProperty('--bg-card', 'var(--tg-theme-secondary-bg-color)');
        document.documentElement.style.setProperty('--text-primary', 'var(--tg-theme-text-color)');
        document.documentElement.style.setProperty('--text-secondary', 'var(--tg-theme-hint-color)');
        document.documentElement.style.setProperty('--border-color', 'var(--tg-theme-border-color, #333)');
        document.documentElement.style.setProperty('--accent', 'var(--tg-theme-link-color)');
    } else {
        if (state.theme === 'dark') {
            document.documentElement.style.setProperty('--bg-dark', '#121212');
            document.documentElement.style.setProperty('--bg-card', '#1e1e1e');
            document.documentElement.style.setProperty('--text-primary', '#e0e0e0');
            document.documentElement.style.setProperty('--text-secondary', '#aaa');
            document.documentElement.style.setProperty('--border-color', '#333');
            document.documentElement.style.setProperty('--accent', '#6c63ff');
        } else {
            document.documentElement.style.setProperty('--bg-dark', '#ffffff');
            document.documentElement.style.setProperty('--bg-card', '#f5f5f5');
            document.documentElement.style.setProperty('--text-primary', '#333333');
            document.documentElement.style.setProperty('--text-secondary', '#666666');
            document.documentElement.style.setProperty('--border-color', '#ddd');
            document.documentElement.style.setProperty('--accent', '#6c63ff');
        }
    }
}
*/

function applyTheme() {
    if (state.isTelegram) {
        document.documentElement.setAttribute('data-theme', Telegram.WebApp.colorScheme);
    } else {
        document.documentElement.setAttribute('data-theme', state.theme);
    }
}

function updateThemeButton() {
    if (elements.themeText) {
        elements.themeText.textContent = state.theme === 'dark' ? 'Тёмная' : 'Светлая';
        elements.toggleThemeBtn.querySelector('.btn-icon').textContent = 
            state.theme === 'dark' ? '🌙' : '☀️';
    }
}

function showToast(message, duration = 1500) {
    const existingToast = document.getElementById('custom-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = 'custom-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, duration);
}

function initActionButtons() {
    if (state.isTelegram && Telegram.WebApp?.MainButton) {
        Telegram.WebApp.MainButton.setText('📋 Скопировать путь');
        Telegram.WebApp.MainButton.hide();
        Telegram.WebApp.MainButton.onClick(() => {
            if (state.currentFolder?.photos?.[state.currentPhotoIndex]) {
                const photo = state.currentFolder.photos[state.currentPhotoIndex];
                const filename = photo.original_path || photo.original; // например, "clothes_library/25-02-2026/25-02-2026-195837.png"
                if (Telegram.WebApp.HapticFeedback?.notificationOccurred) {
                    Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                }
                // Копируем в буфер обмена
                const textToCopy = filename;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showToast(`✅ Путь скопирован: ${textToCopy}`);
						setTimeout(() => Telegram.WebApp.close(), 1500);
                    }).catch(() => {
                        Telegram.WebApp.showAlert('❌ Не удалось скопировать. Попробуйте вручную.');
                    });
                } else {
                    // fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showToast(`✅ Путь скопирован: ${textToCopy}`);
					setTimeout(() => Telegram.WebApp.close(), 1500);
                }
            }
        });
    } else if (elements.lightboxSave) {
        elements.lightboxSave.textContent = '💾 Сохранить';
        elements.lightboxSave.addEventListener('click', () => {
            if (state.currentFolder?.photos?.[state.currentPhotoIndex]?.path) {
                const photo = state.currentFolder.photos[state.currentPhotoIndex];
                const link = document.createElement('a');
                link.href = photo.path;
                link.download = photo.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                elements.lightboxSave.classList.add('btn-clicked');
                setTimeout(() => elements.lightboxSave.classList.remove('btn-clicked'), 300);
            }
        });
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadData() {
    try {
        const response = await fetch(`${CONFIG.apiUrl}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        let data = await response.json();
        data = fixPaths(data);
        
        state.folders = data.folders || [];
        state.flatList = data.flat_list || [];
        
        updateUI();
        
        if (state.isTelegram && Telegram.WebApp.HapticFeedback?.notificationOccurred) {
            Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Не удалось загрузить каталог');
    }
}

function fixPaths(data) {
    const pathMap = {
        'photo/': 'images/',
        'photo_preview/': 'images_preview/',
        'photo\\': 'images/',
        'photo_preview\\': 'images_preview/'
    };
    
    function replacePaths(obj) {
        if (Array.isArray(obj)) return obj.map(replacePaths);
        if (obj && typeof obj === 'object') {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                if (typeof value === 'string') {
                    let newValue = value;
                    Object.entries(pathMap).forEach(([from, to]) => {
                        newValue = newValue.replace(from, to);
                    });
                    acc[key] = newValue;
                } else {
                    acc[key] = replacePaths(value);
                }
                return acc;
            }, {});
        }
        return obj;
    }
    
    return replacePaths(data);
}

function updateUI() {
    const hasItems = state.folders.length > 0 || state.flatList.length > 0;
    
    if (hasItems) {
        elements.emptyState.style.display = 'none';
        renderItems();
    } else {
        elements.emptyState.style.display = 'block';
        elements.foldersContainer.style.display = 'none';
    }
}

function renderItems() {
    const filteredFolders = getFilteredFolders();
    const filteredFlatList = getFilteredFlatList();
    
    if (state.currentView === 'flat') {
        renderFlatView(filteredFlatList);
    } else {
        renderFoldersView(filteredFolders);
    }
}

function renderFoldersView(folders) {
    elements.foldersContainer.className = 'folders-container';
    elements.foldersContainer.innerHTML = '';
    
    if (folders.length === 0) {
        elements.foldersContainer.innerHTML = '<div class="loading"><p>Ничего не найдено</p></div>';
        return;
    }
    
    folders.forEach((folder, index) => {
        const folderCard = document.createElement('div');
        folderCard.className = 'folder-card';
        folderCard.style.setProperty('--i', index);
        
        folderCard.innerHTML = `
          <div class="folder-preview-container">
            <img class="folder-preview" 
                src="${folder.preview || getErrorPreview()}" 
                alt="${escapeHtml(folder.name)}"
                loading="lazy"
                onerror="this.src='${getErrorPreview()}'; this.classList.add('is-error');">
          </div>
          <div class="folder-info-bar">
            <div class="folder-info-name">${escapeHtml(folder.name)}</div>
            <div class="folder-info-stats">${folder.photo_count} | ${folder.size_human || ''}</div>
          </div>
        `;
        
        folderCard.addEventListener('click', () => openFolder(folder));
        elements.foldersContainer.appendChild(folderCard);
    });
}

function renderFlatView(items) {
    elements.foldersContainer.className = 'folders-container flat-view';
    elements.foldersContainer.innerHTML = '';
    
    if (items.length === 0) {
        elements.foldersContainer.innerHTML = '<div class="loading"><p>Ничего не найдено</p></div>';
        return;
    }
    
    items.forEach((item, index) => {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.style.setProperty('--i', index);
        
        photoCard.innerHTML = `
          <div class="photo-preview-container">
            <img class="photo-preview" 
                src="${item.preview || getErrorPreview()}" 
                alt="${escapeHtml(item.name)}"
                loading="lazy"
                onerror="this.src='${getErrorPreview()}'; this.classList.add('is-error');">
          </div>
          <div class="photo-info-bar">${escapeHtml(item.name)}</div>
        `;
        
        photoCard.addEventListener('click', () => openPhotoFromFlatList(item, index));
        elements.foldersContainer.appendChild(photoCard);
    });
}

function getFilteredFolders() {
    if (!state.searchQuery) return state.folders;
    const query = state.searchQuery.toLowerCase();
    return state.folders.filter(folder => 
        folder.name.toLowerCase().includes(query) ||
        folder.path.toLowerCase().includes(query)
    );
}

function getFilteredFlatList() {
    if (!state.searchQuery) return state.flatList;
    const query = state.searchQuery.toLowerCase();
    return state.flatList.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.folder.toLowerCase().includes(query)
    );
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
function setupEventListeners() {
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            renderItems();
        });
    }
    
    if (elements.toggleViewBtn) {
        elements.toggleViewBtn.addEventListener('click', toggleView);
    }
    
    if (elements.toggleThemeBtn) {
        elements.toggleThemeBtn.addEventListener('click', toggleTheme);
    }
    
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', () => loadData());
    }
    
    if (elements.modalClose) {
        elements.modalClose.addEventListener('click', closeFolderModal);
    }
    
    if (elements.folderModal) {
        elements.folderModal.addEventListener('click', (e) => {
            if (e.target === elements.folderModal) closeFolderModal();
        });
    }
    
    if (elements.lightboxPrev) elements.lightboxPrev.addEventListener('click', showPrevPhoto);
    if (elements.lightboxNext) elements.lightboxNext.addEventListener('click', showNextPhoto);
    if (elements.lightboxClose) elements.lightboxClose.addEventListener('click', closeLightbox);
    
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function toggleView() {
    state.currentView = state.currentView === 'folders' ? 'flat' : 'folders';
    elements.viewText.textContent = state.currentView === 'folders' ? 'Папки' : 'Все';
    renderItems();
    localStorage.setItem('catalogView', state.currentView);
}

function toggleTheme() {
    if (state.isTelegram) return;
    
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    updateThemeButton();
    localStorage.setItem('catalogTheme', state.theme);
    renderItems();
    setTimeout(refreshErrorImages, 150);
}

function refreshErrorImages() {
  document.querySelectorAll('img.is-error').forEach(img => {
    const currentSrc = img.src; // это data URI заглушки
    img.src = '';               // сбрасываем
    img.src = currentSrc;       // ставим ту же заглушку (но она уже новая, из getErrorPreview)
  });
}

// ========== ФУНКЦИОНАЛЬНОСТЬ ПАПОК ==========
function openFolder(folder) {
    state.currentFolder = folder;
    state.currentPhotoIndex = 0;
    
    if (state.isTelegram && Telegram.WebApp.HapticFeedback?.impactOccurred) {
        Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
    
    elements.folderModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => updateFolderModalContent(folder), 50);
}

function updateFolderModalContent(folder) {
    elements.modalTitle.textContent = folder.name;
    elements.photosContainer.innerHTML = '';
    
    if (!folder.photos || folder.photos.length === 0) {
        elements.photosContainer.innerHTML = '<div class="empty-folder">В папке нет фото</div>';
        return;
    }
    
    folder.photos.forEach((photo, index) => {
        const photoElement = document.createElement('div');
        photoElement.className = 'photo-thumb';
        
        photoElement.innerHTML = `
          <div class="photo-thumb-preview-container">
            <img src="${photo.preview_path || photo.path}" 
                alt="${escapeHtml(photo.name)}" 
                loading="lazy"
                onerror="this.src='${getErrorPreview()}'; this.classList.add('is-error');">
          </div>
          <div class="photo-thumb-info-bar">${escapeHtml(photo.name)}</div>
        `;
        
        photoElement.addEventListener('click', () => openLightbox(index));
        elements.photosContainer.appendChild(photoElement);
    });
}

function closeFolderModal() {
    elements.folderModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    state.currentFolder = null;
}

// ========== LIGHTBOX ==========
function openPhotoFromFlatList(item, index) {
    const folder = state.folders.find(f => f.name === item.folder);
    if (!folder) return;
    
    const photoIndex = folder.photos.findIndex(p => p.name === item.name);
    if (photoIndex === -1) return;
    
    state.currentFolder = folder;
    state.currentPhotoIndex = photoIndex;
    openLightbox(photoIndex);
}

function openLightbox(photoIndex) {
    if (!state.currentFolder?.photos) return;
    
    state.currentPhotoIndex = photoIndex;
    updateLightbox();
    
    elements.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (state.isTelegram && Telegram.WebApp.HapticFeedback?.impactOccurred) {
        Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
	// 🔥 ПОКАЗЫВАЕМ КНОПКУ "📋 Скопировать путь" ТОЛЬКО В ЛАЙТБОКСЕ
	if (state.isTelegram && Telegram.WebApp?.MainButton) {
        Telegram.WebApp.MainButton.show();
        Telegram.WebApp.MainButton.enable();
    }
}

function updateLightbox() {
    if (!state.currentFolder) return;
    
    const photo = state.currentFolder.photos[state.currentPhotoIndex];
    if (!photo) return;
    
    elements.photoLoading.style.display = 'block';
    
    const img = new Image();
    img.onload = () => {
        elements.photoLoading.style.display = 'none';
        elements.lightboxImage.src = photo.path;
    };
    img.onerror = () => {
        elements.photoLoading.style.display = 'none';
        elements.lightboxImage.src = getErrorPreview();
    };
    img.src = photo.path;
    
    elements.lightboxFilename.textContent = photo.name;
    elements.lightboxFolder.textContent = state.currentFolder.name;
    elements.photoCounter.textContent = `${state.currentPhotoIndex + 1} / ${state.currentFolder.photos.length}`;
}

function showPrevPhoto() {
    if (!state.currentFolder) return;
    
    state.currentPhotoIndex--;
    if (state.currentPhotoIndex < 0) {
        const folderIndex = state.folders.findIndex(f => f.name === state.currentFolder.name);
        if (folderIndex > 0) {
            const prevFolder = state.folders[folderIndex - 1];
            if (prevFolder?.photos?.length) {
                state.currentFolder = prevFolder;
                state.currentPhotoIndex = prevFolder.photos.length - 1;
                showFolderChangeIndicator(prevFolder.name);
                if (elements.folderModal.classList.contains('active')) {
                    updateFolderModalContent(prevFolder);
                }
            }
        } else {
            const lastFolder = state.folders[state.folders.length - 1];
            if (lastFolder?.photos?.length) {
                state.currentFolder = lastFolder;
                state.currentPhotoIndex = lastFolder.photos.length - 1;
                showFolderChangeIndicator(lastFolder.name);
                if (elements.folderModal.classList.contains('active')) {
                    updateFolderModalContent(lastFolder);
                }
            }
        }
    }
    
    updateLightbox();
}

function showNextPhoto() {
    if (!state.currentFolder) return;
    
    state.currentPhotoIndex++;
    if (state.currentPhotoIndex >= state.currentFolder.photos.length) {
        const folderIndex = state.folders.findIndex(f => f.name === state.currentFolder.name);
        if (folderIndex < state.folders.length - 1) {
            const nextFolder = state.folders[folderIndex + 1];
            if (nextFolder?.photos?.length) {
                state.currentFolder = nextFolder;
                state.currentPhotoIndex = 0;
                showFolderChangeIndicator(nextFolder.name);
                if (elements.folderModal.classList.contains('active')) {
                    updateFolderModalContent(nextFolder);
                }
            }
        } else {
            const firstFolder = state.folders[0];
            if (firstFolder?.photos?.length) {
                state.currentFolder = firstFolder;
                state.currentPhotoIndex = 0;
                showFolderChangeIndicator(firstFolder.name);
                if (elements.folderModal.classList.contains('active')) {
                    updateFolderModalContent(firstFolder);
                }
            }
        }
    }
    
    updateLightbox();
}

function showFolderChangeIndicator(newFolderName) {
    elements.newFolderName.textContent = newFolderName;
    elements.folderChangeIndicator.style.display = 'block';
    setTimeout(() => elements.folderChangeIndicator.style.display = 'none', 2000);
}

function closeLightbox() {
    elements.lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
    // 🔥 СКРЫВАЕМ КНОПКУ ПРИ ЗАКРЫТИИ
    if (state.isTelegram && Telegram.WebApp?.MainButton) {
        Telegram.WebApp.MainButton.hide();
    }
}

function handleKeyboardNavigation(e) {
    if (elements.lightbox.classList.contains('active')) {
        switch(e.key) {
            case 'ArrowLeft': e.preventDefault(); showPrevPhoto(); break;
            case 'ArrowRight': e.preventDefault(); showNextPhoto(); break;
            case 'Escape': e.preventDefault(); closeLightbox(); break;
        }
    }
    
    if (elements.folderModal.classList.contains('active') && e.key === 'Escape') {
        e.preventDefault();
        closeFolderModal();
    }
}

function showError(message) {
    alert(`Ошибка: ${message}`);
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text || '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getErrorPreview() {
  const theme = state.theme === 'dark' ? 'dark' : 'light';
  
  const gradients = {
    dark: {
      start: '#2a2a2a',
      end: '#1a1a1a',
      accent: '#6c63ff'
    },
    light: {
      start: '#e0e0e0',
      end: '#f5f5f5',
      accent: '#6c63ff'
    }
  };
  
  const g = gradients[theme];
  
  const svg = `
    <svg width="320" height="240" viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${g.start}"/>
          <stop offset="100%" stop-color="${g.end}"/>
        </linearGradient>
        <circle id="dot" cx="160" cy="120" r="30" fill="${g.accent}" opacity="0.1"/>
      </defs>
      <rect width="320" height="240" fill="url(#grad)"/>
      <use href="#dot" x="0" y="0"/>
      <use href="#dot" x="40" y="-20" transform="scale(0.8)"/>
      <use href="#dot" x="-30" y="30" transform="scale(1.2)"/>
    </svg>
  `;
  
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// ========== ЗАПУСК ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.app = {
    init,
    loadData,
    openFolder,
    closeFolderModal,
    openLightbox,
    closeLightbox

};


