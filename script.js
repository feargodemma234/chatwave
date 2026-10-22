// 🚨 YOUR GOOGLE SHEET ID
const SHEET_ID = '19W33pFurvp8OHdVYSzcBsH2xjML6p5PStGCZeUblIsM'; 
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const grid = document.getElementById('product-grid');
const searchInput = document.getElementById('searchInput');
const productCounter = document.getElementById('product-counter');

let allProducts = [];

// Auto Year
document.getElementById('year').textContent = new Date().getFullYear();

// Helper: Convert product name to URL-friendly slug
function slugify(text) {
    return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Helper: Convert Google Drive link to direct image
function getDriveDirectLink(url) {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
    return match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';

// --- MAIN LOGIC ---
async function loadProducts() {
    try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true, 
            skipEmptyLines: true,
            transformHeader: function(header) { return header.trim().toLowerCase(); },
            complete: function(results) {
                
                // 1. EXPIRY FILTER
                const today = new Date();
                today.setHours(0,0,0,0);

                allProducts = results.data.filter(product => {
                    if (!product.expiry || product.expiry.trim() === '') return true;
                    const expiryDate = new Date(product.expiry);
                    if (isNaN(expiryDate.getTime())) return true; 
                    return today <= expiryDate;
                });
                
                // 2. UPDATE COUNT
                productCounter.innerHTML = `<i class="fa-solid fa-box"></i> ${allProducts.length} Products`;

                // 3. DEEP LINKING (URL Share)
                const hash = window.location.hash.substring(1); 
                const urlParams = new URLSearchParams(hash);
                const productLinkId = urlParams.get('product');

                if (productLinkId) {
                    const linkedProduct = allProducts.filter(p => slugify(p.name) === productLinkId);
                    if (linkedProduct.length > 0) {
                        searchInput.value = linkedProduct[0].name;
                        renderProducts(linkedProduct);
                        return;
                    }
                }

                // 4. DEFAULT RENDER
                renderProducts(allProducts);
            }
        });
    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Error loading store.</p>';
    }
}

// --- RENDER CARDS ---
function renderProducts(products) {
    grid.innerHTML = ''; 

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <h3>No products found</h3>
                <p>Try searching for something else.</p>
            </div>
        `;
        return;
    }

    products.forEach((product, index) => {
        // Selar Link Logic
        let selarLink = product['selar link'] ? product['selar link'].trim() : '#';
        const checkoutLink = selarLink.includes('?') 
            ? selarLink + '&add_to_cart=1' 
            : selarLink + '?add_to_cart=1';

        const rawPrice = product['price usd'];
        const formattedPrice = rawPrice && rawPrice.trim() !== '' ? `$${rawPrice}` : 'Free';

        // Image Logic
        let imgUrl = product.image ? product.image.trim() : '';
        imgUrl = getDriveDirectLink(imgUrl);
        if (!imgUrl) imgUrl = FALLBACK_IMAGE;

        // Share Link Logic
        const slug = slugify(product.name);
        const shareUrl = `${window.location.origin}${window.location.pathname}#product=${slug}`;

        const card = document.createElement('div');
        card.className = 'card';
        
        // Apply Staggered Fade Up Animation
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div class="image-wrapper">
                <img src="${imgUrl}" alt="${product.name}" class="card-image" onerror="this.src='${FALLBACK_IMAGE}'">
                <button class="share-btn" onclick="copyShareLink('${shareUrl}', this)" title="Copy Share Link">
                    <i class="fa-solid fa-link"></i>
                </button>
            </div>
            <div class="card-content">
                <h3>${product.name || 'Untitled Product'}</h3>
                <p class="description">${product.description || 'No description available.'}</p>
                <div class="price-row">
                    <div class="price">${formattedPrice}</div>
                </div>
                <a href="${checkoutLink}" target="_blank" class="buy-btn">
                    Buy Now
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- SHARE BUTTON ---
window.copyShareLink = function(url, btnElement) {
    navigator.clipboard.writeText(url).then(() => {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-check" style="color: #4ade80;"></i>';
        setTimeout(() => { btnElement.innerHTML = originalHTML; }, 2000);
    }).catch(err => alert('Failed to copy link.'));
};

// --- SEARCH ---
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProducts = allProducts.filter(product => {
        const name = (product.name || '').toLowerCase();
        const desc = (product.description || '').toLowerCase();
        return name.includes(searchTerm) || desc.includes(searchTerm);
    });
    renderProducts(filteredProducts);
});

// Start the app
loadProducts();