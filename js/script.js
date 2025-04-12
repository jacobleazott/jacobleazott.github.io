/*========================== Startup ============================*/
window.addEventListener('DOMContentLoaded', () => {
    loadPage("pages/home.html");
    updateLayout();
  });

/*========================== Menu ============================*/
const navLink = document.querySelectorAll('.nav_link');   
const hamburger = document.getElementById('hamburger');
const navBar     = document.querySelector('.nav_bar');

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

document.querySelectorAll(".nav_link, .logo").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const page = link.getAttribute("href");
    loadPage(page);
  });
});

/*========================== Page Loading ============================*/
function performPageFunctions(page) {
    pageName = page.split('/').pop().replace(/\.html$/, '');
    switch (pageName) {
      case "photography":
        loadGalleryGroups();
        break;
    }
}
  
function loadPage(page) {
    const content = document.getElementById('content');
  
    // Trigger fade-out
    content.classList.add('fade-out');
  
    setTimeout(() => {
      fetch(page)
        .then(response => {
          if (!response.ok) {
            throw new Error("404");
          }
          return response.text();
        })
        .then(html => {
          content.innerHTML = html;
  
          // Trigger fade-in after content update
          requestAnimationFrame(() => {
            // Ensure it's applied on the next frame
            content.classList.remove('fade-out');
          });
  
          performPageFunctions(page);
        })
        .catch(() => {
          content.innerHTML = "<h1>404</h1><p>Page not found</p>";
          content.classList.remove('fade-out');
        });
    }, 300); // Transition Time
}
  
/*========================== Photo Gallery ============================*/
let galleryData = {};  // will hold your full JSON

async function loadGalleryGroups() {
    const res = await fetch('assets/photo-gallery.json');
    galleryData = await res.json();   // store for later
    const selector = document.getElementById('gallery-selector');
  
    Object.entries(galleryData).forEach(([tag, cfg], index) => {
      const images = generateImageUrls(cfg.base, cfg.count);
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.style.animationDelay = `${index * 0.1}s`;
      card.style.backgroundImage = `url(${images[cfg.preview_img_idx]})`;
      card.innerHTML = `<div class="overlay"><h2>${cfg.title}</h2></div>`;
      card.onclick = () => showGallery(tag, images);
      selector.appendChild(card);
    });
}
  
function showGallery(tag, images) {
    const selector = document.getElementById('gallery-selector');
    const galleryContainer = document.getElementById('active-gallery-container');
    const galleryDiv = document.getElementById('active-gallery');
    const titleEl = document.getElementById('gallery-title');
    const descEl = document.getElementById('gallery-description');
  
    titleEl.textContent = galleryData[tag].title;
    descEl.textContent = galleryData[tag].description;
  
    galleryDiv.innerHTML = '';
    galleryDiv.dataset.tag = tag;
  
    images.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.loading = "lazy";
      img.alt = tag;
      galleryDiv.appendChild(img);
    });
  
    selector.style.display = "none";
    galleryContainer.style.display = "block";
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