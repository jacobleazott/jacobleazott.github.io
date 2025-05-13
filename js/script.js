/*========================== Startup ============================*/
window.addEventListener('DOMContentLoaded', handleRoute);
window.addEventListener('hashchange',       handleRoute);

/*========================== Page Loading And Routing ============================*/
let _routeId = 0;


function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  

  async function handleRoute() {
    const myId = ++_routeId;
    const raw   = location.hash.slice(1);   // e.g. "pages/projects.html" or "project-foo"
    updateActiveNavLink(location.hash);
    updateLayout();
  
    let pageToLoad   = 'pages/home.html';
    let postLoadHook = null;
  
    // ------- Projects listing -------
    if (raw === 'pages/projects.html') {
      pageToLoad = 'pages/projects.html';
      postLoadHook = async () => {
        // load module, cards, handlers
        await loadScriptOnce('js/project_module.js');
        await window.loadProjectCards();
        window.attachModalHandlers();
      };
  
    // ------- Project preview or fullscreen -------
    } else if (raw.startsWith('project-')) {
      // always load the projects.html shell
      pageToLoad = 'pages/projects.html';
      postLoadHook = async () => {
        await loadScriptOnce('js/project_module.js');
        await window.loadProjectCards();
        window.attachModalHandlers();
      
        const key = raw.replace('project-', '');
      
        // Wait until the cards have definitely rendered
        requestAnimationFrame(() => {
          const idx   = projectKeys.indexOf(key);
          const cardEl = document.querySelector(`.project-card:nth-child(${ idx + 1 })`);
      
          // Use a fallback if the card isn't found
          window.openProject(key, { target: cardEl || undefined });
        });
      };
  
    // ------- Photography / gallery -------
    } else if (raw === 'pages/photography.html') {
      pageToLoad   = 'pages/photography.html';
      postLoadHook = loadGalleryGroups;
  
    } else if (raw.startsWith('gallery-')) {
      const tag = raw.replace('gallery-', '');
      pageToLoad   = 'pages/photography.html';
      postLoadHook = async () => {
        if (!Object.keys(galleryData).length) {
          await loadGalleryGroups();
        }
        const cfg  = galleryData[tag] || {};
        const imgs = generateImageUrls(cfg.base, cfg.count);
        showGallery(tag, imgs, false);
      };
  
    // ------- Any other raw ending in .html -------
    } else if (raw.endsWith('.html')) {
      pageToLoad = raw;
    }
  
    // --- Load the page shell ---
    await loadPage(pageToLoad, /*pushState=*/false);
    if (myId !== _routeId) return;
  
    // --- Run post-load logic (cards, previews, galleries) ---
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