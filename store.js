const STORAGE_KEY = "yueyan-boutique-cart";
const ORDERS_KEY = "yueyan-boutique-orders";
const SUPPORT_LINKS = {
  telegram: "https://t.me/your_yueyan_support",
  whatsapp: "https://wa.me/00000000000",
  email: "mailto:hello@yueyanboutique.com",
};
const LOCAL_PRODUCTS = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
let activeProducts = LOCAL_PRODUCTS;

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

function loadState(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let cart = loadState(STORAGE_KEY, []);

function getProduct(id) {
  return activeProducts.find((product) => product.id === id);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getShipping() {
  return cart.length === 0 ? 0 : getCartSubtotal() >= 180 ? 0 : 18;
}

function persistCart() {
  saveState(STORAGE_KEY, cart);
}

function syncCartCount() {
  const countEl = document.getElementById("cartCount");
  if (countEl) {
    countEl.textContent = String(getCartCount());
  }
}

function renderCartDrawer() {
  const cartItems = document.getElementById("cartItems");
  const subtotal = document.getElementById("cartSubtotal");
  if (!cartItems || !subtotal) {
    return;
  }

  if (cart.length === 0) {
    cartItems.innerHTML = `<p class="empty-state">Ваша корзина пуста. Добавьте товары из каталога, чтобы продолжить.</p>`;
  } else {
    cartItems.innerHTML = cart
      .map(
        (item) => `
          <div class="cart-item">
            <div class="cart-item__info">
              <h3>${item.name}</h3>
              <p class="cart-item__meta">${item.brand}</p>
              <div class="cart-item__actions">
                <button class="qty-button" type="button" data-action="decrease" data-id="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button class="qty-button" type="button" data-action="increase" data-id="${item.id}">+</button>
                <button class="remove-link" type="button" data-action="remove" data-id="${item.id}">Удалить</button>
              </div>
            </div>
            <strong class="cart-item__price">${formatMoney(item.price * item.quantity)}</strong>
          </div>
        `
      )
      .join("");
  }

  subtotal.textContent = formatMoney(getCartSubtotal());
  syncCartCount();
}

function openCart() {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  if (!drawer || !backdrop) {
    return;
  }
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.classList.add("no-scroll");
}

function closeCart() {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  if (!drawer || !backdrop) {
    return;
  }
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  document.body.classList.remove("no-scroll");
}

function addToCart(id, quantity = 1) {
  const product = getProduct(id);
  if (!product) {
    return;
  }
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      quantity,
    });
  }
  persistCart();
  renderCartDrawer();
  renderCheckoutSummary();
  openCart();
}

function updateCartItem(id, delta) {
  cart = cart
    .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
    .filter((item) => item.quantity > 0);
  persistCart();
  renderCartDrawer();
  renderCheckoutSummary();
}

function removeCartItem(id) {
  cart = cart.filter((item) => item.id !== id);
  persistCart();
  renderCartDrawer();
  renderCheckoutSummary();
}

