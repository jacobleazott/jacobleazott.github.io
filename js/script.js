/*========================== Startup ============================*/
window.addEventListener('DOMContentLoaded', handleRoute);
window.addEventListener('hashchange',       handleRoute);

/*========================== Page Loading And Routing ============================*/
let _routeId = 0;

async function handleRoute() {
    const myId = ++_routeId;
    const raw = location.hash.slice(1);
    updateActiveNavLink(location.hash);
    updateLayout();

    let pageToLoad = 'pages/home.html';
    let postLoadHook = null;

    // ------- Project Selector -------
    if (raw === 'pages/projects.html') {
        pageToLoad = 'pages/projects.html';
        postLoadHook = async () => {
            await window.loadProjectCards();
            window.attachModalHandlers();
        };

    // ------- Project Preview -------
    } else if (raw.startsWith('project-')) {
        pageToLoad = 'pages/projects.html';
        postLoadHook = async () => {
            await window.loadProjectCards();
            await window.attachModalHandlers();

            const key = raw.replace('project-', '');
            window.openProject(key);
        };

    // ------- Photography / Gallery -------
    } else if (raw === 'pages/photography.html') {
        pageToLoad = 'pages/photography.html';
        postLoadHook = loadGalleryGroups;

    } else if (raw.startsWith('gallery-')) {
        const tag = raw.replace('gallery-', '');
        pageToLoad = 'pages/photography.html';
        postLoadHook = async () => {
            if (!Object.keys(galleryData).length) {
                await loadGalleryGroups();
            }
            const cfg = galleryData[tag] || {};
            const imgs = generateImageUrls(cfg.base, cfg.count);
            showGallery(tag, imgs, false);
        };
    
    } else if (raw === 'pages/about.html') {
        pageToLoad = 'pages/about.html';
        postLoadHook = initExperienceSection;

    // ------- Any other raw ending in .html -------
    } else if (raw.endsWith('.html')) {
        pageToLoad = raw;
    }

    // --- Load the page shell ---
    await loadPage(pageToLoad, /*pushState=*/false);
    if (myId !== _routeId) return;

    await new Promise(resolve => setTimeout(resolve, 300));

    // --- Run post-load logic ---
    if (postLoadHook) {
        await postLoadHook();
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
        card.onclick = () => location.hash = `gallery-${tag}`;
        selector.appendChild(card);
    });

    return new Promise(requestAnimationFrame);
}

function showGallery(tag, images, pushState = true) {
    if (pushState) {
        history.pushState({ type: 'gallery', tag }, '', `#gallery-${tag}`);
    }

    const selector = document.getElementById('gallery-selector');
    const galleryContainer = document.getElementById('active-gallery-container');
    const galleryDiv = document.getElementById('active-gallery');
    const titleEl = document.getElementById('gallery-title');
    const descEl = document.getElementById('gallery-description');

    document.getElementById('gallery-title').textContent = galleryData[tag].title;
    document.getElementById('gallery-description').textContent = galleryData[tag].description;
    document.getElementById('gallery-location').textContent = galleryData[tag].location;
    document.getElementById('gallery-date').textContent = galleryData[tag].date;
    document.getElementById('gallery-gear').textContent = galleryData[tag].gear;

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

function onHashChange() {
    if (window.location.hash === '#pages/about.html') {
        window.addEventListener('resize', onResize);
    } else {
        window.removeEventListener('resize', onResize);
    }
}

function onResize() {
    updatePanelsHeightAndVisibility(currentIndex);
}

window.addEventListener('hashchange', onHashChange);
onHashChange();
