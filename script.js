// --- GOOGLE SHEETS CONFIG ---
const SHEET_ID = '19W33pFurvp8OHdVYSzcBsH2xjML6p5PStGCZeUblIsM'; 
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// --- DOM ELEMENTS ---
const navbar = document.getElementById('navbar');
const menuBtn = document.getElementById('menuBtn');
const closeMenu = document.getElementById('closeMenu');
const mobileMenu = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('.mobile-link');
const productGrid = document.getElementById('product-grid'); // <-- This will be null on index.html
const projectForm = document.getElementById('projectForm');

// --- AUTO UPDATE YEAR ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- NAVBAR SCROLL EFFECT ---
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
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

// --- SCROLL REVEAL ANIMATIONS ---
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

// --- HELPER: GOOGLE DRIVE IMAGE LINK CONVERTER ---
function getDriveDirectLink(url) {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
    return match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';

// --- FETCH & RENDER PRODUCTS (Only runs on products.html) ---
async function loadProducts() {
    // If the product grid doesn't exist on this page, stop the function.
    if (!productGrid) return; 

    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`Google Sheet Error: Make sure the sheet is shared as "Anyone with the link". Status: ${response.status}`);
        }
        
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim().toLowerCase(),
            complete: function(results) {
                const today = new Date();
                today.setHours(0,0,0,0);

                const activeProducts = results.data.filter(product => {
                    if (!product.expiry || product.expiry.trim() === '') return true;
                    const expiryDate = new Date(product.expiry);
                    if (isNaN(expiryDate.getTime())) return true;
                    return today <= expiryDate;
                });

                productGrid.innerHTML = ''; 

                if (activeProducts.length === 0) {
                    productGrid.innerHTML = '<p style="color: var(--gray); text-align: center; width: 100%; grid-column: 1/-1;">New products are coming soon.</p>';
                    return;
                }

                activeProducts.forEach((product, index) => {
                    let selarLink = product['selar link'] ? product['selar link'].trim() : '#';
                    const checkoutLink = selarLink.includes('?') 
                        ? selarLink + '&add_to_cart=1' 
                        : selarLink + '?add_to_cart=1';

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
        productGrid.innerHTML = `<p style="color: red; text-align: center; width: 100%; grid-column: 1/-1; padding: 20px;">
            Error: ${error.message}
        </p>`;
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
            alert("Your email app has been opened to send the project request. If it didn't open, please email us directly at nexorastudio5656@gmail.com");
        }, 1000);
    });
}

// --- INITIALIZE ---
loadProducts();