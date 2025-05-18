/*========================== Startup ============================*/
window.addEventListener('DOMContentLoaded', handleRoute);
window.addEventListener('popstate',         handleRoute);

/*========================== Page Loading And Routing ============================*/
const routes = {
    'pages/home.html': {
        onEnter: () => {
            addSocialFooter();
            startTypingEffect();
            splashScreen();
            window.addEventListener('resize', resizeSplashImages);

        },
        onExit: () => {
            removeSocialFooter();
            stopTypingEffect();
            window.removeEventListener('resize', resizeSplashImages);
        }
    },
    'pages/projects.html': {
        onEnter: () => {
            window.loadProjectCards();
            window.attachModalHandlers();
        },
        onExit: () => { window.detachModalHandlers(); }
    },
    'project-:id': {
        redirectTo: 'pages/projects.html',
        onEnter: async (params) => {
            await window.loadProjectCards();
            window.attachModalHandlers();
            document.addEventListener('keydown', attachModalHandlers);
            await window.openProject(params.id);
        },
        onExit: () => { window.detachModalHandlers(); }
    },
    'pages/photography.html': {
        onEnter: loadGalleryGroups,
        onExit: null
    },
    'gallery-:tag': {
        redirectTo: 'pages/photography.html',
        onEnter: async (params) => {
            console.log("Gallery on enter");
            await loadGalleryGroups();
            showGallery(params.tag);
        },
        onExit: null
    },
    'pages/about.html': {
        onEnter: () => {
            window.addEventListener('resize', onResize);
            initExperienceSection();
        },
        onExit: () => {
            window.removeEventListener('resize', onResize);
        }
    },
    'pages/blogs.html': {
        onEnter: null,
        onExit: null
    },
    'pages/contact.html': {
        onEnter: null,
        onExit: null
    }
};

function navigateTo(hash, state = {}, handle_route = true) {
    console.log("NAVIGATE TO", hash, state, handle_route);
    const newUrl = `#${hash}`;
    const currentUrl = window.location.hash;

    if (currentUrl === newUrl) {
        history.replaceState(state, '', newUrl);
    } else {
        history.pushState(state, '', newUrl);
    }
    
    if (handle_route) handleRoute();
    currentRaw = hash;
}

function matchRoute(hash) {
    for (const [pattern, config] of Object.entries(routes)) {
        const keys = [];
        const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, (_, k) => {
            keys.push(k);
            return '([^/]+)';
        }) + '$');
        const match = hash.match(regex);
        if (match) {
            const params = keys.reduce((acc, key, i) => {
                acc[key] = match[i + 1];
                return acc;
            }, {});
            return { route: config, params, redirect: config.redirectTo || pattern };
        }
    }
    return null;
}

handleProjectNavigation = (raw, params) => {
    // 1 - If going from one project to another
    if (currentRaw?.startsWith('project-') && raw.startsWith('project-') && raw !== currentRaw) {
        navProject(params.id);
        currentRaw = raw;
        currentParams = params;
        return true;
    }
    // 2 -If going from projects list → single project
    if (currentRaw === 'pages/projects.html' &&raw.startsWith('project-')) {
        openProject(params.id);
        currentParams = params;
        return true;
    }
    // 3 - If closing a project back to the list
    if (currentRaw?.startsWith('project-') && raw === 'pages/projects.html') {
        closeProject();
        currentParams = params;
        return true;
    }
    
    return false;
}

let _routeId = 0;
let currentRoute = null;
let currentRaw = null;
let currentParams = {};

async function handleRoute() {
    const myId = ++_routeId;
    const raw = location.hash.slice(1) || 'pages/home.html';

    const match = matchRoute(raw);
    if (!match) return;

    const { route, params, redirect } = match;

    if (handleProjectNavigation(raw, params)) return;

    if (currentRoute?.onExit) {
        currentRoute.onExit(currentParams);
    }

    currentRoute = route;
    currentParams = params;

    updateActiveNavLink(location.hash);
    updateLayout();

    await loadPage(redirect, false);
    if (myId !== _routeId) return;

    await new Promise(res => setTimeout(res, 300));
    if (route.onEnter) {
        await route.onEnter(params);
    }
}

function loadPage(page, pushState = true) {
    return new Promise((resolve) => {
        const content = document.getElementById('content');

        if (pushState) {
            const current = history.state;
            if (!current || current.page !== page) {
                history.pushState({ type: 'page', page }, '', `#${page}`);
            }
        }

        content.classList.add('fade-out');

        setTimeout(() => {
            fetch(page)
                .then(response => {
                    if (!response.ok) throw new Error("404");
                    return response.text();
                })
                .then(html => {
                    content.innerHTML = html;
                    content.classList.remove('fade-out');
                    resolve(); // Done loading and DOM is ready
                })
                .catch(() => {
                    content.innerHTML = "<h1>404</h1><p>Page not found</p>";
                    content.classList.remove('fade-out');
                    resolve(); // Still resolve to prevent hanging
                });
        }, 300);
    });
}

