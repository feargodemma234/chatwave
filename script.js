// --- GOOGLE SHEETS CONFIG (UPDATED WITH YOUR NEW LINK) ---
const SHEET_ID = '1LufDdJ5n-nWTMIwEhxTSBddlHaO-ykVCssOQ47XHuSU'; 
const PRODUCTS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const SETTINGS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=SiteSettings`;

// --- DOM ELEMENTS ---
const navbar = document.getElementById('navbar');
const menuBtn = document.getElementById('menuBtn');
const closeMenu = document.getElementById('closeMenu');
const mobileMenu = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('.mobile-link');
const productGrid = document.getElementById('product-grid');
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
        if (!response.ok) return; // If the tab doesn't exist or is blocked, use fallback
        
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const videoTag = document.getElementById('bg-video');
                const videoSource = document.getElementById('bg-video-source');
                
                if (!videoTag || !videoSource) return;

                // Loop through the settings sheet to find the background video
                results.data.forEach(row => {
                    if (row.key && row.key.trim() === 'background_video' && row.value) {
                        videoSource.src = row.value.trim();
                        videoTag.load(); // Tell the browser to load the new video
                    }
                });
            }
        });
    } catch (error) {
        console.log("Settings not loaded, using default fallback.");
    }
}

// --- HELPER: GOOGLE DRIVE IMAGE LINK CONVERTER ---
function getDriveDirectLink(url) {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
    return match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';

// --- 2. LOAD PRODUCTS ---
async function loadProducts() {
    if (!productGrid) return; // Stop if we are not on the products page
    try {
        const response = await fetch(PRODUCTS_URL);
        if (!response.ok) throw new Error(`Google Sheet Error. Status: ${response.status}`);
        
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim().toLowerCase(),
            complete: function(results) {
                const today = new Date();
                today.setHours(0,0,0,0);

                // Filter out expired products
                const activeProducts = results.data.filter(product => {
                    if (!product.expiry || product.expiry.trim() === '') return true;
                    const expiryDate = new Date(product.expiry);
                    if (isNaN(expiryDate.getTime())) return true;
                    return today <= expiryDate;
                });

                productGrid.innerHTML = ''; 

                if (activeProducts.length === 0) {
                    productGrid.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1/-1;">New products are coming soon.</p>';
                    return;
                }

                // Render Cards
                activeProducts.forEach((product, index) => {
                    let selarLink = product['selar link'] ? product['selar link'].trim() : '#';
                    const checkoutLink = selarLink.includes('?') ? selarLink + '&add_to_cart=1' : selarLink + '?add_to_cart=1';

                    let imgUrl = product.image ? product.image.trim() : '';
                    imgUrl = getDriveDirectLink(imgUrl);
                    if (!imgUrl) imgUrl = FALLBACK_IMG;

                    const rawPrice = product['price usd'];
                    const formattedPrice = rawPrice && rawPrice.trim() !== '' ? `$${rawPrice}` : 'Free';

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
                            <a href="${checkoutLink}" target="_blank" class="btn-buy">
                                GET ACCESS <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>
                    `;
                    productGrid.appendChild(card);
                    observer.observe(card);
                });
            }
        });
    } catch (error) {
        console.error('Fetch Error:', error);
        productGrid.innerHTML = `<p style="color: red; text-align: center; width: 100%; grid-column: 1/-1; padding: 20px;">Error: ${error.message}</p>`;
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
loadSiteSettings(); // Fetches the video link
loadProducts();     // Fetches the products