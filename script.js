/**
 * QuickCart — script.js
 * Author: Student Project
 *
 * This file handles ALL of the dynamic behavior on the page:
 *   1. Fetching products from data.json
 *   2. Rendering product cards into the HTML grid
 *   3. Full shopping cart logic (add, remove, update quantity)
 *   4. Persisting the cart to localStorage so it survives refresh
 *   5. Opening/closing the cart sidebar
 *   6. Showing toast notifications for feedback
 *
 * We use ES6+ features: async/await, arrow functions,
 * template literals, destructuring, and the spread operator.
 */


// =============================================================
// SECTION 1: DOM ELEMENT REFERENCES
// Get all the elements we need to manipulate, up front.
// =============================================================

const productGrid    = document.getElementById('productGrid');
const cartSidebar    = document.getElementById('cartSidebar');
const cartOverlay    = document.getElementById('cartOverlay');
const cartItemsEl    = document.getElementById('cartItems');
const cartCountEl    = document.getElementById('cartCount');
const cartTotalEl    = document.getElementById('cartTotal');
const cartToggleBtn  = document.getElementById('cartToggleBtn');
const cartCloseBtn   = document.getElementById('cartCloseBtn');
const checkoutBtn    = document.getElementById('checkoutBtn');
const toastEl        = document.getElementById('toast');


// =============================================================
// SECTION 2: CART STATE
// We keep the cart as a simple array of objects in memory.
// Each item looks like: { id, name, price, image, quantity }
// =============================================================

// On page load, try to pull the cart from localStorage.
// If nothing is saved yet, start with an empty array.
let cart = JSON.parse(localStorage.getItem('quickcart')) || [];


// =============================================================
// SECTION 3: FETCH & RENDER PRODUCTS
// We use async/await to load data.json, then build the HTML.
// =============================================================

/**
 * Fetches products from data.json and renders them.
 * Called once when the page loads.
 */
async function loadProducts() {
  try {
    const response = await fetch('data.json');

    // If the server returns an error (e.g. 404), throw a real error
    if (!response.ok) {
      throw new Error(`Could not load products (HTTP ${response.status})`);
    }

    const products = await response.json();

    // Clear the "Loading products..." placeholder text
    productGrid.innerHTML = '';

    // Loop through every product and add a card to the grid
    products.forEach(product => {
      const card = createProductCard(product);
      productGrid.appendChild(card);
    });

  } catch (error) {
    // Show a friendly message if something goes wrong
    productGrid.innerHTML = `
      <p class="loading-msg">
         Oops! Couldn't load products. Please try refreshing.<br />
        <small style="color: #999;">(Error: ${error.message})</small>
      </p>
    `;
    console.error('Failed to load products:', error);
  }
}

/**
 * Creates a single product card as a DOM element.
 * Using createElement is safer than innerHTML for repeated items,
 * but using a template literal + innerHTML is simpler to read.
 * We'll use template literals here for clarity.
 *
 * @param {Object} product - One product object from data.json
 * @returns {HTMLElement} - The finished card element
 */
function createProductCard(product) {
  // Create a wrapper div for the card
  const card = document.createElement('div');
  card.classList.add('product-card');

  // Format the price as "$59.99"
  const formattedPrice = formatPrice(product.price);

  // Build the card's inner HTML using a template literal
  card.innerHTML = `
    <div class="product-image-wrapper">
      <img
        src="${product.image}"
        alt="${product.name}"
        loading="lazy"
        onerror="this.src='https://placehold.co/400x300/e8e8f0/6b7280?text=No+Image'"
      />
    </div>
    <div class="product-info">
      <span class="product-category">${product.category}</span>
      <h3 class="product-name">${product.name}</h3>
      <p class="product-description">${product.description}</p>
      <div class="product-footer">
        <span class="product-price">${formattedPrice}</span>
        <button
          class="add-to-cart-btn"
          data-id="${product.id}"
          aria-label="Add ${product.name} to cart"
        >
          Add to Cart
        </button>
      </div>
    </div>
  `;

  // Attach the click handler to the "Add to Cart" button
  // We use querySelector to find the button inside the card we just built
  const btn = card.querySelector('.add-to-cart-btn');
  btn.addEventListener('click', () => addToCart(product));

  return card;
}


// =============================================================
// SECTION 4: CART LOGIC
// The core functions for managing cart state.
// =============================================================

/**
 * Adds a product to the cart.
 * If the product is already in the cart, increases its quantity by 1.
 * After updating state, saves to localStorage and re-renders the cart.
 *
 * @param {Object} product - The product to add
 */
function addToCart(product) {
  // Check if this product is already in the cart
  const existingItem = cart.find(item => item.id === product.id);

  if (existingItem) {
    // Already in cart — just bump the quantity
    existingItem.quantity += 1;
  } else {
    // New item — add it to the cart array with quantity 1
    cart.push({
      id:       product.id,
      name:     product.name,
      price:    product.price,
      image:    product.image,
      quantity: 1,
    });
  }

  // Persist the updated cart and refresh the UI
  saveCart();
  renderCart();

  // Give the user some feedback
  showToast(`✅ "${product.name}" added to cart!`);

  // Animate the cart badge
  cartCountEl.classList.remove('bump');
  // Force reflow so the animation restarts even if triggered rapidly
  void cartCountEl.offsetWidth;
  cartCountEl.classList.add('bump');
}

/**
 * Removes an item from the cart entirely, regardless of quantity.
 *
 * @param {number} productId - The id of the product to remove
 */
