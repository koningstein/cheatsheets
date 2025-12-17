document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialiseer Syntax Highlighting (Highlight.js)
    if (window.hljs) {
        hljs.highlightAll();
    }

    const html = document.documentElement;

    // --- CONFIGURATIE ARRAYS ---
    const themes = ['light', 'dark', 'material', 'monokai', 'night-owl'];
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'teal', 'darkblue'];

    // --- INCLUDE SYSTEM (HEADER/SIDEBAR) ---
    const includeElements = document.querySelectorAll("[data-include]");
    let includesPending = includeElements.length;

    if (includesPending === 0) {
        initPageLogic();
    } else {
        includeElements.forEach(el => {
            const filePath = el.getAttribute("data-include");
            // Bepaal het "basis pad" (bijv. "../../" als filePath "../../sidebar.html" is)
            const lastSlashIndex = filePath.lastIndexOf("/");
            const basePath = lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex + 1) : "";

            fetch(filePath)
                .then(res => {
                    if (!res.ok) throw new Error("Network response was not ok");
                    return res.text();
                })
                .then(content => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;

                    // Pad correcties voor links/images in de ingeladen HTML
                    const links = tempDiv.querySelectorAll('a, img, link, script');
                    links.forEach(link => {
                        if (link.hasAttribute('href')) {
                            const href = link.getAttribute('href');
                            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                                link.setAttribute('href', basePath + href);
                            }
                        }
                        if (link.hasAttribute('src')) {
                            const src = link.getAttribute('src');
                            if (src && !src.startsWith('http')) {
                                link.setAttribute('src', basePath + src);
                            }
                        }
                    });

                    el.outerHTML = tempDiv.innerHTML;
                })
                .catch(err => {
                    console.error(`Fout bij laden van ${filePath}:`, err);
                    el.innerHTML = `<p style="color:red">Error loading ${filePath}</p>`;
                })
                .finally(() => {
                    includesPending--;
                    if (includesPending === 0) {
                        initPageLogic();
                    }
                });
        });
    }

    // --- HOOFD LOGICA (Start pas na inladen HTML) ---
    function initPageLogic() {
        // Context bepalen (Welk vak? Welke modus?)
        const context = getCurrentContext();
        const rootPath = getRootPath();

        // Data ophalen en UI bouwen
        fetch(rootPath + 'data/navigation.json')
            .then(response => {
                if (!response.ok) throw new Error("Kon navigation.json niet vinden");
                return response.json();
            })
            .then(data => {
                // Als we data hebben voor dit vak
                if (context.isFound && data[context.subject]) {
                    const subjectData = data[context.subject][context.mode]; // Pak 'min' of 'ext' data

                    if (subjectData) {
                        initHeaderAndFooter(subjectData.title);
                        buildSidebarMenu(subjectData.menu); // Sidebar bouwen
                    } else {
                        console.warn(`Geen data gevonden voor modus: ${context.mode}`);
                    }
                }
            })
            .catch(err => console.error('Menu laden mislukt:', err))
            .finally(() => {
                // Zaken die ook zonder JSON moeten werken of erna komen
                initThemeLogic();
                initColorLogic();
                initSidebarInteractions(); // De klik-events voor de net gebouwde sidebar
                initTOC();
                initViewToggle(context);
                initLogoLink(rootPath);
            });
    }

    // --- HELPER: CONTEXT BEPALEN ---
    function getCurrentContext() {
        const path = window.location.pathname;
        // Verwachte structuur: .../subjects/[subjectNaam]/[min of ext]/...
        const parts = path.split('/');
        const subjectsIndex = parts.indexOf('subjects');

        if (subjectsIndex !== -1 && parts.length > subjectsIndex + 2) {
            return {
                subject: parts[subjectsIndex + 1], // bijv. "laravel12"
                mode: parts[subjectsIndex + 2],    // bijv. "min" of "ext"
                isFound: true
            };
        }
        return { isFound: false, subject: '', mode: 'min' };
    }

    // --- HELPER: ROOT PAD BEPALEN ---
    function getRootPath() {
        const path = window.location.pathname;
        const parts = path.split('/');
        const subjectsIndex = parts.indexOf('subjects');

        // Als we in 'subjects' zitten, moeten we terugrekenen naar de root
        if (subjectsIndex !== -1) {
            const depth = parts.length - (subjectsIndex + 1);
            return "../".repeat(depth);
        }
        return ""; // Al op root of onbekende structuur
    }

    // --- UI: HEADER & FOOTER TITELS ---
    function initHeaderAndFooter(title) {
        const headerTitle = document.getElementById('header-title');
        const footerTitle = document.getElementById('footer-title');

        if (headerTitle) headerTitle.textContent = " " + title;
        if (footerTitle) footerTitle.textContent = title + " Cheatsheet";
    }

    // --- UI: SIDEBAR BOUWEN (UIT JSON) ---
    function buildSidebarMenu(menuItems) {
        const navContainer = document.getElementById('dynamic-nav');
        if (!navContainer) return;
        navContainer.innerHTML = '';

        // --- FIX VOOR LINKS ---
        // Als we in een module-map zitten (bijv. /module1/), moeten we voor alle links "../" zetten
        // om terug te gaan naar de 'root' van de min/ext modus, anders plakken we paden aan elkaar vast.
        const path = window.location.pathname;
        const isInModuleSubfolder = path.includes('/module');
        const linkPrefix = isInModuleSubfolder ? "../" : "";

        menuItems.forEach(group => {
            // 1. Maak de groep (bijv. "Opdrachten")
            const groupDiv = document.createElement('div');
            groupDiv.className = 'nav-group';

            const h3 = document.createElement('h3');
            h3.textContent = group.title;
            groupDiv.appendChild(h3);

            // 2. Loop door items in de groep
            const itemContainer = document.createElement('div');
            itemContainer.className = 'nav-item-container';

            const ul = document.createElement('ul');
            ul.className = 'submenu';

            // Check of items in deze groep sub-items hebben (zoals modules)
            const hasSubItems = group.items.some(item => item.items && item.items.length > 0);

            if (hasSubItems) {
                // ACCORDION STIJL (Module 1, Module 2...)
                group.items.forEach(module => {
                    const moduleContainer = document.createElement('div');
                    moduleContainer.className = 'nav-item-container'; // Wrapper voor toggle

                    const button = document.createElement('button');
                    button.className = 'nav-toggle';
                    // Label in span voor CSS uitlijning
                    button.innerHTML = `<span>${module.label}</span><svg class="chevron" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>`;
                    moduleContainer.appendChild(button);

                    const subUl = document.createElement('ul');
                    subUl.className = 'submenu';

                    if(module.items) {
                        module.items.forEach(link => {
                            const li = document.createElement('li');
                            const a = document.createElement('a');
                            // HIER PASSEN WE DE PREFIX TOE
                            a.href = linkPrefix + link.url;
                            a.textContent = link.label;
                            checkActiveLink(a);
                            li.appendChild(a);
                            subUl.appendChild(li);
                        });
                    }
                    moduleContainer.appendChild(subUl);
                    groupDiv.appendChild(moduleContainer);
                });
            } else {
                // SIMPELE LIJST (Installatie -> Overzicht)
                ul.style.display = 'block';
                ul.style.paddingLeft = '0';

                group.items.forEach(link => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    // HIER PASSEN WE DE PREFIX TOE
                    a.href = linkPrefix + link.url;
                    a.textContent = link.label;
                    if(link.label === 'Overzicht') {
                        a.style.borderLeft = 'none';
                        a.style.paddingLeft = '0.75rem';
                    }
                    checkActiveLink(a);
                    li.appendChild(a);
                    ul.appendChild(li);
                });
                itemContainer.appendChild(ul);
                groupDiv.appendChild(itemContainer);
            }

            navContainer.appendChild(groupDiv);
        });
    }

    function checkActiveLink(aTag) {
        // Simpele check: komt de href overeen met het einde van de URL?
        const currentFile = window.location.pathname.split('/').pop();
        const linkFile = aTag.getAttribute('href').split('/').pop();

        if (currentFile && linkFile === currentFile) {
            aTag.classList.add('current');
        }
    }

    // --- SIDEBAR INTERACTIES ---
    function initSidebarInteractions() {
        // 1. Openklappen van het menu waar de huidige pagina in zit
        const currentLink = document.querySelector(".sidebar-nav a.current");
        if (currentLink) {
            const submenu = currentLink.closest(".submenu");
            if (submenu) {
                submenu.style.display = "block";
                const parentContainer = submenu.closest(".nav-item-container");
                if (parentContainer) {
                    parentContainer.classList.add("active");
                    setTimeout(() => {
                        parentContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            }
        }

        // 2. Toggles werkend maken
        const navToggles = document.querySelectorAll('.nav-toggle');
        navToggles.forEach(toggle => {
            toggle.onclick = () => {
                const container = toggle.closest('.nav-item-container');
                container.classList.toggle('active');

                const sub = container.querySelector('.submenu');
                if(sub) {
                    if(container.classList.contains('active')){
                        sub.style.display = 'block';
                    } else {
                        sub.style.display = 'none';
                    }
                }
            };
        });

        // 3. Mobile menu
        const menuBtn = document.getElementById('menu-toggle');
        const sidebarLeft = document.querySelector('.sidebar-left');
        const closeBtn = document.getElementById('close-sidebar');

        if(menuBtn && sidebarLeft) {
            menuBtn.onclick = () => sidebarLeft.classList.toggle('open');
            if(closeBtn) closeBtn.onclick = () => sidebarLeft.classList.remove('open');

            document.addEventListener('click', (e) => {
                if(window.innerWidth <= 768 && sidebarLeft.classList.contains('open') && !sidebarLeft.contains(e.target) && e.target !== menuBtn) {
                    sidebarLeft.classList.remove('open');
                }
            });
        }
    }

    // --- VIEW TOGGLE ---
    function initViewToggle(context) {
        const toggleBtn = document.getElementById('view-toggle');
        if (!toggleBtn || !context.isFound) return;

        const currentPath = window.location.pathname;
        const filename = currentPath.split("/").pop();
        let targetPath = '';
        let label = '';

        toggleBtn.style.display = '';

        if (context.mode === 'min') {
            targetPath = currentPath.replace('/min/', '/ext/');
            label = '🔄 Extended';
            if (!filename.includes('index.html') && !filename.includes('-ext.html')) {
                targetPath = targetPath.replace('.html', '-ext.html');
            }
        } else {
            targetPath = currentPath.replace('/ext/', '/min/');
            label = '🔄 Basis';
            targetPath = targetPath.replace('-ext.html', '.html');
        }

        toggleBtn.textContent = label;
        toggleBtn.onclick = () => window.location.href = targetPath;
    }

    // --- LOGO LINK ---
    function initLogoLink(rootPath) {
        const logoLink = document.getElementById('logo-link');
        if (logoLink) {
            const path = window.location.pathname;
            if (path.includes('/module')) {
                logoLink.href = "../index.html"; // 1 map omhoog uit module map
            } else {
                logoLink.href = "index.html"; // we zitten al op root level
            }
        }
    }

    // --- THEMA LOGICA ---
    function initThemeLogic() {
        const themeBtn = document.getElementById('theme-toggle');
        let savedTheme = localStorage.getItem('theme') || 'light';
        if (!themes.includes(savedTheme)) savedTheme = 'light';

        html.setAttribute('data-theme', savedTheme);
        updateThemeButtonText(themeBtn, savedTheme);

        if(themeBtn){
            themeBtn.addEventListener('click', () => {
                let current = html.getAttribute('data-theme');
                let index = themes.indexOf(current);
                let nextTheme = themes[(index + 1) % themes.length];

                html.setAttribute('data-theme', nextTheme);
                localStorage.setItem('theme', nextTheme);
                updateThemeButtonText(themeBtn, nextTheme);
            });
        }
    }

    function updateThemeButtonText(btn, theme) {
        if(!btn) return;
        const labels = { 'light': '☀️ Light', 'dark': '🌙 Laravel Dark', 'material': '🌑 Material', 'monokai': '👾 Monokai', 'night-owl': '🦉 Night Owl' };
        btn.textContent = labels[theme] || 'Thema';
    }

    // --- KLEUR LOGICA ---
    function initColorLogic() {
        const colorBtn = document.getElementById('color-toggle');
        let savedColor = localStorage.getItem('color') || 'red';
        if (!colors.includes(savedColor)) savedColor = 'red';

        html.setAttribute('data-color', savedColor);
        updateColorButtonText(colorBtn, savedColor);

        if(colorBtn) {
            colorBtn.addEventListener('click', () => {
                let current = html.getAttribute('data-color');
                let index = colors.indexOf(current);
                let nextColor = colors[(index + 1) % colors.length];

                html.setAttribute('data-color', nextColor);
                localStorage.setItem('color', nextColor);
                updateColorButtonText(colorBtn, nextColor);
            });
        }
    }

    function updateColorButtonText(btn, color) {
        if(!btn) return;
        const label = color.charAt(0).toUpperCase() + color.slice(1);
        btn.textContent = `🎨 ${label}`;
    }

    // --- TABLE OF CONTENTS LOGICA ---
    function initTOC() {
        const content = document.querySelector('.main-content');
        const sidebarRight = document.querySelector('.sidebar-right');

        if (content && sidebarRight) {
            sidebarRight.innerHTML = '';
            const tocContainer = document.createElement('div');
            tocContainer.className = 'toc-container';

            const tocTitle = document.createElement('h4');
            tocTitle.textContent = 'Inhoud';
            tocContainer.appendChild(tocTitle);

            const ul = document.createElement('ul');
            ul.className = 'toc-list';
            ul.id = 'toc-list';
            tocContainer.appendChild(ul);
            sidebarRight.appendChild(tocContainer);

            const headers = content.querySelectorAll('h2, h3');
            headers.forEach((header, index) => {
                if (!header.id) header.id = `section-${index}`;

                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#${header.id}`;
                a.textContent = header.textContent.replace(/^#\s?/, '');

                if(header.tagName === 'H3') {
                    a.style.paddingLeft = '1rem';
                    a.style.fontSize = '0.85rem';
                }

                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById(header.id).scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.pushState(null, null, `#${header.id}`);
                });
                li.appendChild(a);
                ul.appendChild(li);
            });

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        document.querySelectorAll('.toc-list a').forEach(link => {
                            link.classList.remove('active');
                            if(link.getAttribute('href') === `#${entry.target.id}`) {
                                link.classList.add('active');
                            }
                        });
                    }
                });
            }, { rootMargin: '-100px 0px -70% 0px' });

            headers.forEach(header => observer.observe(header));
        }
    }
});