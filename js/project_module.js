let projectData     = [];
let projectKeys     = [];
let currentKeyIndex = -1;

async function loadProjectCards() {
    const container = document.getElementById('project-selector');
    if (!container) return;

    const res = await fetch('assets/projects.json');
    projectData = await res.json();
    projectKeys = Object.keys(projectData);

    container.innerHTML = '';
    projectKeys.forEach((key, idx) => {
        const data = projectData[key];
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.animationDelay = `${idx * 0.1}s`;
        card.innerHTML = `
            <img src="${data.img}" alt="${data.title}">
            <div class="content">
                <h3>${data.title}</h3>
                <p>${data.description.replace(/\n/g, '<br>')}</p>
            </div>`;
        card.addEventListener('click', e => openProject(key, e));
        container.appendChild(card);
    });
}

async function openProject(key, clickEvent, mode = 'preview') {
    currentKeyIndex = projectKeys.indexOf(key);
    if (currentKeyIndex < 0) return;

    const overlay     = document.getElementById('project-modal');
    const container   = overlay.querySelector('.modal-container');
    const contentWrap = overlay.querySelector('.content-wrapper');
    if (!contentWrap) {
        console.error('Missing .content-wrapper');
        return;
    }
    document.body.classList.add('modal-open');

    overlay.querySelector('.modal-expand').innerText =
        mode === 'fullscreen' ? '⤡' : '⤢';

    if (mode === 'preview') {
        const card     = clickEvent?.target?.closest('.project-card');
        const cardRect = card?.getBoundingClientRect();
        if (cardRect) {
            container.style.position        = 'fixed';
            container.style.top             = `${cardRect.top}px`;
            container.style.left            = `${cardRect.left}px`;
            container.style.width           = `${cardRect.width}px`;
            container.style.height          = `${cardRect.height}px`;
            container.style.transformOrigin = 'center center';
        }
        overlay.style.display = 'flex';

        requestAnimationFrame(() => {
            container.style.transition = 'all 0.3s ease';
            container.style.top        = '50%';
            container.style.left       = '50%';
            container.style.width      = '80vw';
            container.style.height     = '80vh';
            container.style.transform  = 'translate(-50%, -50%) scale(1)';
        });
    } else {
        overlay.classList.add('fullscreen');
        overlay.style.display = 'flex';
    }

    // force layout, trigger fade-in
    void overlay.offsetWidth;
    overlay.classList.add('open');

    // load into the wrapper
    const html = await fetch(projectData[key].html_to_load).then(r => r.text());
    contentWrap.innerHTML = html;

    // nav arrows
    overlay.querySelector('.modal-nav.prev').style.display =
        currentKeyIndex > 0 ? 'block' : 'none';
    overlay.querySelector('.modal-nav.next').style.display =
        currentKeyIndex < projectKeys.length - 1 ? 'block' : 'none';

    history.pushState({ view: mode, key }, '', `#project-${key}`);
}

function closeProject() {
    const overlay = document.getElementById('project-modal');
    if (!overlay) return;

    const container = overlay.querySelector('.modal-container');
    document.body.classList.remove('modal-open');
    overlay.classList.remove('open');
    overlay.classList.add('closing');

    container.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    container.style.transform  = 'translate(-50%, -50%) scale(0.5)';
    container.style.opacity    = '0';

    setTimeout(() => {
        overlay.classList.remove('closing');
        overlay.style.display = 'none';
        overlay.classList.remove('fullscreen');
        container.removeAttribute('style');
    }, 300);

    history.pushState({ view: 'list' }, '', '#pages/projects.html');
}

