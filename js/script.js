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
        case "projects":
            console.log('performPageFunctions Loading project cards...');
            loadProjectCards();
            
            break;
        case "photography":
            console.log('performPageFunctions Loading gallery cards...');
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

    const imgElements = images.map((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = "lazy";
        img.alt = tag;
        img.style.animationDelay = `${i * 0.1}s`; // default stagger
        return img;
    });

    let loaded = 0;
    imgElements.forEach(img => {
        img.onload = () => {
            loaded++;
            if (loaded === imgElements.length) {
                imgElements.forEach(el => galleryDiv.appendChild(el));
                selector.style.display = "none";
                galleryContainer.style.display = "block";
            }
        };
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

function goBackToSelector() {
    document.getElementById('active-gallery-container').style.display = "none";
    document.getElementById('gallery-selector').style.display = "grid";
}

/*========================== Project Selector ============================*/
async function loadProjectCards() {
    console.log('Loading project cards...');
    const res = await fetch('assets/projects.json');
    const projectData = await res.json();
    const container = document.getElementById('project-selector');

    Object.entries(projectData).forEach(([key, proj], index) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <h3>${proj.title}</h3>
            <img src="${proj.img}" alt="${proj.title}" />
            <p>${proj.description.replace(/\n/g, "<br>")}</p>
        `;

        card.onclick = () => showProjectDetail(proj.html_to_load);
        container.appendChild(card);
    });
}

function showProjectDetail(htmlFile) {
    const selector = document.getElementById('project-selector');
    const container = document.getElementById('active-project-container');
    const content = document.getElementById('project-content');

    selector.style.display = 'none';
    container.style.display = 'block';

    fetch(htmlFile)
        .then(res => res.text())
        .then(html => {
            content.innerHTML = html;
        });
}

function goBackToProjects() {
    document.getElementById('active-project-container').style.display = 'none';
    document.getElementById('project-selector').style.display = 'grid';
}