// 1) Delegate all clicks on <a href="#…"> to your router:
document.body.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const rawHash = link.getAttribute('href').slice(1);
    const routeMatch = matchRoute(rawHash);
    if (!routeMatch) return;

    e.preventDefault();
    navigateTo(rawHash, {});
});

/*========================== Menu ============================*/
const navLink = document.querySelectorAll('.nav_link');
const hamburger = document.getElementById('hamburger');
const navBar = document.querySelector('.nav_bar');

function updateLayout() {
    if (window.innerWidth <= 1000) {
        navBar.classList.remove('active');
        hamburger.classList.remove('open');
    } else {
        navBar.classList.remove('active');
        hamburger.classList.remove('open');
    }
}

window.addEventListener('resize', updateLayout);

hamburger.addEventListener('click', () => {
    navBar.classList.toggle('active');
    hamburger.classList.toggle('open');
});

function linkAction() {
    navLink.forEach(n => n.classList.remove('active'));
    this.classList.add('active');
}
navLink.forEach(n => n.addEventListener('click', linkAction));

function updateActiveNavLink(currentHash) {
    // Ensure leading '#' and default to home if empty
    if (!currentHash || currentHash === '#') {
        currentHash = '#pages/home.html';
    }

    let matchHref = currentHash;

    if (currentHash.startsWith('#project-')) {
        matchHref = '#pages/projects.html';
    } else if (currentHash.startsWith('#gallery-')) {
        matchHref = '#pages/photography.html';
    }

    document.querySelectorAll('.nav_link').forEach(link => {
        link.classList.toggle(
            'active',
            link.getAttribute('href') === matchHref
        );
    });
}

/* ========================== Footer ========================== */
function addSocialFooter() {
    if (document.querySelector('.social-footer')) return;

    const footer = document.createElement('footer');
    footer.className = 'social-footer';
    footer.innerHTML = `
        <div class="home-sci">
            <a href="https://open.spotify.com/user/azm67mmfixu99v9idlpc6r9bs" class="spotify"><i class="bx bxl-spotify"></i></a>
            <a href="https://github.com/jacobleazott"><i class='bx bxl-github'></i></a>
            <a href="https://www.linkedin.com/in/jacob-leazott-a63910190/"><i class='bx bxl-linkedin'></i></a>
        </div>
    `;
    document.body.appendChild(footer);

    const links = footer.querySelectorAll('.home-sci a');
    links.forEach((link, index) => {
        link.style.animationDelay = `${index * 0.3}s`;
    });
}


function removeSocialFooter() {
    const footer = document.querySelector('.social-footer');
    if (footer) footer.remove();
}

/*========================== Home Tying Text ============================*/
let phraseIndex = 0;
let charIndex = 0;
let isTyping = true;

function type() {
    const prefix = "I'm ";
    const phrases = ['Jacob Leazott', 'an Engineer.', 'a Maker.', 'a Designer.', 'a Photographer.', 'Always Learning.'];
    const typeSpeed = 100;
    const deleteSpeed = 60;
    const holdTime = 1500;

    const cursor = document.getElementById('cursor');
    if (!cursor) return;

    let fullPhrase = prefix + phrases[phraseIndex];
    document.getElementById('typed-text').textContent = fullPhrase.substring(0, charIndex);
    cursor.classList.add('typing');

    if (isTyping) {
        if (charIndex < fullPhrase.length) {
            charIndex++;
            setTimeout(type, typeSpeed);
        } else {
            // Done typing, hold and then delete
            cursor.classList.remove('typing');
            isTyping = false;
            setTimeout(type, holdTime);
        }
    } else { // Deleting
        if (charIndex > prefix.length || (phraseIndex === phrases.length - 1 && charIndex > 0)) {
            charIndex--;
        } else {
            isTyping = true;
            phraseIndex = (phraseIndex + 1) % phrases.length;
        }
        setTimeout(type, deleteSpeed);
    }
}

function startTypingEffect() {
    setTimeout(type, 1000);
}

function stopTypingEffect() {
    phraseIndex = 0;
    charIndex = 0;
    isTyping = true;
}

/*========================== Photo Gallery ============================*/
let galleryData = {};

