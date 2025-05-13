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
    let hookArgs = [];
  
    if (raw === 'pages/projects.html') {
        pageToLoad = 'pages/projects.html';
        postLoadHook = loadProjectCards;
    } else if (raw.startsWith('project-')) {
        const slug = raw.replace('project-', '');
        pageToLoad = 'pages/projects.html';
        postLoadHook = async () => {
            if (!projectData || Object.keys(projectData).length === 0) {
                try {
                    const res = await fetch('assets/projects.json');
                    projectData = await res.json();
                } catch (err) {
                    console.error('Failed to load project JSON:', err);
                    return;
                }
            }
            showProjectDetail(slug, false);
        };
    } else if (raw === 'pages/photography.html') {
        pageToLoad = 'pages/photography.html';
        postLoadHook = loadGalleryGroups;
    } else if (raw.startsWith('gallery-')) {
        const tag = raw.replace('gallery-', '');
        pageToLoad = 'pages/photography.html';
        postLoadHook = async () => {
            if (Object.keys(galleryData).length === 0) {
                await loadGalleryGroups();
            }
            const cfg = galleryData[tag] || {};
            if (!cfg.base || !cfg.count) {
              console.warn(`Invalid gallery tag: ${tag}`);
              return;
            }
            const imgs = generateImageUrls(cfg.base, cfg.count);
            showGallery(tag, imgs, false);
        };
    } else if (raw.endsWith('.html')) {
        pageToLoad = raw;
    }
    
    await loadPage(pageToLoad, false);
    if (myId !== _routeId) return;
    
    if (postLoadHook) {
        await postLoadHook(...hookArgs);
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
const navLink   = document.querySelectorAll('.nav_link');   
const hamburger = document.getElementById('hamburger');
const navBar    = document.querySelector('.nav_bar');

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

function linkAction(){
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
let galleryData = {};  // will hold your full JSON

async function loadGalleryGroups() {
    // 1) fetch JSON
    const res = await fetch('assets/photo-gallery.json');
    galleryData = await res.json();
  
    const selector = document.getElementById('gallery-selector');
    selector.innerHTML = ''; // clear existing
  
    // 2) build cards
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
  
    // 3) wait for the browser to paint those cards
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
  
    titleEl.textContent = galleryData[tag].title;
    descEl.textContent = galleryData[tag].description;
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

/*========================== Project Selector ============================*/
let projectData = {};

async function loadProjectCards() {
    const container = document.getElementById('project-selector');
    container.innerHTML = ''; // Clear previous cards
    
    try {
        const res = await fetch('assets/projects.json');
        projectData = await res.json(); // Store globally
    } catch (err) {
        console.error('Failed to load project JSON:', err);
        return;
    }
    
    Object.entries(projectData).forEach(([key, data], index) => {
        const { title, description, img } = data;
        
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <img src="${img}" alt="${title}" />
            <div class="content">
                <h3>${title}</h3>
                <p>${description.replace(/\n/g, "<br>")}</p>
            </div>
        `;
        
        card.onclick = () => location.hash = `#project-${key}`;
        container.appendChild(card);
    });
}

async function showProjectDetail(projectKey, pushState = true) {
    const content = document.getElementById('project-content');
    const project = projectData[projectKey];
    
    if (!project || !project.html_to_load) {
        content.innerHTML = `<p class="text-red-500">Project data not found.</p>`;
        return;
    }
    
    if (pushState) {
        history.pushState({ type: 'project', key: projectKey }, '', `#project-${projectKey}`);
    }
    
    document.getElementById('project-selector').style.display = 'none';
    document.getElementById('active-project-container').style.display = 'block';
    
    try {
        const res = await fetch(project.html_to_load);
        const html = await res.text();
        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = `<p class="text-red-500">Failed to load project page.</p>`;
        console.error('Error loading project HTML:', err);
    }
}