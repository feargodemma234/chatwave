// --- GOOGLE SHEETS CONFIG ---
// 1. PRODUCTS SHEET (Digital Assets)
const PRODUCTS_ID = '19W33pFurvp8OHdVYSzcBsH2xjML6p5PStGCZeUblIsM'; 
const PRODUCTS_URL = `https://docs.google.com/spreadsheets/d/${PRODUCTS_ID}/export?format=csv`;

// 2. ACCOUNTS SHEET (Social Media Marketplace) - UPDATED with your new link
const ACCOUNTS_ID = '1hp1OYytQHVbS9E0PlHlXAxDZpv0kBgYQ3RtPMb1cVOc'; 
const ACCOUNTS_URL = `https://docs.google.com/spreadsheets/d/${ACCOUNTS_ID}/export?format=csv`;

// 3. SETTINGS SHEET (Video Background)
const SETTINGS_ID = '1LufDdJ5n-nWTMIwEhxTSBddlHaO-ykVCssOQ47XHuSU';
const SETTINGS_URL = `https://docs.google.com/spreadsheets/d/${SETTINGS_ID}/gviz/tq?tqx=out:csv&sheet=SiteSettings`;

// --- DOM ELEMENTS ---
const navbar = document.getElementById('navbar');
const menuBtn = document.getElementById('menuBtn');
const closeMenu = document.getElementById('closeMenu');
const mobileMenu = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('.mobile-link');
const projectForm = document.getElementById('projectForm');

// --- AUTO UPDATE YEAR ---
if(document.getElementById('year')) {
    document.getElementById('year').textContent = new Date().getFullYear();
}

// --- NAVBAR SCROLL EFFECT ---
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
}

// --- MOBILE MENU ---
if (menuBtn) {
    function toggleMenu(open) {
        if (open) {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    menuBtn.addEventListener('click', () => toggleMenu(true));
    closeMenu.addEventListener('click', () => toggleMenu(false));
    mobileLinks.forEach(link => link.addEventListener('click', () => toggleMenu(false)));
}

// --- SCROLL REVEAL ---
const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); 
        }
    });
}, observerOptions);
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// --- 1. LOAD SITE SETTINGS (BACKGROUND VIDEO) ---
async function loadSiteSettings() {
    try {
        const response = await fetch(SETTINGS_URL);
        if (!response.ok) return; 
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const videoSource = document.getElementById('bg-video-source');
                const videoTag = document.getElementById('bg-video');
                if (!videoSource || !videoTag) return;

                results.data.forEach(row => {
                    if (row.key && row.key.trim().toLowerCase() === 'background_video' && row.value) {
                        videoSource.src = row.value.trim();
                        videoTag.load(); 
                    }
                });
            }
        });
    } catch (error) {
        console.log("Settings not loaded.");
    }
}

// --- HELPER: GOOGLE DRIVE IMAGE CONVERTER ---
function getDriveDirectLink(url) {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
    return match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';

// --- 2. LOAD PRODUCTS (Runs on products.html) ---
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return; 
    
    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1/-1;">Loading products...</p>';

    try {
        const response = await fetch(PRODUCTS_URL);
        if (!response.ok) throw new Error(`Make sure your Products sheet is public.`);
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase(),
            complete: function(results) {
                const today = new Date(); today.setHours(0,0,0,0);
                const activeProducts = results.data.filter(p => {
                    if (!p.expiry || p.expiry.trim() === '') return true;
                    const expiryDate = new Date(p.expiry);
                    if (isNaN(expiryDate.getTime())) return true;
                    return today <= expiryDate;
                });

                grid.innerHTML = ''; 

                if (activeProducts.length === 0) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1/-1;">No active products found.</p>';
                    return;
                }

                activeProducts.forEach((product, index) => {
                    let selarLink = product['selar link'] ? product['selar link'].trim() : '#';
                    const checkoutLink = selarLink.includes('?') ? selarLink + '&add_to_cart=1' : selarLink + '?add_to_cart=1';
                    const rawPrice = product['price usd'];
                    const formattedPrice = rawPrice && rawPrice.trim() !== '' ? `$${rawPrice}` : 'Free';
                    let imgUrl = getDriveDirectLink(product.image ? product.image.trim() : '') || FALLBACK_IMG;

                    const card = document.createElement('div');
                    card.className = 'product-card reveal';
                    card.style.transitionDelay = `${index * 0.1}s`; 
                    card.innerHTML = `
                        <div class="product-image-wrapper">
                            <img src="${imgUrl}" alt="${product.name}" class="product-image" onerror="this.src='${FALLBACK_IMG}'">
                        </div>
                        <div class="product-info">
                            <h3>${product.name || 'Untitled Product'}</h3>
                            <p>${product.description || 'No description available.'}</p>
                            <div class="product-meta">
                                <span class="product-price">${formattedPrice}</span>
                                <span class="product-category">Digital</span>
                            </div>
                            <a href="${checkoutLink}" target="_blank" class="btn-buy">GET ACCESS <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                        </div>
                    `;
                    grid.appendChild(card);
                    observer.observe(card);
                });
            }
        });
    } catch (error) {
        grid.innerHTML = `<div style="grid-column: 1/-1; padding: 30px; background: rgba(255,0,0,0.1); border: 1px solid red; border-radius: 10px; text-align: center; color: red;"><h3>Failed to load products</h3><p>${error.message}</p></div>`;
    }
}