async function loadGalleryGroups() {
    const res = await fetch('assets/photo-gallery.json');
    galleryData = await res.json();

    const selector = document.getElementById('gallery-selector');
    selector.innerHTML = '';

    Object.entries(galleryData).forEach(([tag, cfg], index) => {
        const images = generateImageUrls(cfg.base, cfg.count);
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.backgroundImage = `url(${images[cfg.preview_img_idx]})`;
        card.innerHTML = `<div class="overlay"><h2>${cfg.title}</h2></div>`;
        card.onclick = () => showGallery(tag);
        selector.appendChild(card);
    });

    return new Promise(requestAnimationFrame);
}

function showGallery(tag) {
    const cfg = galleryData[tag] || {};
    images = generateImageUrls(cfg.base, cfg.count);
    const selector         = document.getElementById('gallery-selector');
    const galleryContainer = document.getElementById('active-gallery-container');
    const galleryDiv       = document.getElementById('active-gallery');

    document.getElementById('gallery-title').textContent       = galleryData[tag].title;
    document.getElementById('gallery-description').textContent = galleryData[tag].description;
    document.getElementById('gallery-location').textContent    = galleryData[tag].location;
    document.getElementById('gallery-date').textContent        = galleryData[tag].date;
    document.getElementById('gallery-gear').textContent        = galleryData[tag].gear;

    galleryDiv.innerHTML = '';
    galleryDiv.dataset.tag = tag;

    selector.style.display = "none";
    galleryContainer.style.display = "block";

    images.forEach((src, i) => {
        const img = document.createElement('img');
        img.loading = "lazy";
        img.alt = tag;
        img.src = src;
        img.style.animationDelay = `${i * 0.1}s`;
        galleryDiv.appendChild(img);
    });

    navigateTo('gallery-' + tag, { type: 'gallery', tag }, handle_route=false);
}

function generateImageUrls(base, count) {
    const urls = [];
    for (let i = 1; i <= count; i++) {
        if (i === 1) {
            urls.push(`${base}.jpg`); // First one is just base.jpg
        } else {
            urls.push(`${base}-${i}.jpg`); // Remaining are base-2.jpg, base-3.jpg, etc.
        }
    }
    return urls;
}

/*========================== Experience & Education ============================*/
let currentIndex = 0;

function updatePanelsHeightAndVisibility(newIndex) {
    const tabList = document.querySelector('.tab-list');
    const panelsContainer = document.querySelector('.tab-panels');

    if (!tabList || !panelsContainer) { return; }

    const btns = tabList.querySelectorAll('button');
    const panels = panelsContainer.querySelectorAll(':scope > div');
    const newPanel = panels[newIndex];

    panels.forEach((panel, i) => {
        if (i === newIndex) {
            panel.style.display = 'block';
            panel.classList.add('visible');
        } else {
            panel.style.display = 'none';
            panel.classList.remove('visible');
        }
    });

    // Calculate minimum height from tab buttons and update container height
    let tabButtonsTotal = 0;
    btns.forEach(b => tabButtonsTotal += b.offsetHeight);
    const endH = Math.max(newPanel.scrollHeight, tabButtonsTotal);
    panelsContainer.style.height = `${endH}px`;
}

async function initExperienceSection() {
    const res             = await fetch('assets/experience.json');
    const jobs            = await res.json();
    const tabList         = document.querySelector('.tab-list');
    const panelsContainer = document.querySelector('.tab-panels');
    const expContainer    = document.querySelector('.experience-container');
    
    tabList.innerHTML         = '';
    panelsContainer.innerHTML = '';
    
    jobs.forEach((job, i) => {
        // Tab button
        const btn = document.createElement('button');
        btn.id = `tab-${i}`;
        btn.setAttribute('aria-selected', i === 0);
        btn.textContent = job.company;
        btn.addEventListener('click', () => selectJob(i));
        tabList.appendChild(btn);
        
        // Panel
        const panel = document.createElement('div');
        panel.id = `panel-${i}`;
        if (i === 0) panel.classList.add('visible');
        panel.innerHTML = `
            <h3><span>${job.position}</span>
                <span class="company"> - ${job.company} </span>
            </h3>
            <p class="range">${job.range}</p>
            <ul class="job-description">
                ${job.bullets.map(b => `<li>${b}</li>`).join('')}
            </ul>
        `;
        panelsContainer.appendChild(panel);
    });
    
    // Insert highlight bar
    const highlight = document.createElement('div');
    highlight.classList.add('tab-highlight');
    tabList.appendChild(highlight);
    
    moveHighlightToIndex(0);
    panelsContainer.style.height = `${panelsContainer.scrollHeight}px`;
    
    expContainer.getBoundingClientRect(); // force reflow
    expContainer.classList.add('loaded');
}