function removeFromCart(productId) {
  // Filter creates a new array without the item we want to remove
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
}

/**
 * Changes the quantity of a cart item by a given delta (+1 or -1).
 * If quantity would drop to 0, the item is removed from the cart.
 *
 * @param {number} productId - The id of the item to update
 * @param {number} delta     - How much to change the quantity (+1 or -1)
 */
function updateQuantity(productId, delta) {
  const item = cart.find(item => item.id === productId);

  if (!item) return; // Safety check — shouldn't happen, but good practice

  item.quantity += delta;

  if (item.quantity <= 0) {
    // Remove the item if quantity hits zero
    removeFromCart(productId);
  } else {
    saveCart();
    renderCart();
  }
}

/**
 * Calculates the total number of individual items in the cart.
 * e.g. 2x headphones + 3x mugs = 5 total items
 *
 * @returns {number} Total item count
 */
function getCartItemCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Calculates the total price of everything in the cart.
 *
 * @returns {number} Total price
 */
function getCartTotal() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}


// =============================================================
// SECTION 5: RENDER CART UI
// Rebuilds the cart sidebar HTML from the current cart state.
// Called every time the cart changes.
// =============================================================

/**
 * Re-renders the entire cart sidebar.
 * Updates: item list, item count badge, and total price.
 */
function renderCart() {
  // ── Update the item count badge in the navbar ──
  const totalItems = getCartItemCount();
  cartCountEl.textContent = totalItems;

  // ── Update the total price in the footer ──
  cartTotalEl.textContent = formatPrice(getCartTotal());

  // ── Render the items list ──
  if (cart.length === 0) {
    // Cart is empty — show the empty state message
    cartItemsEl.innerHTML = `
      <p class="empty-cart-msg">Your cart is empty. Go add something! 😊</p>
    `;
    return; // Nothing else to do
  }

  // Build the HTML for all cart items
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img
        class="cart-item-img"
        src="${item.image}"
        alt="${item.name}"
        onerror="this.src='https://placehold.co/65x65/e8e8f0/6b7280?text=?'"
      />
      <div class="cart-item-details">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">${formatPrice(item.price)} each</p>
        <div class="cart-item-qty">
          <button class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-number">${item.quantity}</span>
          <button class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="remove-btn" data-remove="${item.id}" aria-label="Remove ${item.name} from cart">🗑️</button>
    </div>
  `).join(''); // .join('') converts the array of strings into one string

  // ── Attach event listeners to the newly-rendered buttons ──
  // We use event delegation on the parent instead of attaching to each button.
  // This is more efficient and a good practice to know!
  cartItemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id     = parseInt(btn.dataset.id);
      const action = btn.dataset.action;
      updateQuantity(id, action === 'increase' ? +1 : -1);
    });
  });

  cartItemsEl.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.remove);
      removeFromCart(id);
    });
  });
}


// =============================================================
// SECTION 6: LOCALSTORAGE PERSISTENCE
// =============================================================

/**
 * Saves the current cart array to localStorage as a JSON string.
 * This is what makes the cart survive a page refresh!
 */
function saveCart() {
  localStorage.setItem('quickcart', JSON.stringify(cart));
}


// =============================================================
// SECTION 7: CART SIDEBAR TOGGLE
// Open and close the sliding sidebar.
// =============================================================

/** Opens the cart sidebar */
function openCart() {
  cartSidebar.classList.add('is-open');
  // Prevent the page body from scrolling behind the cart
  document.body.style.overflow = 'hidden';
}

/** Closes the cart sidebar */
function closeCart() {
  cartSidebar.classList.remove('is-open');
  // Restore normal page scrolling
  document.body.style.overflow = '';
}


// =============================================================
// SECTION 8: TOAST NOTIFICATION
// A small popup message for user feedback.
// Much better than using alert()!
// =============================================================

let toastTimer; // Store the timeout so we can cancel it if needed

/**
 * Shows a toast notification message for 2.5 seconds.
 *
 * @param {string} message - The text to display in the toast
 */
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');

  // Clear any existing timer so rapid clicks don't stack up
  clearTimeout(toastTimer);

  // Automatically hide the toast after 2.5 seconds
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2500);
}


// =============================================================
// SECTION 9: UTILITY HELPERS
// =============================================================

/**
 * Formats a number as a USD price string.
 * e.g. 59.9 → "$59.90"
 *
 * @param {number} amount - The number to format
 * @returns {string}
 */
function formatPrice(amount) {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
  }).format(amount);
}


// =============================================================
// SECTION 10: EVENT LISTENERS
// Wire up all the buttons and interactions.
// =============================================================

// Open the cart when the navbar cart button is clicked
cartToggleBtn.addEventListener('click', openCart);

// Close the cart when the ✕ button is clicked
cartCloseBtn.addEventListener('click', closeCart);

// Close the cart when the dark overlay is clicked
cartOverlay.addEventListener('click', closeCart);

// Close the cart when the user presses the Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCart();
});

// Checkout button — in a real project this would navigate to a checkout page
checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    showToast('⚠️ Your cart is empty!');
    return;
  }
  alert(`🎉 Thanks for your order! Total: ${formatPrice(getCartTotal())}\n\n(In a real app, you'd go to a checkout page here.)`);
});


// =============================================================
// SECTION 11: INITIALIZE THE APP
// This runs when the page loads. Order matters:
//   1. Render the cart (in case we restored items from localStorage)
//   2. Load and display the products
// =============================================================

renderCart();   // Restore cart state from localStorage immediately
loadProducts(); // Fetch and render the product grid
