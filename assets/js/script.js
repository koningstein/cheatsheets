document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialiseer Syntax Highlighting
    if (window.hljs) hljs.highlightAll();

    const html = document.documentElement;
    const themes = ['light', 'dark', 'material', 'monokai', 'night-owl'];
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'teal', 'darkblue'];

    // --- INCLUDE SYSTEM ---
    const includeElements = document.querySelectorAll("[data-include]");
    let includesPending = includeElements.length;

    if (includesPending === 0) {
        initPageLogic();
    } else {
        includeElements.forEach(el => {
            const filePath = el.getAttribute("data-include");
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
                    if (includesPending === 0) initPageLogic();
                });
        });
    }

    // --- HOOFD LOGICA ---
    function initPageLogic() {
        const context = getCurrentContext();
        const rootPath = getRootPath();

        fetch(rootPath + 'data/navigation.json')
            .then(response => {
                if (!response.ok) throw new Error("Kon navigation.json niet vinden");
                return response.json();
            })
            .then(data => {
                // UI Bouwen als we context hebben
                if (context.isFound && data[context.subject]) {
                    const subjectData = data[context.subject][context.mode];
                    if (subjectData) {
                        initHeaderAndFooter(subjectData.title);
                        buildSidebarMenu(subjectData.menu);

                        // NU PASSEN WE DATA MEE AAN DE TOGGLE
                        initViewToggle(context, data);
                    }
                }
            })
            .catch(err => console.error('Menu laden mislukt:', err))
            .finally(() => {
                initThemeLogic();
                initColorLogic();
                initSidebarInteractions();
                initTOC();
                initLogoLink(rootPath);
            });
    }

    function getCurrentContext() {
        const path = window.location.pathname;
        const parts = path.split('/');
        const subjectsIndex = parts.indexOf('subjects');
        if (subjectsIndex !== -1 && parts.length > subjectsIndex + 2) {
            return {
                subject: parts[subjectsIndex + 1],
                mode: parts[subjectsIndex + 2],
                isFound: true
            };
        }
        return { isFound: false, subject: '', mode: 'min' };
    }

    function getRootPath() {
        const path = window.location.pathname;
        const parts = path.split('/');
        const subjectsIndex = parts.indexOf('subjects');
        if (subjectsIndex !== -1) {
            const depth = parts.length - (subjectsIndex + 1);
            return "../".repeat(depth);
        }
        return "";
    }

    function initHeaderAndFooter(title) {
        const headerTitle = document.getElementById('header-title');
        const footerTitle = document.getElementById('footer-title');
        if (headerTitle) headerTitle.textContent = " " + title;
        if (footerTitle) footerTitle.textContent = title + " Cheatsheet";
    }

    function buildSidebarMenu(menuItems) {
        const navContainer = document.getElementById('dynamic-nav');
        if (!navContainer) return;
        navContainer.innerHTML = '';

        const path = window.location.pathname;
        const isInModuleSubfolder = path.includes('/module');
        const linkPrefix = isInModuleSubfolder ? "../" : "";

        // Helper om (Ext) uit de label te halen
        const cleanLabel = (lbl) => lbl ? lbl.replace(' (Ext)', '') : '';

        menuItems.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'nav-group';

            const h3 = document.createElement('h3');
            h3.textContent = group.title;
            groupDiv.appendChild(h3);

            const itemContainer = document.createElement('div');
            itemContainer.className = 'nav-item-container';

            const ul = document.createElement('ul');
            ul.className = 'submenu';

            const hasSubItems = group.items.some(item => item.items && item.items.length > 0);

            if (hasSubItems) {
                group.items.forEach(module => {
                    const moduleContainer = document.createElement('div');
                    moduleContainer.className = 'nav-item-container';

                    const button = document.createElement('button');
                    button.className = 'nav-toggle';
                    button.innerHTML = `<span>${cleanLabel(module.label)}</span><svg class="chevron" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>`;
                    moduleContainer.appendChild(button);

                    const subUl = document.createElement('ul');
                    subUl.className = 'submenu';

                    if (module.items) {
                        module.items.forEach(link => {
                            const li = document.createElement('li');
                            const a = document.createElement('a');
                            a.href = linkPrefix + link.url;
                            a.textContent = cleanLabel(link.label);
                            checkActiveLink(a);
                            li.appendChild(a);
                            subUl.appendChild(li);
                        });
                    }
                    moduleContainer.appendChild(subUl);
                    groupDiv.appendChild(moduleContainer);
                });
            } else {
                ul.style.display = 'block';
                ul.style.paddingLeft = '0';
                group.items.forEach(link => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = linkPrefix + link.url;
                    a.textContent = cleanLabel(link.label);
                    if (link.label === 'Overzicht') {
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
        const currentFile = window.location.pathname.split('/').pop();
        const linkFile = aTag.getAttribute('href').split('/').pop();
        if (currentFile && linkFile === currentFile) {
            aTag.classList.add('current');
        }
    }

    function initSidebarInteractions() {
        const currentLink = document.querySelector(".sidebar-nav a.current");
        if (currentLink) {
            const submenu = currentLink.closest(".submenu");
            if (submenu) {
                submenu.style.display = "block";
                const parentContainer = submenu.closest(".nav-item-container");
                if (parentContainer) {
                    parentContainer.classList.add("active");
                    setTimeout(() => parentContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
                }
            }
        }
        document.querySelectorAll('.nav-toggle').forEach(toggle => {
            toggle.onclick = () => {
                const container = toggle.closest('.nav-item-container');
                container.classList.toggle('active');
                const sub = container.querySelector('.submenu');
                if (sub) sub.style.display = container.classList.contains('active') ? 'block' : 'none';
            };
        });
        const menuBtn = document.getElementById('menu-toggle');
        const sidebarLeft = document.querySelector('.sidebar-left');
        const closeBtn = document.getElementById('close-sidebar');
        if (menuBtn && sidebarLeft) {
            menuBtn.onclick = () => sidebarLeft.classList.toggle('open');
            if (closeBtn) closeBtn.onclick = () => sidebarLeft.classList.remove('open');
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && sidebarLeft.classList.contains('open') && !sidebarLeft.contains(e.target) && e.target !== menuBtn) {
                    sidebarLeft.classList.remove('open');
                }
            });
        }
    }

    // --- VIEW TOGGLE: JSON BASED CHECK ---
    function initViewToggle(context, fullData) {
        const toggleBtn = document.getElementById('view-toggle');
        if (!toggleBtn || !context.isFound) return;

        const targetMode = context.mode === 'min' ? 'ext' : 'min';
        toggleBtn.textContent = (targetMode === 'ext') ? '🔄 Extended' : '🔄 Basis';
        toggleBtn.style.display = '';

        toggleBtn.onclick = (e) => {
            e.preventDefault();

            // 1. Basispad bepalen (het deel voor /min/ of /ext/)
            const currentPath = window.location.pathname;
            const splitKey = '/' + context.mode + '/';
            const parts = currentPath.split(splitKey);
            const basePath = parts[0];
            // parts[1] is bijv: 'module6/m6-1.html' of 'index.html'
            let relativePath = parts[1];

            // 2. Bestandsnaam transformeren
            if (context.mode === 'min') {
                // min -> ext
                if (!relativePath.includes('index.html')) {
                    relativePath = relativePath.replace('.html', '-ext.html');
                }
            } else {
                // ext -> min
                relativePath = relativePath.replace('-ext.html', '.html');
            }

            // 3. Check in de JSON of deze pagina bestaat in de target navigatie
            const targetMenu = fullData[context.subject][targetMode].menu;
            const exists = isUrlInMenu(targetMenu, relativePath);

            // 4. Navigeren
            if (exists) {
                // Hij staat in het menu, dus we gaan erheen
                window.location.href = basePath + '/' + targetMode + '/' + relativePath;
            } else {
                // Hij staat niet in het menu, fallback naar index
                console.warn('Pagina niet gevonden in menu van doel-modus, fallback naar index.');
                window.location.href = basePath + '/' + targetMode + '/index.html';
            }
        };
    }

    // Recursieve functie om URL te zoeken in menu structuur
    function isUrlInMenu(menuItems, urlToFind) {
        if (!menuItems) return false;
        for (const item of menuItems) {
            if (item.url === urlToFind) return true;
            if (item.items) {
                if (isUrlInMenu(item.items, urlToFind)) return true;
            }
        }
        return false;
    }

    function initLogoLink(rootPath) {
        const logoLink = document.getElementById('logo-link');
        if (logoLink) {
            const path = window.location.pathname;
            if (path.includes('/module')) {
                logoLink.href = "../index.html";
            } else {
                logoLink.href = "index.html";
            }
        }
    }

    function initThemeLogic() {
        const themeBtn = document.getElementById('theme-toggle');
        let savedTheme = localStorage.getItem('theme') || 'light';
        if (!themes.includes(savedTheme)) savedTheme = 'light';
        html.setAttribute('data-theme', savedTheme);
        updateThemeButtonText(themeBtn, savedTheme);
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                let current = html.getAttribute('data-theme');
                let nextTheme = themes[(themes.indexOf(current) + 1) % themes.length];
                html.setAttribute('data-theme', nextTheme);
                localStorage.setItem('theme', nextTheme);
                updateThemeButtonText(themeBtn, nextTheme);
            });
        }
    }

    function updateThemeButtonText(btn, theme) {
        if (!btn) return;
        const labels = { 'light': '☀️ Light', 'dark': '🌙 Laravel Dark', 'material': '🌑 Material', 'monokai': '👾 Monokai', 'night-owl': '🦉 Night Owl' };
        btn.textContent = labels[theme] || 'Thema';
    }

    function initColorLogic() {
        const colorBtn = document.getElementById('color-toggle');
        let savedColor = localStorage.getItem('color') || 'red';
        if (!colors.includes(savedColor)) savedColor = 'red';
        html.setAttribute('data-color', savedColor);
        updateColorButtonText(colorBtn, savedColor);
        if (colorBtn) {
            colorBtn.addEventListener('click', () => {
                let current = html.getAttribute('data-color');
                let nextColor = colors[(colors.indexOf(current) + 1) % colors.length];
                html.setAttribute('data-color', nextColor);
                localStorage.setItem('color', nextColor);
                updateColorButtonText(colorBtn, nextColor);
            });
        }
    }

    function updateColorButtonText(btn, color) {
        if (!btn) return;
        const label = color.charAt(0).toUpperCase() + color.slice(1);
        btn.textContent = `🎨 ${label}`;
    }

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
                if (header.tagName === 'H3') {
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
                            if (link.getAttribute('href') === `#${entry.target.id}`) {
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