function expandProject() {
    const overlay   = document.getElementById('project-modal');
    const container = overlay.querySelector('.modal-container');
    const btn       = overlay.querySelector('.modal-expand');
    const isFS      = overlay.classList.contains('fullscreen');

    container.style.position       = 'fixed';
    container.style.top            = '50%';
    container.style.left           = '50%';
    container.style.transformOrigin= 'center center';
    container.style.transition     = 'all 0.3s ease';

    if (isFS) {
        overlay.classList.remove('fullscreen');
        btn.innerText = '⤢';
        // shrink back
        container.style.width      = '80vw';
        container.style.height     = '80vh';
        container.style.transform  = 'translate(-50%, -50%) scale(0.8)';
        container.addEventListener('transitionend', () => {
            container.removeAttribute('style');
        }, { once: true });
    } else {
        overlay.classList.add('fullscreen');
        btn.innerText = '⤡';
        // expand to full
        container.style.width      = '100vw';
        container.style.height     = '100vh';
        container.style.transform  = 'translate(-50%, -50%) scale(1)';
        container.addEventListener('transitionend', () => {
            container.removeAttribute('style');
        }, { once: true });
    }
}

function navProject(dir) {
    const overlay   = document.getElementById('project-modal');
    if (!overlay || overlay.style.display !== 'flex') return;

    const contentWrap = overlay.querySelector('.content-wrapper');
    const oldIndex    = currentKeyIndex;
    const newIndex    = dir === 'next' ? oldIndex + 1 : oldIndex - 1;
    if (newIndex < 0 || newIndex >= projectKeys.length) return;

    const outClass = dir === 'next' ? 'slide-out-left' : 'slide-out-right';
    const inClass  = dir === 'next' ? 'slide-in-right' : 'slide-in-left';

    contentWrap.classList.add(outClass);
    contentWrap.addEventListener('animationend', function onOut(e) {
        if (!e.animationName.startsWith('cw-slideOut')) return;
        contentWrap.removeEventListener('animationend', onOut);
        contentWrap.classList.remove(outClass);

        // hide old, clear HTML
        contentWrap.style.visibility = 'hidden';
        contentWrap.innerHTML        = '';

        currentKeyIndex = newIndex;

        fetch(projectData[projectKeys[newIndex]].html_to_load)
            .then(r => r.text())
            .then(txt => {
                // inject new content
                contentWrap.innerHTML       = txt;
                contentWrap.style.visibility= '';
                void contentWrap.offsetWidth;

                // slide in
                contentWrap.classList.add(inClass);
                contentWrap.addEventListener('animationend', function onIn(evt) {
                    if (!evt.animationName.startsWith('cw-slideIn')) return;
                    contentWrap.removeEventListener('animationend', onIn);
                    contentWrap.classList.remove(inClass);
                }, { once: true });

                // update nav buttons
                overlay.querySelector('.modal-nav.prev').style.display =
                    currentKeyIndex > 0 ? 'block' : 'none';
                overlay.querySelector('.modal-nav.next').style.display =
                    currentKeyIndex < projectKeys.length - 1 ? 'block' : 'none';

                history.pushState(
                    { view: 'preview', key: projectKeys[newIndex] },
                    '',
                    `#project-${projectKeys[newIndex]}`
                );
            });
    }, { once: true });
}



function attachModalHandlers() {
    document.addEventListener('keydown', e => {
        const overlay = document.getElementById('project-modal');
        if (!overlay || overlay.style.display !== 'flex') return;
        if (e.key === 'Escape')      closeProject();
        if (e.key === 'ArrowRight')  navProject('next');
        if (e.key === 'ArrowLeft')   navProject('prev');
    });

    const overlay = document.getElementById('project-modal');
    overlay.querySelector('.modal-close').onclick    = closeProject;
    overlay.querySelector('.modal-expand').onclick   = expandProject;
    overlay.querySelector('.modal-nav.prev').onclick = () => navProject('prev');
    overlay.querySelector('.modal-nav.next').onclick = () => navProject('next');
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeProject();
    });
}

window.loadProjectCards    = loadProjectCards;
window.attachModalHandlers = attachModalHandlers;
window.openProject         = openProject;