function cardMarkup(product) {
  return `
    <article class="product-card">
      <a href="./product.html?id=${encodeURIComponent(product.id)}">
        <div class="product-card__media product-card__media--${product.visual}">
          <img class="product-packshot" src="${product.image}" alt="${product.name}" loading="lazy" />
          <span class="product-card__badge">${product.badge}</span>
        </div>
      </a>
      <div class="product-card__body">
        <p class="product-card__meta">${product.brand} • ${product.category}</p>
        <h3><a href="./product.html?id=${encodeURIComponent(product.id)}">${product.name}</a></h3>
        <p class="product-card__line">${product.line} · ${product.volume}</p>
        <p class="product-card__copy">${product.description}</p>
        <div class="product-card__footer">
          <strong>${formatMoney(product.price)}</strong>
          <button class="button button--primary button--small add-to-cart" type="button" data-id="${product.id}">
            В корзину
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderFeaturedProducts() {
  const container = document.getElementById("featuredProducts");
  if (!container) {
    return;
  }
  const featuredProducts = activeProducts.filter((product) => product.featured).slice(0, 8);
  const productsToRender = featuredProducts.length ? featuredProducts : activeProducts.slice(0, 8);
  container.innerHTML = productsToRender.map(cardMarkup).join("");
}

function filterProducts(products, params, activeFilter) {
  const search = (params.get("q") || "").trim().toLowerCase();
  const brand = params.get("brand");
  const category = params.get("category");
  const tag = params.get("tag");

  return products.filter((product) => {
    const matchesSearch =
      !search ||
      [product.name, product.brand, product.category, ...product.tags]
        .join(" ")
        .toLowerCase()
        .includes(search);
    const matchesBrand = !brand || product.brand === brand;
    const matchesCategory = !category || product.category === category;
    const matchesTag = !tag || product.tags.includes(tag);
    const matchesActive =
      !activeFilter ||
      activeFilter === "all" ||
      product.brand === activeFilter ||
      product.category === activeFilter ||
      product.tags.includes(activeFilter.toLowerCase());
    return matchesSearch && matchesBrand && matchesCategory && matchesTag && matchesActive;
  });
}

function renderCatalog(activeFilter = "all") {
  const container = document.getElementById("catalogProducts");
  const title = document.getElementById("catalogTitle");
  const meta = document.getElementById("catalogMeta");
  const empty = document.getElementById("catalogEmpty");
  const searchInput = document.getElementById("catalogSearchInput");
  if (!container || !title || !meta || !empty) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const search = params.get("q") || "";
  if (searchInput && search) {
    searchInput.value = search;
  }

  const results = filterProducts(activeProducts, params, activeFilter);
  title.textContent = search ? `Результаты по запросу "${search}"` : "Каталог косметики";
  meta.textContent = `Показано товаров: ${results.length}`;

  container.innerHTML = results.map(cardMarkup).join("");
  empty.hidden = results.length !== 0;
}

function renderProductPage() {
  const detail = document.getElementById("productDetail");
  const related = document.getElementById("relatedProducts");
  if (!detail) {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const product = getProduct(params.get("id"));
  const fallback = PRODUCTS[0];
  const item = product || fallback;
  let qty = 1;

  detail.innerHTML = `
    <div class="product-detail__media product-card__media product-card__media--${item.visual}">
      <img class="product-packshot product-packshot--detail" src="${item.image}" alt="${item.name}" />
      <span class="product-card__badge">${item.badge}</span>
    </div>
    <div class="product-detail__panel">
      <p class="product-detail__brand">${item.brand} • ${item.category}</p>
      <h1>${item.name}</h1>
      <p class="product-detail__line">${item.line} · ${item.subcategory} · ${item.volume}</p>
      <p class="product-detail__copy">${item.description}</p>
      <div class="product-detail__price-row">
        <strong class="product-detail__price">${formatMoney(item.price)}</strong>
        <span class="product-detail__badge">${item.tags.includes("new") ? "Новинка" : "Рекомендация бутика"}</span>
      </div>
      <ul class="product-detail__specs">
        ${item.shades.length ? `<li><strong>Оттенки:</strong> ${item.shades.join(", ")}</li>` : ""}
        <li><strong>Способ применения:</strong> ${item.howToUse}</li>
        ${item.details.map((line) => `<li>${line}</li>`).join("")}
      </ul>
      <div class="product-detail__actions">
        <div class="qty-control">
          <button type="button" id="qtyDown">-</button>
          <strong id="qtyValue">1</strong>
          <button type="button" id="qtyUp">+</button>
        </div>
        <button class="button button--primary" id="productAddToCart" type="button">В корзину</button>
      </div>
      <a class="product-detail__official" href="${item.officialUrl}" target="_blank" rel="noreferrer">Официальная страница бренда</a>
    </div>
  `;

  const qtyValue = document.getElementById("qtyValue");
  document.getElementById("qtyDown").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    qtyValue.textContent = String(qty);
  });
  document.getElementById("qtyUp").addEventListener("click", () => {
    qty += 1;
    qtyValue.textContent = String(qty);
  });
  document.getElementById("productAddToCart").addEventListener("click", () => addToCart(item.id, qty));

  if (related) {
    related.innerHTML = activeProducts.filter((productItem) => productItem.id !== item.id)
      .slice(0, 3)
      .map(cardMarkup)
      .join("");
  }
}

function normalizeSanityProduct(product) {
  return {
    id: product.slug || product._id,
    name: product.name || "Untitled product",
    brand: product.brand || "YUEYAN BOUTIQUE",
    line: product.line || "",
    category: product.category || "Каталог",
    subcategory: product.subcategory || "",
    price: Number(product.price || 0),
    badge: product.badge || "Бутик",
    visual: product.visual || "sensai",
    image: product.image || "./assets/sensai-wash.svg",
    volume: product.volume || "",
    shades: product.shades || [],
    tags: product.tags || [],
    description: product.description || "",
    howToUse: product.howToUse || "",
    details: product.details || [],
    officialUrl: product.officialUrl || "#",
    featured: Boolean(product.featured),
  };
}

async function fetchSanityProducts() {
  const config = window.SANITY_CONFIG;
  if (!config?.enabled || !config.projectId || config.projectId === "YOUR_SANITY_PROJECT_ID") {
    return null;
  }

  const query = `*[_type == "product" && published == true] | order(brand asc, name asc) {
    _id,
    name,
    "slug": slug.current,
    brand,
    line,
    category,
    subcategory,
    price,
    badge,
    visual,
    "image": mainImage.asset->url,
    volume,
    shades,
    tags,
    description,
    howToUse,
    details,
    officialUrl,
    featured
  }`;
  const encodedQuery = encodeURIComponent(query);
  const url = `https://${config.projectId}.apicdn.sanity.io/v${config.apiVersion}/data/query/${config.dataset}?query=${encodedQuery}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Sanity request failed: ${response.status}`);
  }

  const payload = await response.json();
  return (payload.result || []).map(normalizeSanityProduct);
}