// --- 3. LOAD ACCOUNTS (Runs on accounts.html) ---
async function loadAccounts() {
    const grid = document.getElementById('account-grid');
    if (!grid) return; 

    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1/-1;">Loading accounts...</p>';

    try {
        const response = await fetch(ACCOUNTS_URL);
        if (!response.ok) throw new Error(`Make sure your Accounts sheet is public.`);
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase(),
            complete: function(results) {
                grid.innerHTML = ''; 

                if (results.data.length === 0) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1/-1;">No accounts available right now.</p>';
                    return;
                }

                results.data.forEach((account, index) => {
                    let selarLink = account['selar_link'] ? account['selar_link'].trim() : '#';
                    const checkoutLink = selarLink.includes('?') ? selarLink + '&add_to_cart=1' : selarLink + '?add_to_cart=1';
                    const rawPrice = account['price_usd'];
                    const formattedPrice = rawPrice && rawPrice.trim() !== '' ? `$${rawPrice}` : 'Free';
                    let imgUrl = getDriveDirectLink(account.image ? account.image.trim() : '') || FALLBACK_IMG;

                    let icon = '<i class="fa-solid fa-globe"></i>';
                    const platform = (account.platform || '').toLowerCase();
                    if (platform.includes('insta')) icon = '<i class="fa-brands fa-instagram"></i>';
                    if (platform.includes('tiktok')) icon = '<i class="fa-brands fa-tiktok"></i>';
                    if (platform.includes('twitter') || platform.includes('x')) icon = '<i class="fa-brands fa-x-twitter"></i>';
                    if (platform.includes('youtube')) icon = '<i class="fa-brands fa-youtube"></i>';

                    const card = document.createElement('div');
                    card.className = 'product-card reveal';
                    card.style.transitionDelay = `${index * 0.1}s`; 
                    card.innerHTML = `
                        <div class="product-image-wrapper">
                            <img src="${imgUrl}" alt="${account.handle}" class="product-image" onerror="this.src='${FALLBACK_IMG}'">
                            <div style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); padding: 8px; border-radius: 50%; color: var(--cyan); font-size: 1.2rem; backdrop-filter: blur(5px);">
                                ${icon}
                            </div>
                        </div>
                        <div class="product-info">
                            <h3>${account.handle || 'Unknown Handle'}</h3>
                            <p><strong>Niche:</strong> ${account.niche || 'N/A'}<br><strong>Followers:</strong> ${account.followers || 'N/A'}</p>
                            <div class="product-meta">
                                <span class="product-price">${formattedPrice}</span>
                                <span class="product-category">${account.platform || 'Account'}</span>
                            </div>
                            <a href="${checkoutLink}" target="_blank" class="btn-buy">BUY ACCOUNT <i class="fa-solid fa-cart-shopping"></i></a>
                        </div>
                    `;
                    grid.appendChild(card);
                    observer.observe(card);
                });
            }
        });
    } catch (error) {
        grid.innerHTML = `<div style="grid-column: 1/-1; padding: 30px; background: rgba(255,0,0,0.1); border: 1px solid red; border-radius: 10px; text-align: center; color: red;"><h3>Failed to load accounts</h3><p>${error.message}</p></div>`;
    }
}

// --- FORM SUBMISSION ---
if (projectForm) {
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const service = document.getElementById('service').value;
        const message = document.getElementById('message').value;

        const subject = encodeURIComponent(`New Project Request: ${service} from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nService: ${service}\n\nProject Details:\n${message}`);
        window.location.href = `mailto:nexorastudio5656@gmail.com?subject=${subject}&body=${body}`;
        
        setTimeout(() => {
            projectForm.reset();
            alert("Your email app has been opened. If it didn't open, please email us directly at nexorastudio5656@gmail.com");
        }, 1000);
    });
}

// --- INITIALIZE ---
loadSiteSettings();
loadProducts();
loadAccounts();