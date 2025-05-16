/*========================== Globals ============================*/
let projectData     = [];
let projectKeys     = [];
let currentKeyIndex = -1;
let isAnimating     = false;

/*========================== Project Loading ============================*/
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
        card.style.setProperty('--proj-anim-delay', `${idx * 0.1}s`);
        card.innerHTML = `
            <img src="${data.img}" alt="${data.title}">
            <div class="content">
                <h3>${data.title}</h3>
                <p>${data.description.replace(/\n/g, '<br>')}</p>
            </div>`;
        card.addEventListener('click', () => openProject(key));
        container.appendChild(card);
    });
}

async function openProject(key) {
    currentKeyIndex = projectKeys.indexOf(key);
    if (currentKeyIndex < 0) return;

    const overlay     = document.getElementById('project-modal');
    const contentWrap = overlay.querySelector('.content-wrapper');

    document.body.classList.add('disable-scroll');
    overlay.classList.add('flex');

    const html = await fetch(projectData[key].html_to_load).then(r => r.text());
    contentWrap.innerHTML = html;

    overlay.querySelector('.modal-nav.prev').classList.toggle('hidden', currentKeyIndex <= 0);
    overlay.querySelector('.modal-nav.next').classList.toggle('hidden', currentKeyIndex >= projectKeys.length - 1);

    // Force reflow before triggering animation
    void overlay.offsetWidth;
    overlay.classList.add('open');

    history.pushState({ key }, '', `#project-${key}`);
}

function closeProject() {
    const overlay = document.getElementById('project-modal');
    if (!overlay) return;

    const container = overlay.querySelector('.modal-container');
    document.body.classList.remove('disable-scroll');

    overlay.classList.remove('open');
    overlay.classList.add('closing');

    setTimeout(() => {
        overlay.classList.remove('closing', 'flex');
        container.classList.remove('fullscreen');
    }, 300);

    history.pushState({ view: 'list' }, '', '#pages/projects.html');
}

/*========================== Project Navigation ============================*/
function expandProject() {
    const overlay   = document.getElementById('project-modal');
    const container = overlay.querySelector('.modal-container');
    const btn       = overlay.querySelector('.modal-expand');

    const fullscreen = container.classList.toggle('fullscreen');
    btn.innerText = fullscreen ? '⤡' : '⤢';
}

function navProject(dir) {
    if (isAnimating) return;
    const overlay = document.getElementById('project-modal');
    if (!overlay || !overlay.classList.contains('flex')) return;

    const contentWrap = overlay.querySelector('.content-wrapper');
    const oldIndex = currentKeyIndex;
    const newIndex = dir === 'next' ? oldIndex + 1 : oldIndex - 1;
    if (newIndex < 0 || newIndex >= projectKeys.length) return;

    isAnimating = true;
    const outClass = dir === 'next' ? 'slide-out-left' : 'slide-out-right';
    const inClass = dir === 'next' ? 'slide-in-right' : 'slide-in-left';

    contentWrap.classList.add(outClass);
    contentWrap.addEventListener('animationend', function onOut(e) {
        if (!e.animationName.startsWith('slideOut')) return;
        contentWrap.removeEventListener('animationend', onOut);
        contentWrap.classList.remove(outClass);

        contentWrap.classList.add('hidden');
        contentWrap.innerHTML = '';

        currentKeyIndex = newIndex;
        fetch(projectData[projectKeys[newIndex]].html_to_load)
            .then(r => r.text())
            .then(txt => {
                contentWrap.innerHTML = txt;
                contentWrap.classList.remove('hidden');
                void contentWrap.offsetWidth;

                contentWrap.classList.add(inClass);
                contentWrap.addEventListener('animationend', function onIn(evt) {
                    if (!evt.animationName.startsWith('slideIn')) return;
                    contentWrap.removeEventListener('animationend', onIn);
                    contentWrap.classList.remove(inClass);
                    isAnimating = false;
                }, { once: true });

                overlay.querySelector('.modal-nav.prev').classList.toggle('hidden', currentKeyIndex <= 0);
                overlay.querySelector('.modal-nav.next').classList.toggle('hidden', currentKeyIndex >= projectKeys.length - 1);

                history.pushState({ view: 'preview', key: projectKeys[newIndex] }, '', `#project-${projectKeys[newIndex]}`);
            });
    }, { once: true });
}

/*========================== Project Handlers ============================*/
function onModalKeydown(e) {
    const overlay = document.getElementById('project-modal');
    if (!overlay || !overlay.classList.contains('flex')) return;

    if (e.key === 'Escape')      closeProject();
    if (e.key === 'ArrowRight')  navProject('next');
    if (e.key === 'ArrowLeft')   navProject('prev');
}

function attachModalHandlers() {
    const overlay = document.getElementById('project-modal');
    if (!overlay) return;

    // Click handlers
    overlay.querySelector('.modal-close')?.addEventListener('click', closeProject);
    overlay.querySelector('.modal-expand')?.addEventListener('click', expandProject);
    overlay.querySelector('.modal-nav.prev')?.addEventListener('click', () => navProject('prev'));
    overlay.querySelector('.modal-nav.next')?.addEventListener('click', () => navProject('next'));
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeProject();
    });

    // Global keydown handler
    document.addEventListener('keydown', onModalKeydown);
}

function detachModalHandlers() {
    document.removeEventListener('keydown', onModalKeydown);

    const overlay = document.getElementById('project-modal');
    if (!overlay) return;

    overlay.querySelector('.modal-close')?.removeEventListener('click', closeProject);
    overlay.querySelector('.modal-expand')?.removeEventListener('click', expandProject);
}

/*========================== Project Exports ============================*/
window.loadProjectCards    = loadProjectCards;
window.attachModalHandlers = attachModalHandlers;
window.detachModalHandlers = detachModalHandlers;
window.openProject         = openProject;