async function loadProducts() {
  try {
    const sanityProducts = await fetchSanityProducts();
    if (sanityProducts?.length) {
      activeProducts = sanityProducts;
    }
  } catch (error) {
    console.warn("Sanity products unavailable, using local products.", error);
    activeProducts = LOCAL_PRODUCTS;
  }
}

function renderCheckoutSummary() {
  const container = document.getElementById("checkoutSummary");
  if (!container) {
    return;
  }

  const shipping = getShipping();
  const total = getCartSubtotal() + shipping;
  const lines =
    cart.length === 0
      ? `<p class="empty-state">Ваша корзина пуста. Добавьте товары из каталога перед оформлением заказа.</p>`
      : cart
          .map(
            (item) => `
              <div class="checkout-summary__row">
                <span>${item.name} × ${item.quantity}</span>
                <strong>${formatMoney(item.price * item.quantity)}</strong>
              </div>
            `
          )
          .join("");

  container.innerHTML = `
    ${lines}
    <div class="checkout-summary__row">
      <span>Сумма товаров</span>
      <strong>${formatMoney(getCartSubtotal())}</strong>
    </div>
    <div class="checkout-summary__row">
      <span>Доставка</span>
      <strong>${shipping === 0 ? "Бесплатно" : formatMoney(shipping)}</strong>
    </div>
    <div class="checkout-summary__row checkout-summary__total">
      <span>Итоговая сумма</span>
      <strong>${formatMoney(total)}</strong>
    </div>
  `;
}

function setupCheckoutForm() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (cart.length === 0) {
      openCart();
      return;
    }

    const order = {
      submittedAt: new Date().toISOString(),
      customer: Object.fromEntries(new FormData(form).entries()),
      cart,
      totals: {
        subtotal: getCartSubtotal(),
        shipping: getShipping(),
        total: getCartSubtotal() + getShipping(),
      },
    };

    const savedOrders = loadState(ORDERS_KEY, []);
    savedOrders.push(order);
    saveState(ORDERS_KEY, savedOrders);
    alert("Заявка на заказ сохранена в этом браузере. Следующий шаг — подключить онлайн-оплату и уведомления.");
    cart = [];
    persistCart();
    form.reset();
    renderCartDrawer();
    renderCheckoutSummary();
  });
}

function setupGlobalHandlers() {
  document.getElementById("cartToggle")?.addEventListener("click", openCart);
  document.getElementById("cartClose")?.addEventListener("click", closeCart);
  document.getElementById("cartBackdrop")?.addEventListener("click", closeCart);

  document.getElementById("cartItems")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const { action, id } = target.dataset;
    if (!action || !id) {
      return;
    }
    if (action === "increase") {
      updateCartItem(id, 1);
    }
    if (action === "decrease") {
      updateCartItem(id, -1);
    }
    if (action === "remove") {
      removeCartItem(id);
    }
  });

  document.body.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest(".add-to-cart");
    if (button instanceof HTMLElement && button.dataset.id) {
      addToCart(button.dataset.id);
    }
  });
}

function setupCatalogFilters() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      renderCatalog(button.dataset.filter);
    });
  });
}

function renderSupportWidget() {
  if (document.getElementById("supportWidget")) {
    return;
  }

  const widget = document.createElement("aside");
  widget.className = "support-widget";
  widget.id = "supportWidget";
  widget.innerHTML = `
    <button class="support-widget__toggle" id="supportToggle" type="button" aria-expanded="false">
      <span>Помощь</span>
      <strong>?</strong>
    </button>
    <div class="support-widget__panel" id="supportPanel" hidden>
      <p class="support-widget__eyebrow">Онлайн-консультант</p>
      <h2>Нужна помощь с выбором?</h2>
      <p>Напишите нам, и мы поможем подобрать уход, оттенок или оформить заказ.</p>
      <div class="support-widget__links">
        <a href="${SUPPORT_LINKS.telegram}" target="_blank" rel="noreferrer">Telegram</a>
        <a href="${SUPPORT_LINKS.whatsapp}" target="_blank" rel="noreferrer">WhatsApp</a>
        <a href="${SUPPORT_LINKS.email}">Email</a>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  const toggle = document.getElementById("supportToggle");
  const panel = document.getElementById("supportPanel");
  toggle.addEventListener("click", () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });
}

async function initPage() {
  await loadProducts();
  renderCartDrawer();
  renderSupportWidget();
  setupGlobalHandlers();

  const page = document.body.dataset.page;
  if (page === "home") {
    renderFeaturedProducts();
  }
  if (page === "catalog") {
    renderCatalog();
    setupCatalogFilters();
  }
  if (page === "product") {
    renderProductPage();
  }
  if (page === "checkout") {
    renderCheckoutSummary();
    setupCheckoutForm();
  }
}

initPage();