function moveHighlightToIndex(index) {
    const btns      = document.querySelectorAll('.tab-list button');
    const highlight = document.querySelector('.tab-highlight');
    const btn       = btns[index];
    if (!btn || !highlight) return;
    
    highlight.style.top    = `${btn.offsetTop}px`;
    highlight.style.height = `${btn.offsetHeight}px`;
}

function selectJob(newIndex) {
    if (newIndex === currentIndex) return;
    
    const tabList = document.querySelector('.tab-list');
    const btns = tabList.querySelectorAll('button');
    const panelsContainer = document.querySelector('.tab-panels');
    const panels = panelsContainer.querySelectorAll(':scope > div');
    
    const oldPanel = panels[currentIndex];
    const newPanel = panels[newIndex];
    
    // Fade out old panel, then fade in new panel and resize container
    if (oldPanel) {
        oldPanel.classList.remove('visible');
        oldPanel.classList.add('fade-out-up');
        
        setTimeout(() => {
            oldPanel.classList.remove('fade-out-up');
            oldPanel.style.display = 'none';
            
            updatePanelsHeightAndVisibility(newIndex);
            newPanel.classList.add('fade-in-down');
            setTimeout(() => {
                newPanel.classList.remove('fade-in-down');
            }, 300);
        }, 300);
    }
    
    btns.forEach((b, i) => b.setAttribute('aria-selected', i === newIndex));
    moveHighlightToIndex(newIndex);
    currentIndex = newIndex;
}

function onResize() {
    updatePanelsHeightAndVisibility(currentIndex);
}

/* ========================== Home Splash ============================*/
function resizeSplashImages() {
    const MIN_COLS = 3;
    const MAX_COLS = 9;
    const MIN_W    = 360;   // at width≤360px, show 3 columns
    const MAX_W    = 1440;  // at width≥1440px, show 9 columns
  
    const w = window.innerWidth;
    // linear interpolate and round
    const t = Math.min(1, Math.max(0, (w - MIN_W) / (MAX_W - MIN_W)));
    const visibleCols = Math.round(MIN_COLS + (MAX_COLS - MIN_COLS) * t);
  
    // compute size so that 'visibleCols' fit across the rotated container
    const size = (w * Math.SQRT2) / visibleCols;
    document.documentElement.style.setProperty('--square-size', `${size}px`);
  }

function splashScreen () {
    const BASE_SPEED = 10;
    const COLUMN_COUNT_NEEDED = 8;
    resizeSplashImages();
    const columns = document.querySelectorAll(".column");

    columns.forEach((column, colIndex) => {
        const inner = column.querySelector(".column-inner");
        let diamonds = inner.querySelectorAll(".diamond");

        // Shuffle the diamonds array to randomize their order
        const diamondsArr = Array.from(diamonds);
        diamondsArr.sort(() => Math.random() - 0.5);
        inner.innerHTML = '';
        diamondsArr.forEach(diamond => {
            inner.appendChild(diamond);
        });

        const elementHeight = (parseFloat(getComputedStyle(inner).gap) + 
            (diamonds[0].getBoundingClientRect().height / Math.sqrt(2)))
        const scrollDistance = diamonds.length * elementHeight;

        while (diamonds.length < COLUMN_COUNT_NEEDED + diamondsArr.length) {
            diamondsArr.forEach(diamond => {
            const clone = diamond.cloneNode(true);
            inner.appendChild(clone);
            })
            diamonds = inner.querySelectorAll(".diamond");
        };

        let offsetDistance = 0;
        if (colIndex % 2 === 0) {
            offsetDistance = -1 * (inner.querySelectorAll(".diamond").length - COLUMN_COUNT_NEEDED / 2) * elementHeight;
        } else {
            offsetDistance = -1 * (COLUMN_COUNT_NEEDED * elementHeight) / ((COLUMN_COUNT_NEEDED - 1) / 2);
        }
        
        inner.style.setProperty('--splash-offset', `${offsetDistance}px`);
        inner.style.setProperty('transform', `translateY(${offsetDistance}px)`);
        
        inner.style.setProperty('--scroll-distance', `${scrollDistance}px`);
        column.classList.add(colIndex % 2 === 0 ? "slide-in-top-right" : "slide-in-bottom-left");
        const center = (columns.length - 1) / 2;
        const delay = (center - Math.abs(colIndex - center)) * 0.35;
        column.style.animationDelay = `${delay}s`;
        
        const adjustedSpeed = BASE_SPEED * (1 + (Math.random() * 0.4 - 0.2)); // +- 20%    
        const scrollType = colIndex % 2 === 0 ? "scroll-top-down" : "scroll-bottom-up";
        inner.style.animation = `${scrollType} ${scrollDistance / adjustedSpeed}s linear infinite`;
    });
}