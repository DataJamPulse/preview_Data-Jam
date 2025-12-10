/**
 * Data Jam - Premium Interactions & Animations
 * The smoothest, most premium OOH website experience
 */

(function() {
    'use strict';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        initSplashScreen();
        initCustomCursor();
        initParticles();
        initScrollProgress();
        initScrollAnimations();
        initCounterAnimations();
        initStaggerAnimations();
        initMagneticButtons();
        initTiltCards();
        initSmoothReveal();
        initParallaxElements();
        initLiveCounter();
        initROICalculator();
    }

    /**
     * Splash screen intro animation
     */
    function initSplashScreen() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;

        const body = document.body;

        // Always show splash on every visit
        body.classList.add('splash-active');
        splash.addEventListener('click', dismissSplash);
        setTimeout(dismissSplash, 5500);

        function dismissSplash() {
            if (splash.classList.contains('fade-out')) return;
            splash.classList.add('fade-out');
            body.classList.remove('splash-active');
            setTimeout(() => splash.remove(), 1000);
        }
    }

    /**
     * Custom cursor with hover effects
     */
    function initCustomCursor() {
        // Don't init on touch devices
        if ('ontouchstart' in window) return;

        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);

        const cursorDot = document.createElement('div');
        cursorDot.className = 'custom-cursor-dot';
        document.body.appendChild(cursorDot);

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Dot follows immediately
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        });

        // Smooth cursor follow
        function animateCursor() {
            const dx = mouseX - cursorX;
            const dy = mouseY - cursorY;

            cursorX += dx * 0.15;
            cursorY += dy * 0.15;

            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover effect on interactive elements
        const hoverElements = document.querySelectorAll('a, button, .btn, .blog-card, .feature, .stat-card-large, .use-case, .faq-item');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
        });

        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
            cursorDot.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            cursor.style.opacity = '1';
            cursorDot.style.opacity = '1';
        });
    }

    /**
     * Floating particles background
     */
    function initParticles() {
        const container = document.createElement('div');
        container.className = 'particles-container';
        document.body.appendChild(container);

        const particleCount = 20;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Random position
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';

            // Random size
            const size = Math.random() * 4 + 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            // Random animation duration and delay
            particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
            particle.style.animationDelay = (Math.random() * 10) + 's';

            container.appendChild(particle);
        }
    }

    /**
     * Scroll progress indicator
     */
    function initScrollProgress() {
        const progress = document.createElement('div');
        progress.className = 'scroll-progress';
        document.body.appendChild(progress);

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            progress.style.width = scrollPercent + '%';
        });
    }

    /**
     * Scroll-triggered animations using Intersection Observer
     */
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        if (!animatedElements.length) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            animatedElements.forEach(el => el.classList.add('is-visible'));
            return;
        }

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        animatedElements.forEach(el => observer.observe(el));
    }

    /**
     * Stagger animations for child elements
     */
    function initStaggerAnimations() {
        const staggerContainers = document.querySelectorAll('.stagger-children');
        if (!staggerContainers.length) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -30px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const children = entry.target.querySelectorAll('.animate-on-scroll');
                    children.forEach((child, index) => {
                        setTimeout(() => {
                            child.classList.add('is-visible');
                        }, index * 100);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        staggerContainers.forEach(container => observer.observe(container));
    }

    /**
     * Animated number counters - supports integers and decimals
     */
    function initCounterAnimations() {
        const counters = document.querySelectorAll('.count-up');
        if (!counters.length) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.3
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const targetStr = counter.getAttribute('data-target');
                    const target = parseFloat(targetStr);
                    const suffix = counter.getAttribute('data-suffix') || '';
                    const prefix = counter.getAttribute('data-prefix') || '';
                    const decimals = targetStr.includes('.') ? targetStr.split('.')[1].length : 0;
                    const duration = prefersReducedMotion ? 0 : 2000;

                    animateCounter(counter, target, prefix, suffix, decimals, duration);
                    observer.unobserve(counter);
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(element, target, prefix, suffix, decimals, duration) {
        if (duration === 0) {
            element.textContent = prefix + formatNumber(target, decimals) + suffix;
            return;
        }

        const startTime = performance.now();
        const startValue = 0;

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (target - startValue) * easeOut;

            element.textContent = prefix + formatNumber(currentValue, decimals) + suffix;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = prefix + formatNumber(target, decimals) + suffix;
            }
        }

        requestAnimationFrame(updateCounter);
    }

    function formatNumber(num, decimals) {
        if (decimals > 0) {
            return num.toFixed(decimals);
        }
        return Math.floor(num).toString();
    }

    /**
     * Magnetic button effect
     */
    function initMagneticButtons() {
        const buttons = document.querySelectorAll('.btn');

        buttons.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0, 0)';
            });
        });
    }

    /**
     * 3D tilt effect on cards
     */
    function initTiltCards() {
        const cards = document.querySelectorAll('.stat-card-large, .blog-card, .feature');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            });
        });
    }

    /**
     * Smooth reveal for text elements
     */
    function initSmoothReveal() {
        const reveals = document.querySelectorAll('.text-reveal');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        reveals.forEach(el => observer.observe(el));
    }

    /**
     * Parallax effect on scroll
     */
    function initParallaxElements() {
        const parallaxElements = document.querySelectorAll('.parallax');

        if (!parallaxElements.length) return;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;

            parallaxElements.forEach(el => {
                const speed = el.getAttribute('data-parallax-speed') || 0.5;
                const rect = el.getBoundingClientRect();

                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    const yPos = (scrollY - el.offsetTop) * speed;
                    el.style.transform = `translateY(${yPos}px)`;
                }
            });
        });
    }

    /**
     * Live impressions counter - simulated with realistic growth
     */
    function initLiveCounter() {
        const counter = document.getElementById('liveCounter');
        if (!counter) return;

        // Start with a base number that grows throughout the day
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsSinceMidnight = Math.floor((now - startOfDay) / 1000);

        // Base impressions rate: ~100 per second average, with variation
        let baseCount = secondsSinceMidnight * 85;
        let currentCount = baseCount;

        function formatNumber(num) {
            return num.toLocaleString('en-US');
        }

        function updateCounter() {
            // Add random increment (60-140 per second to simulate real traffic)
            const increment = Math.floor(Math.random() * 80) + 60;
            currentCount += increment;
            counter.textContent = formatNumber(currentCount);
        }

        // Initial display
        counter.textContent = formatNumber(currentCount);

        // Update every second
        setInterval(updateCounter, 1000);
    }

    /**
     * ROI Calculator interactivity
     */
    function initROICalculator() {
        const numSites = document.getElementById('numSites');
        const avgRevenue = document.getElementById('avgRevenue');
        const undervalued = document.getElementById('undervalued');

        if (!numSites || !avgRevenue || !undervalued) return;

        const numSitesValue = document.getElementById('numSitesValue');
        const avgRevenueValue = document.getElementById('avgRevenueValue');
        const undervaluedValue = document.getElementById('undervaluedValue');
        const currentRevenue = document.getElementById('currentRevenue');
        const additionalRevenue = document.getElementById('additionalRevenue');
        const totalRevenue = document.getElementById('totalRevenue');

        function formatCurrency(num) {
            return '$' + num.toLocaleString('en-US');
        }

        function calculateROI() {
            const sites = parseInt(numSites.value);
            const revenue = parseInt(avgRevenue.value);
            const underval = parseInt(undervalued.value) / 100;

            const annualCurrent = sites * revenue * 12;
            const additionalAnnual = annualCurrent * underval;
            const totalAnnual = annualCurrent + additionalAnnual;

            numSitesValue.textContent = sites;
            avgRevenueValue.textContent = revenue.toLocaleString('en-US');
            undervaluedValue.textContent = undervalued.value;
            currentRevenue.textContent = formatCurrency(annualCurrent);
            additionalRevenue.textContent = formatCurrency(Math.round(additionalAnnual));
            totalRevenue.textContent = formatCurrency(Math.round(totalAnnual));
        }

        // Initial calculation
        calculateROI();

        // Add event listeners
        numSites.addEventListener('input', calculateROI);
        avgRevenue.addEventListener('input', calculateROI);
        undervalued.addEventListener('input', calculateROI);
    }

})();
