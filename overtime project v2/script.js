/**
 * Main JavaScript File
 * Handles interactive functionality only - no DOM creation
 */

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Show a notification message to the user
 */
function showNotification(message, duration = 2500) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ===================================
// SLIDESHOW FUNCTIONALITY
// ===================================

/**
 * Initialize slideshow for a product card
 */
function initializeSlideshow(card) {
    const slidesContainer = card.querySelector('.slideshow-slides');
    const slides = card.querySelectorAll('.slideshow-slide');
    const dots = card.querySelectorAll('.slideshow-dot');

    if (slides.length <= 1) return; // No slideshow needed for single image

    let currentSlide = 0;
    let autoSlideInterval = null;
    let touchStartX = 0;
    let touchEndX = 0;

    function goToSlide(index) {
        currentSlide = index;

        // Update slide positions
        slides.forEach((slide, i) => {
            slide.style.transform = `translateX(${(i - currentSlide) * 100}%)`;
        });

        // Update dot indicators
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    }

    function nextSlide() {
        const nextIndex = (currentSlide + 1) % slides.length;
        goToSlide(nextIndex);
    }

    function prevSlide() {
        const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
        goToSlide(prevIndex);
    }

    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 2000);
    }

    function stopAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
        }
    }

    // Event listeners for hover behavior
    card.addEventListener('mouseenter', startAutoSlide);
    card.addEventListener('mouseleave', () => {
        stopAutoSlide();
        goToSlide(0); // Reset to first slide
    });

    // Event listeners for dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            stopAutoSlide();
            goToSlide(index);
        });
    });

    // Click on slideshow to navigate (next slide on click)
    slidesContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopAutoSlide();
        nextSlide();
    });

    // Touch events for swipe on mobile
    slidesContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    slidesContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        stopAutoSlide();
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance to register as swipe
        const difference = touchStartX - touchEndX;

        if (Math.abs(difference) > swipeThreshold) {
            if (difference > 0) {
                // Swiped left - next slide
                nextSlide();
            } else {
                // Swiped right - previous slide
                prevSlide();
            }
        }
    }
}

// ===================================
// ADD TO CART FUNCTIONALITY
// ===================================

/**
 * Handle add to cart button click
 */
function handleAddToCart(button) {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get product info from data attributes
        const productId = button.dataset.productId;
        const productTitle = button.dataset.productTitle;
        const productPrice = parseFloat(button.dataset.productPrice);

        // Add visual feedback
        button.classList.add('added');
        const textSpan = button.querySelector('.add-to-cart-text');
        const originalText = textSpan.textContent;
        textSpan.textContent = 'Added!';

        // Log to console (replace with actual cart logic)
        console.log('Added to cart:', {
            id: productId,
            title: productTitle,
            price: productPrice
        });

        // Show notification
        showNotification(`${productTitle} added to cart!`);

        // Add to cart
        Cart.add({
            id: productId,
            title: productTitle,
            price: productPrice
        });

        // Reset button after delay
        setTimeout(() => {
            button.classList.remove('added');
            textSpan.textContent = originalText;
        }, 2000);
    });
}


// ===================================
// LIKE BUTTON FUNCTIONALITY
// ===================================

/**
 * Handle like button click
 */
function handleLikeButton(button) {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const productId = button.dataset.productId;
        const counterSpan = button.querySelector('.like-counter');
        const isLiked = button.classList.contains('liked');

        if (isLiked) {
            // Unlike the product
            button.classList.remove('liked');
            Likes.remove(productId);
            console.log('Unliked product:', productId);
        } else {
            // Like the product
            button.classList.add('liked');
            Likes.add(productId);
            console.log('Liked product:', productId);

            // Add a subtle animation
            button.style.animation = 'none';
            setTimeout(() => {
                button.style.animation = 'pulse 0.3s ease';
            }, 10);
        }

        // Update counter display
        const count = Likes.getCount(productId);
        counterSpan.textContent = count;
    });
}

// ===================================
// LIKES MANAGEMENT
// ===================================

const Likes = {
    items: {}, // Changed to object to store counts

    add(productId) {
        if (!this.items[productId]) {
            this.items[productId] = 0;
        }
        this.items[productId] += 1;
        this.save();
    },

    remove(productId) {
        if (this.items[productId]) {
            this.items[productId] -= 1;
            if (this.items[productId] <= 0) {
                delete this.items[productId];
            }
        }
        this.save();
    },

    has(productId) {
        return this.items[productId] && this.items[productId] > 0;
    },

    getCount(productId) {
        return this.items[productId] || 0;
    },

    save() {
        localStorage.setItem('likes', JSON.stringify(this.items));
    },

    load() {
        const saved = localStorage.getItem('likes');
        if (saved) {
            try {
                this.items = JSON.parse(saved);
            } catch (e) {
                this.items = {};
            }
        }
    }
};


// ===================================
// CART MANAGEMENT
// ===================================

const Cart = {
    items: [],

    add(product) {
        const existingItem = this.items.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
        }

        this.save();
        console.log('Cart updated:', this.items);
    },

    getCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    save() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    },

    load() {
        const saved = localStorage.getItem('cart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
    }
};

// ===================================
// INITIALIZATION
// ===================================

/**
 * Initialize all product cards
 */
function init() {
    // Load cart and likes from storage
    Cart.load();
    Likes.load();

    // Get all product cards
    const cards = document.querySelectorAll('.card-gallery');

    // Initialize each card
    cards.forEach(card => {
        // Initialize slideshow
        initializeSlideshow(card);

        // Initialize add to cart button
        const addButton = card.querySelector('.quick-add__button');
        if (addButton) {
            handleAddToCart(addButton);
        }

        // Initialize like button
        const likeButton = card.querySelector('.like-button');
        if (likeButton) {
            handleLikeButton(likeButton);

            // Restore liked state and count from localStorage
            const productId = likeButton.dataset.productId;
            const counterSpan = likeButton.querySelector('.like-counter');
            
            // Set the counter display
            const count = Likes.getCount(productId);
            counterSpan.textContent = count;
            
            // Set liked state if user has liked this product
            if (Likes.has(productId)) {
                likeButton.classList.add('liked');
            }
        }
    });

    console.log('Product gallery initialized with', cards.length, 'products');
}

// Run initialization when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


