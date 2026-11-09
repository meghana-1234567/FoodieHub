
document.addEventListener("DOMContentLoaded", () => {

    // LOADER
    const loader = document.getElementById("loader");

    window.addEventListener("load", () => {
        setTimeout(() => loader?.classList.add("hide"), 700);
    });

    setTimeout(() => loader?.classList.add("hide"), 2500);


    // LOGIN / REGISTER MODAL
    const authModal = document.getElementById("authModal");
    const closeModal = document.getElementById("closeModal");

    const loginTab = document.getElementById("loginTab");
    const registerTab = document.getElementById("registerTab");

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");

    function showModal() {
        authModal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function hideModal() {
        authModal.classList.remove("show");
        document.body.style.overflow = "";
    }

    const justSignedIn = new URLSearchParams(window.location.search).has("welcome");
    if (justSignedIn) {
        window.history.replaceState(null, "", window.location.pathname);
    } else {
        setTimeout(showModal, 1200);
    }

    closeModal.addEventListener("click", hideModal);

    authModal.addEventListener("click", event => {
        if (event.target === authModal) hideModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") hideModal();
    });

    function switchAuth(type) {
        const isLogin = type === "login";

        loginForm.classList.toggle("hidden", !isLogin);
        registerForm.classList.toggle("hidden", isLogin);

        loginTab.classList.toggle("active", isLogin);
        registerTab.classList.toggle("active", !isLogin);

        authTitle.textContent = isLogin ? "Welcome Back!" : "Create Account";
        authSubtitle.textContent = isLogin
            ? "Sign in to enjoy delicious food."
            : "Join FoodieHub and discover amazing food.";
    }

    loginTab.addEventListener("click", () => switchAuth("login"));
    registerTab.addEventListener("click", () => switchAuth("register"));

    document.getElementById("switchRegister").addEventListener("click", e => {
        e.preventDefault();
        switchAuth("register");
    });

    document.getElementById("switchLogin").addEventListener("click", e => {
        e.preventDefault();
        switchAuth("login");
    });


    // TOAST MESSAGE
    const toast = document.getElementById("toast");
    let toastTimer;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }


    // AUTHENTICATION
    const authApiBase = window.location.port === "5500" &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "http://127.0.0.1:5000"
        : "";

    async function submitAuthForm(event, endpoint, form, onSuccess) {
        event.preventDefault();
        const submitButton = form.querySelector("button[type='submit']");
        submitButton.disabled = true;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Authentication failed.");

            onSuccess(result);
        } catch (error) {
            showToast(error.message || "Unable to connect to the server.");
        } finally {
            submitButton.disabled = false;
        }
    }

    loginForm.addEventListener("submit", event => {
        submitAuthForm(event, `${authApiBase}/api/auth/login`, loginForm, result =>
        {
            loginForm.reset();
            hideModal();
            showToast(`Welcome back, ${result.user.name}!`);
        });
    });

    registerForm.addEventListener("submit", event => {
        submitAuthForm(event, `${authApiBase}/api/auth/register`, registerForm, result => {
            registerForm.reset();
            switchAuth("login");
            loginForm.querySelector("[name='email']").value = result.user.email;
            showToast("Registration successful! Your account has been saved. Please sign in.");
        });
    });


    // MENU FILTER
    const filterButtons = document.querySelectorAll(".filter-btn");
    const foodCards = document.querySelectorAll(".food-card");

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {

            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const filter = button.dataset.filter;

            foodCards.forEach(card => {
                const matches = filter === "all" ||
                    card.dataset.category === filter;

                card.classList.toggle("hide", !matches);
            });
        });
    });


    // SHOPPING CART
    let cart = [];

    try {
        cart = JSON.parse(localStorage.getItem("foodiehubCart")) || [];
        if (!Array.isArray(cart)) cart = [];
    } catch {
        cart = [];
    }

    const cartItems = document.getElementById("cartItems");
    const cartCount = document.getElementById("cartCount");
    const cartTotal = document.getElementById("cartTotal");

    function saveCart() {
        localStorage.setItem("foodiehubCart", JSON.stringify(cart));
        renderCart();
    }

    function renderCart() {

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        const totalPrice = cart.reduce(
            (sum, item) => sum + item.price * item.quantity, 0
        );

        cartCount.textContent = totalItems;
        cartTotal.textContent = "₹" + totalPrice;

        if (cart.length === 0) {
            cartItems.innerHTML =
                '<p class="empty-cart">Your cart is empty. Add something delicious! 🍕</p>';
            return;
        }

        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div>
                    <h3>${escapeHTML(item.name)}</h3>
                    <p>₹${item.price} × ${item.quantity}</p>
                </div>

                <div class="quantity-controls">
                    <button data-action="minus" data-index="${index}">−</button>
                    <span>${item.quantity}</span>
                    <button data-action="plus" data-index="${index}">+</button>
                    <button class="remove-btn" data-action="remove"
                        data-index="${index}">Remove</button>
                </div>
            </div>
        `).join("");
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    document.querySelectorAll(".add-btn").forEach(button => {
        button.addEventListener("click", () => {

            const name = button.dataset.name;
            const price = Number(button.dataset.price);

            const existing = cart.find(item => item.name === name);

            if (existing) {
                existing.quantity++;
            } else {
                cart.push({ name, price, quantity: 1 });
            }

            saveCart();
            showToast(name + " added to cart! 🛒");
        });
    });

    cartItems.addEventListener("click", event => {

        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const index = Number(button.dataset.index);
        const action = button.dataset.action;

        if (!cart[index]) return;

        if (action === "plus") cart[index].quantity++;
        if (action === "minus") cart[index].quantity--;

        if (action === "remove" || cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }

        saveCart();
    });

    document.getElementById("checkoutBtn").addEventListener("click", () => {
        if (cart.length === 0) {
            showToast("Please add items to your cart first!");
            return;
        }

        showToast("Checkout demo! Payment integration is not configured.");
    });

    renderCart();


    // CONTACT FORM
    document.getElementById("contactForm").addEventListener("submit", event => {
        event.preventDefault();

        showToast("Thank you! Your demo message was submitted.");
        event.target.reset();
    });

});
