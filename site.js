document.addEventListener("DOMContentLoaded", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealTargets = document.querySelectorAll(
        ".reveal, .section-heading, .category-card, .food-card, .about-image, .about-content, " +
        ".feature-card, .review-card, .contact-form, .faq-item, .cart-container, " +
        ".policy-card, .login-card"
    );

    document.querySelectorAll(".navbar").forEach(navbar => {
        const toggle = navbar.querySelector(".menu-toggle");
        const nav = navbar.querySelector("nav");
        if (!toggle || !nav) return;

        toggle.setAttribute("aria-controls", nav.id);
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", () => {
            const isOpen = nav.classList.toggle("open");
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.textContent = isOpen ? "×" : "☰";
        });

        nav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                nav.classList.remove("open");
                toggle.setAttribute("aria-expanded", "false");
                toggle.textContent = "☰";
            });

            const currentPage = window.location.pathname.split("/").pop() || "index.html";
            const linkPage = new URL(link.href, window.location.href).pathname.split("/").pop();
            if (linkPage === currentPage) link.setAttribute("aria-current", "page");
        });

        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") return;
            nav.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.textContent = "☰";
        });
    });

    document.querySelectorAll(".footer-bottom [data-current-year]").forEach(year => {
        year.textContent = String(new Date().getFullYear());
    });

    try {
        const cart = JSON.parse(localStorage.getItem("foodiehubCart") || "[]");
        const count = Array.isArray(cart)
            ? cart.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0)
            : 0;
        document.querySelectorAll("#cartCount").forEach(counter => {
            counter.textContent = String(count);
        });
    } catch (error) {
        console.error("Unable to read the saved FoodieHub cart.", error);
    }

    document.querySelectorAll("img").forEach(image => {
        image.decoding = "async";
        if (!image.closest(".hero")) image.loading = "lazy";
    });

    if (!reducedMotion && "IntersectionObserver" in window) {
        document.body.classList.add("motion-ready");
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("show");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

        revealTargets.forEach(element => {
            element.classList.add("reveal");
            observer.observe(element);
        });
    } else {
        revealTargets.forEach(element => element.classList.add("show"));
    }
});
