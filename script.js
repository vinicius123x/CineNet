// ==========================================
// INFRAESTRUTURA CORE & CHAVES
// ==========================================
const TMDB_KEY = '17c56e3825d7fbae6581866083d0d778'; 
let itemSelecionado = null;
let debounceTimer; 
let currentUserUID = null;
let biblioteca = { watchlist: {}, reviews: {}, perfil: {} };
let isLoginMode = false; // ALTERADO: Inicia por padrão no modo de Criar Conta (Registar)

const ADMIN_EMAIL = "roberci.azevedo@academico.ifpb.edu.br"; 

// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAfPWvnGdvPKZ_lrVwOuag14WHLY9AgML8",
    authDomain: "cinenet-ifpb.firebaseapp.com",
    databaseURL: "https://cinenet-ifpb-default-rtdb.firebaseio.com",
    projectId: "cinenet-ifpb",
    storageBucket: "cinenet-ifpb.firebasestorage.app",
    messagingSenderId: "1098247355110",
    appId: "1:1098247355110:web:c9f867826f26b0ef171927"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
});

// ==========================================
// AUTENTICAÇÃO E SESSÃO
// ==========================================

// Alternar entre Criar Conta e Entrar
document.getElementById('auth-switch-btn').addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    ocultarErroAuth();
    
    document.getElementById('auth-title').innerText = isLoginMode ? 'Entrar' : 'Criar Conta';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Entrar' : 'Criar Conta';
    document.getElementById('auth-switch-text').innerText = isLoginMode ? 'Novo por aqui?' : 'Já tem uma conta?';
    document.getElementById('auth-switch-btn').innerText = isLoginMode ? 'Registe-se agora.' : 'Entrar';
});

// Alternar visibilidade da senha (Ver/Ocultar Senha)
document.getElementById('btn-toggle-password').addEventListener('click', () => {
    const pwdInput = document.getElementById('auth-password');
    const btnToggle = document.getElementById('btn-toggle-password');
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        btnToggle.innerText = '🙈';
    } else {
        pwdInput.type = 'password';
        btnToggle.innerText = '👁️';
    }
});

// Submeter formulário (Criar Conta ou Login)
document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    ocultarErroAuth();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (isLoginMode) {
        // Modo Login
        firebase.auth().signInWithEmailAndPassword(email, password)
            .catch(err => exibirErroAuth(err));
    } else {
        // Modo Criar Conta (Entra automaticamente ao concluir)
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .catch(err => exibirErroAuth(err));
    }
});

// Entrar como Convidado (Com suporte a Fallback Local)
document.getElementById('btn-guest-auth').addEventListener('click', () => {
    ocultarErroAuth();
    
    // Tenta entrar via Firebase Anônimo
    firebase.auth().signInAnonymously().catch(err => {
        console.warn("Aviso: Login anônimo do Firebase indisponível. Entrando no modo convidado local.", err);
        // Fallback: entra diretamente sem depender do servidor Firebase
        iniciarSessaoConvidadoLocal();
    });
});

// Função para iniciar sessão de convidado offline/local
function iniciarSessaoConvidadoLocal() {
    currentUserUID = "guest_" + Math.random().toString(36).substring(2, 9);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    carregarDadosUsuario(true);
    irParaHome();
}

// Tratar erros do Firebase e traduzir em avisos claros
function exibirErroAuth(err) {
    const errorEl = document.getElementById('auth-error');
    let mensagem = "Ocorreu um erro ao processar. Tente novamente.";

    // Imprime o erro exato na consola para facilitar a depuração (F12)
    console.error("Erro capturado pelo Firebase:", err.code, err.message);

    switch(err.code) {
        case 'auth/user-not-found':
            mensagem = "⚠️ Esta conta não existe. Verifique o e-mail ou crie uma nova conta.";
            break;
        case 'auth/wrong-password':
            mensagem = "⚠️ Senha incorreta. Verifique os dados e tente novamente.";
            break;
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials': // Adicionado para cobrir atualizações de segurança do Firebase
            mensagem = "⚠️ E-mail ou senha incorretos. Verifique os seus dados.";
            break;
        case 'auth/invalid-email':
            mensagem = "⚠️ Por favor, digite um endereço de e-mail válido.";
            break;
        case 'auth/email-already-in-use':
            mensagem = "⚠️ Este e-mail já está registrado. Escolha a opção 'Entrar'.";
            break;
        case 'auth/weak-password':
            mensagem = "⚠️ A senha deve ter pelo menos 6 caracteres.";
            break;
        case 'auth/internal-error':
            mensagem = "⚠️ Erro interno do servidor. Verifique a sua conexão e tente novamente.";
            break;
        default:
            // Caso o erro não esteja mapeado no switch, mostra a mensagem original do Firebase em vez de falhar em silêncio
            mensagem = "⚠️ " + (err.message || mensagem);
    }

    // Exibe o elemento na tela
    errorEl.innerText = mensagem;
    errorEl.style.display = 'block';
}

function ocultarErroAuth() {
    const errorEl = document.getElementById('auth-error');
    errorEl.style.display = 'none';
    errorEl.innerText = '';
}

// Listener global de autenticação
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        carregarDadosUsuario(user.isAnonymous);
        irParaHome();
    } else {
        currentUserUID = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

function logout() { 
    if (firebase.auth().currentUser) {
        firebase.auth().signOut(); 
    } else {
        currentUserUID = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
}

function carregarDadosUsuario(isAnonymous = false) {
    if (isAnonymous) {
        biblioteca = {
            watchlist: {},
            reviews: {},
            perfil: { nome: "Convidado 👤", avatar: avataresSeguros[0] }
        };
        atualizarNavBar();
        return;
    }

    firebase.database().ref('users/' + currentUserUID + '/biblioteca').once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) biblioteca = data;
        if (!biblioteca.watchlist) biblioteca.watchlist = {};
        if (!biblioteca.reviews) biblioteca.reviews = {};
        if (!biblioteca.perfil) biblioteca.perfil = { nome: "Utilizador", avatar: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" };
        atualizarNavBar();
    });
}

function salvarDados() {
    if (currentUserUID && (!firebase.auth().currentUser || !firebase.auth().currentUser.isAnonymous)) {
        firebase.database().ref('users/' + currentUserUID + '/biblioteca').set(biblioteca);
    }
}

// ==========================================
// SISTEMA DE PERFIL
// ==========================================
const avataresSeguros = [
    "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e50914",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=1f1f1f",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1&backgroundColor=b20710",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gamer&backgroundColor=000000"
];
let avatarTemporario = "";

function atualizarNavBar() {
    document.getElementById('user-name-pc').innerText = biblioteca.perfil.nome || "Utilizador";
    document.getElementById('user-avatar-pc').src = biblioteca.perfil.avatar || avataresSeguros[0];
}

function abrirModalPerfil() {
    document.getElementById('input-profile-name').value = biblioteca.perfil.nome || "Utilizador";
    document.getElementById('input-profile-url').value = "";
    avatarTemporario = biblioteca.perfil.avatar || avataresSeguros[0];
    renderizarGrelhaAvatares();
    document.getElementById('profileModal').style.display = 'flex';
    document.body.classList.add('modal-open');
}

function fecharModalPerfil() {
    document.getElementById('profileModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

function renderizarGrelhaAvatares() {
    const grid = document.getElementById('default-avatars-grid');
    grid.innerHTML = '';
    avataresSeguros.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'avatar-option';
        if (url === avatarTemporario) img.classList.add('selected');
        img.onclick = () => {
            avatarTemporario = url;
            document.getElementById('input-profile-url').value = "";
            renderizarGrelhaAvatares();
        };
        grid.appendChild(img);
    });
}

function salvarPerfil() {
    const novoNome = document.getElementById('input-profile-name').value.trim();
    const customUrl = document.getElementById('input-profile-url').value.trim();
    biblioteca.perfil.nome = novoNome || "Utilizador";
    biblioteca.perfil.avatar = customUrl !== "" ? customUrl : avatarTemporario;
    atualizarNavBar();
    salvarDados();
    fecharModalPerfil();
}

// ==========================================
// NAVEGAÇÃO E SUBMENU MOBILE
// ==========================================

function toggleSubmenu() {
    const submenu = document.getElementById('mobile-submenu');
    if(submenu) {
        submenu.classList.toggle('ativa');
    }
}

function setNavActive(idDesktop, idMobile) {
    document.querySelectorAll('.nav-menu a, .mobile-bottom-nav a').forEach(el => el.classList.remove('active', 'active-nav'));
    if(idDesktop && document.getElementById(idDesktop)) document.getElementById(idDesktop).classList.add('active');
    if(idMobile && document.getElementById(idMobile)) document.getElementById(idMobile).classList.add('active-nav');
}

function esconderTodasSessoes() {
    const sessoes = ['main-content', 'movies-section', 'series-section', 'animes-section', 'doramas-section', 'search-results-section', 'watchlist-section', 'chat-section'];
    sessoes.forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).style.display = 'none';
    });
}

function irParaHome() { setNavActive('nav-home', 'mob-nav-home'); esconderTodasSessoes(); document.getElementById('main-content').style.display = 'block'; carregarHome(); }
function irParaFilmes() { setNavActive('nav-movies', 'mob-nav-titulos'); esconderTodasSessoes(); document.getElementById('movies-section').style.display = 'block'; carregarFilmes(); }
function irParaSeries() { setNavActive('nav-series', 'mob-nav-titulos'); esconderTodasSessoes(); document.getElementById('series-section').style.display = 'block'; carregarSeries(); }
function irParaAnimes() { setNavActive('nav-animes', 'mob-nav-titulos'); esconderTodasSessoes(); document.getElementById('animes-section').style.display = 'block'; carregarAnimes(); }
function irParaDoramas() { setNavActive('nav-doramas', 'mob-nav-titulos'); esconderTodasSessoes(); document.getElementById('doramas-section').style.display = 'block'; carregarDoramas(); }
function irParaBusca() { setNavActive('nav-search', 'mob-nav-search'); esconderTodasSessoes(); document.getElementById('search-results-section').style.display = 'block'; }
function irParaWatchlist() { setNavActive('nav-watchlist', 'mob-nav-titulos'); esconderTodasSessoes(); document.getElementById('watchlist-section').style.display = 'block'; renderizarWatchlist(); }
function irParaChat() { setNavActive(null, 'mob-nav-chat'); esconderTodasSessoes(); document.getElementById('chat-section').style.display = 'block'; }

if(document.getElementById('nav-home')) document.getElementById('nav-home').onclick = irParaHome;
if(document.getElementById('mob-nav-home')) document.getElementById('mob-nav-home').onclick = irParaHome;
if(document.getElementById('nav-movies')) document.getElementById('nav-movies').onclick = irParaFilmes;
if(document.getElementById('nav-series')) document.getElementById('nav-series').onclick = irParaSeries;
if(document.getElementById('nav-animes')) document.getElementById('nav-animes').onclick = irParaAnimes;
if(document.getElementById('nav-doramas')) document.getElementById('nav-doramas').onclick = irParaDoramas;
if(document.getElementById('nav-search')) document.getElementById('nav-search').onclick = irParaBusca;
if(document.getElementById('nav-watchlist')) document.getElementById('nav-watchlist').onclick = irParaWatchlist;
if(document.getElementById('nav-chat')) document.getElementById('nav-chat').onclick = irParaChat;
if(document.getElementById('mob-nav-chat')) document.getElementById('mob-nav-chat').onclick = irParaChat;

function scrollCarousel(rowId, direction) {
    const row = document.getElementById(rowId);
    if(row) {
        const scrollAmount = row.clientWidth * 0.8; 
        row.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
    }
}

// ==========================================
// TMDB FETCH & RENDER
// ==========================================
async function fetchTMDB(endpoint) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=pt-BR`);
        return await res.json();
    } catch { return { results: [] }; }
}

function renderCards(items, containerId, forceType = null) {
    const container = document.getElementById(containerId);
    if(!container || !items) return;
    container.innerHTML = '';
    items.forEach(item => {
        if (!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">`;
        card.onclick = () => abrirDetalhes(item.id, forceType || item.media_type || 'movie');
        container.appendChild(card);
    });
}

// CARREGAR SEÇÕES
async function carregarHome() {
    const dataTrending = await fetchTMDB('/trending/all/day');
    if (dataTrending.results.length > 0) {
        const hero = dataTrending.results[0];
        document.getElementById('hero-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${hero.backdrop_path})`;
        document.getElementById('hero-title').innerText = hero.title || hero.name;
        document.getElementById('hero-desc').innerText = hero.overview || "Sem descrição disponível.";
        document.getElementById('hero-play-btn').onclick = () => abrirDetalhes(hero.id, hero.media_type || 'movie', true);
        document.getElementById('hero-info-btn').onclick = () => abrirDetalhes(hero.id, hero.media_type || 'movie');
    }
    renderCards(dataTrending.results, 'row-trending');
    fetchTMDB('/discover/movie?with_genres=28').then(d => renderCards(d.results, 'row-acao', 'movie'));
    fetchTMDB('/discover/movie?with_genres=878').then(d => renderCards(d.results, 'row-ficcao', 'movie'));
    fetchTMDB('/discover/movie?with_genres=27').then(d => renderCards(d.results, 'row-terror', 'movie'));
    fetchTMDB('/discover/movie?with_genres=10749').then(d => renderCards(d.results, 'row-romance', 'movie'));
    fetchTMDB('/discover/movie?with_genres=9648').then(d => renderCards(d.results, 'row-misterio', 'movie'));
    fetchTMDB('/discover/movie?with_genres=35').then(d => renderCards(d.results, 'row-comedia', 'movie'));
    fetchTMDB('/discover/movie?with_genres=16').then(d => renderCards(d.results, 'row-animacao', 'movie'));
}

function carregarFilmes() {
    fetchTMDB('/movie/popular').then(d => renderCards(d.results, 'row-filmes-populares', 'movie'));
    fetchTMDB('/discover/movie?with_genres=28').then(d => renderCards(d.results, 'row-filmes-acao', 'movie'));
    fetchTMDB('/discover/movie?with_genres=35').then(d => renderCards(d.results, 'row-filmes-comedia', 'movie'));
    fetchTMDB('/discover/movie?with_genres=27').then(d => renderCards(d.results, 'row-filmes-terror', 'movie'));
    fetchTMDB('/discover/movie?with_genres=10749').then(d => renderCards(d.results, 'row-filmes-romance', 'movie'));
    fetchTMDB('/discover/movie?with_genres=878').then(d => renderCards(d.results, 'row-filmes-ficcao', 'movie'));
}

function carregarSeries() {
    fetchTMDB('/tv/popular').then(d => renderCards(d.results, 'row-series-populares', 'tv'));
    fetchTMDB('/discover/tv?with_genres=10759').then(d => renderCards(d.results, 'row-series-acao', 'tv'));
    fetchTMDB('/discover/tv?with_genres=18').then(d => renderCards(d.results, 'row-series-drama', 'tv'));
    fetchTMDB('/discover/tv?with_genres=9648').then(d => renderCards(d.results, 'row-series-misterio', 'tv'));
    fetchTMDB('/discover/tv?with_genres=35').then(d => renderCards(d.results, 'row-series-comedia', 'tv'));
    fetchTMDB('/discover/tv?with_genres=10765').then(d => renderCards(d.results, 'row-series-ficcao', 'tv')); 
}

function carregarAnimes() {
    fetchTMDB('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc').then(d => renderCards(d.results, 'row-animes-populares', 'tv'));
    fetchTMDB('/discover/tv?with_genres=16,10759&with_original_language=ja').then(d => renderCards(d.results, 'row-animes-acao', 'tv'));
    fetchTMDB('/discover/tv?with_genres=16,10765&with_original_language=ja').then(d => renderCards(d.results, 'row-animes-fantasia', 'tv'));
    fetchTMDB('/discover/tv?with_genres=16,35&with_original_language=ja').then(d => renderCards(d.results, 'row-animes-comedia', 'tv'));
}

function carregarDoramas() {
    fetchTMDB('/discover/tv?with_original_language=ko&sort_by=popularity.desc').then(d => renderCards(d.results, 'row-doramas-populares', 'tv'));
    fetchTMDB('/discover/tv?with_original_language=ko&with_genres=10749').then(d => renderCards(d.results, 'row-doramas-romance', 'tv'));
    fetchTMDB('/discover/tv?with_original_language=ko&with_genres=35').then(d => renderCards(d.results, 'row-doramas-comedia', 'tv'));
    fetchTMDB('/discover/tv?with_original_language=ko&with_genres=18').then(d => renderCards(d.results, 'row-doramas-drama', 'tv'));
    fetchTMDB('/discover/tv?with_original_language=ko&with_genres=9648').then(d => renderCards(d.results, 'row-doramas-misterio', 'tv'));
}

// BUSCA
let filtroBuscaAtual = 'all';
function setSearchFilter(tipo, el) {
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    filtroBuscaAtual = tipo;
    executarBusca(document.getElementById('main-search-input').value);
}

document.getElementById('main-search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const termo = e.target.value;
    document.getElementById('search-clear').style.display = termo.length > 0 ? 'block' : 'none';
    debounceTimer = setTimeout(() => { if (termo.length >= 2) executarBusca(termo); }, 500);
});

function limparBusca() {
    document.getElementById('main-search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    document.getElementById('search-grid').innerHTML = '';
    document.getElementById('search-empty-state').style.display = 'none';
}

async function executarBusca(termo) {
    const container = document.getElementById('search-grid');
    container.innerHTML = '';
    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(termo)}`);
    
    let resultados = data.results.filter(i => i.poster_path && (i.media_type === 'movie' || i.media_type === 'tv'));
    if(filtroBuscaAtual !== 'all') resultados = resultados.filter(i => i.media_type === filtroBuscaAtual);

    if (resultados.length === 0) document.getElementById('search-empty-state').style.display = 'block';
    else {
        document.getElementById('search-empty-state').style.display = 'none';
        resultados.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">`;
            card.onclick = () => abrirDetalhes(item.id, item.media_type || 'movie');
            container.appendChild(card);
        });
    }
}

// ==========================================
// MODAL DE DETALHES
// ==========================================
async function abrirDetalhes(id, tipo, diretoplay = false) {
    const [data, credits, recs, ageData, dataEn] = await Promise.all([
        fetchTMDB(`/${tipo}/${id}`),
        fetchTMDB(`/${tipo}/${id}/credits`),
        fetchTMDB(`/${tipo}/${id}/recommendations`),
        fetchTMDB(`/${tipo}/${id}/${tipo === 'movie' ? 'release_dates' : 'content_ratings'}`),
        fetch(`https://api.themoviedb.org/3/${tipo}/${id}?api_key=${TMDB_KEY}&language=en-US`).then(r => r.json()).catch(() => ({}))
    ]);

    itemSelecionado = { id: id, tipo: tipo, poster_path: data.poster_path, title: data.title || data.name };
    
    document.getElementById('modal-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path || data.poster_path})`;
    document.getElementById('modal-title').innerText = itemSelecionado.title;
    document.getElementById('modal-year').innerText = (data.release_date || data.first_air_date || 'N/A').substring(0,4);
    document.getElementById('modal-rating').innerText = `⭐ ${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}`;
    
    let ageRating = 'N/A';
    if (tipo === 'movie') {
        const localRelease = ageData.results?.find(r => r.iso_3166_1 === 'BR' || r.iso_3166_1 === 'PT' || r.iso_3166_1 === 'US');
        if(localRelease && localRelease.release_dates && localRelease.release_dates.length > 0) {
            ageRating = localRelease.release_dates[0].certification || ageRating;
        }
    } else {
        const localRating = ageData.results?.find(r => r.iso_3166_1 === 'BR' || r.iso_3166_1 === 'PT' || r.iso_3166_1 === 'US');
        if(localRating && localRating.rating) {
            ageRating = localRating.rating;
        }
    }
    if(!ageRating || ageRating === '') ageRating = 'Livre';
    document.getElementById('modal-age-rating').innerText = ageRating;

    let durationText = '';
    if (tipo === 'movie') {
        const runtime = data.runtime || 0;
        const h = Math.floor(runtime / 60);
        const m = runtime % 60;
        durationText = runtime > 0 ? `${h}h ${m}m` : 'N/A';
    } else {
        if (data.number_of_seasons > 1) {
            durationText = `${data.number_of_seasons} Temporadas`;
        } else {
            durationText = `${data.number_of_episodes || 0} Episódios`;
        }
    }
    document.getElementById('modal-duration').innerText = durationText;

    document.getElementById('modal-genres').innerText = data.genres && data.genres.length > 0 ? data.genres.map(g => g.name).join(', ') : 'Não classificado';
    document.getElementById('modal-cast').innerText = credits.cast && credits.cast.length > 0 ? credits.cast.slice(0, 6).map(c => c.name).join(', ') : 'Elenco não disponível';
    
    document.getElementById('modal-overview').innerText = data.overview && data.overview.trim() !== "" ? data.overview : "Sinopse não disponível para este título.";
    document.getElementById('btn-watchlist').innerText = biblioteca.watchlist[id] ? "✔ Na Minha Lista" : "+ A Minha Lista";

    const epSection = document.getElementById('modal-episodes-section');
    if (tipo === 'tv') {
        epSection.style.display = 'block';
        const seasonSelect = document.getElementById('modal-season-select');
        seasonSelect.innerHTML = '';
        
        const validSeasons = data.seasons ? data.seasons.filter(s => s.season_number > 0) : [];
        const validSeasonsEn = dataEn.seasons ? dataEn.seasons.filter(s => s.season_number > 0) : [];
        
        if (validSeasons.length >= 1) {
            seasonSelect.style.display = 'block';
            validSeasons.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.season_number;
                
                let seasonName = s.name;
                const enSeason = validSeasonsEn.find(es => es.season_number === s.season_number);
                
                if (enSeason && enSeason.name) {
                    if ((!seasonName || seasonName.toLowerCase().startsWith('temporada') || seasonName.toLowerCase() === `season ${s.season_number}`) && 
                        !enSeason.name.toLowerCase().startsWith('season')) {
                        seasonName = enSeason.name;
                    }
                }

                opt.innerText = seasonName ? seasonName : `Temporada ${s.season_number}`;
                seasonSelect.appendChild(opt);
            });
        } else {
            seasonSelect.style.display = 'none'; 
        }

        const firstSeason = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
        carregarEpisodios(id, firstSeason);

        seasonSelect.onchange = (e) => carregarEpisodios(id, e.target.value);
        document.getElementById('modal-play-btn').onclick = () => abrirPlayer(id, 'tv', seasonSelect.value || firstSeason, 1);
    } else {
        epSection.style.display = 'none';
        document.getElementById('modal-play-btn').onclick = () => abrirPlayer(id, 'movie');
    }

    if(recs && recs.results && recs.results.length > 0) {
        renderCards(recs.results.slice(0, 15), 'modal-recs-row', tipo);
    } else {
        document.getElementById('modal-recs-row').innerHTML = '<p style="color:#888;">Sem sugestões no momento.</p>';
    }

    if (diretoplay) {
        if(tipo === 'tv') abrirPlayer(id, 'tv', 1, 1);
        else abrirPlayer(id, 'movie');
    } else { 
        document.getElementById('detailsModal').style.display = 'flex'; 
        document.body.classList.add('modal-open'); 
        document.querySelector('.details-card').scrollTop = 0; 
    }
}

async function carregarEpisodios(tvId, seasonNumber) {
    const epList = document.getElementById('modal-episodes-list');
    epList.innerHTML = '<p style="color:#888; text-align: center; padding: 20px;">A carregar episódios...</p>';
    
    try {
        let seasonData = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
        
        if (seasonData.episodes && seasonData.episodes.length > 0) {
            if (!seasonData.episodes[0].overview || seasonData.episodes[0].overview.trim() === "") {
                const fallbackRes = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_KEY}&language=en-US`);
                const fallbackData = await fallbackRes.json();
                
                seasonData.episodes.forEach((ep, i) => {
                    if (fallbackData.episodes && fallbackData.episodes[i]) {
                        if (!ep.name || ep.name.trim() === "" || ep.name.toLowerCase().startsWith('episódio')) {
                            ep.name = fallbackData.episodes[i].name;
                        }
                        if (!ep.overview || ep.overview.trim() === "") {
                            ep.overview = fallbackData.episodes[i].overview;
                        }
                    }
                });
            }
        }

        if(seasonData.episodes && seasonData.episodes.length > 0) {
            let epsHTML = '';
            
            seasonData.episodes.forEach(ep => {
                const img = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://via.placeholder.com/300x170/1a1a1a/ffffff?text=CineNet';
                const epDuration = ep.runtime ? `${ep.runtime} min` : '';
                
                const epName = (ep.name && ep.name.trim() !== "") ? ep.name : `Episódio ${ep.episode_number}`;
                const overview = (ep.overview && ep.overview.trim() !== "") ? ep.overview : 'A sinopse deste episódio não está disponível no momento.';
                
                epsHTML += `
                    <div class="episode-item" onclick="abrirPlayer(${tvId}, 'tv', ${seasonNumber}, ${ep.episode_number})">
                        <img src="${img}" alt="${epName}" loading="lazy">
                        <div class="episode-info">
                            <h4>${ep.episode_number}. ${epName} <span class="ep-duration">${epDuration}</span></h4>
                            <p>${overview}</p>
                        </div>
                    </div>
                `;
            });
            
            epList.innerHTML = epsHTML;
        } else {
            epList.innerHTML = '<p style="color:#888; text-align: center; padding: 20px;">Nenhum episódio encontrado para esta temporada.</p>';
        }
    } catch (e) {
        epList.innerHTML = '<p style="color:#ff4d4d; text-align: center; padding: 20px;">Ocorreu um erro ao carregar os episódios.</p>';
    }
}

function fecharDetalhes() {
    document.getElementById('detailsModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// REPRODUTOR DE VÍDEO
function abrirPlayer(id, tipo, temporada = 1, episodio = 1) {
    fecharDetalhes();
    if (tipo === 'tv') {
        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${temporada}/${episodio}`;
    } else {
        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/movie/${id}`;
    }
    document.getElementById('streaming-player-screen').style.display = 'block';
}

document.getElementById('close-player-btn').addEventListener('click', () => {
    document.getElementById('streaming-player-screen').style.display = 'none';
    document.getElementById('videoPlayer').src = '';
});

// WATCHLIST
function alternarWatchlist() {
    const id = itemSelecionado.id;
    if (biblioteca.watchlist[id]) delete biblioteca.watchlist[id];
    else biblioteca.watchlist[id] = itemSelecionado;
    document.getElementById('btn-watchlist').innerText = biblioteca.watchlist[id] ? "✔ Na Minha Lista" : "+ A Minha Lista";
    salvarDados();
}

function renderizarWatchlist() {
    const grid = document.getElementById('watchlist-grid');
    grid.innerHTML = '';
    const items = Object.values(biblioteca.watchlist);
    if(items.length === 0) document.getElementById('watchlist-empty-state').style.display = 'block';
    else {
        document.getElementById('watchlist-empty-state').style.display = 'none';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}">`;
            card.onclick = () => abrirDetalhes(item.id, item.tipo);
            grid.appendChild(card);
        });
    }
}

// ==========================================
// CINEBOT
// ==========================================
const chatInput = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send-btn');
const messagesContainer = document.getElementById('chatbot-messages');
const recomendadosVistos = new Set(); 

function addMessage(text, type) {
    if (!messagesContainer) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = type === 'user' ? 'user-msg' : 'bot-msg';
    if(type === 'user') msgDiv.textContent = text;
    else msgDiv.innerHTML = text;

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; 
}

async function processarMensagemBot(msg) {
    const text = msg.toLowerCase();
    let endpoint = '';
    let tipoPadrao = 'movie';

    const generos = {
        'ação': 28, 'acao': 28,
        'comédia': 35, 'comedia': 35,
        'terror': 27, 'medo': 27, 'assustador': 27,
        'ficção': 878, 'ficcao': 878, 'sci-fi': 878,
        'romance': 10749, 'amor': 10749,
        'mistério': 9648, 'misterio': 9648,
        'animação': 16, 'animacao': 16, 'desenho': 16,
        'drama': 18,
        'aventura': 12
    };

    let generoID = null;
    for (let key in generos) {
        if (text.includes(key)) { generoID = generos[key]; break; }
    }

    if (generoID) {
        endpoint = `/discover/movie?with_genres=${generoID}&sort_by=popularity.desc`;
    } else if (text.includes('série') || text.includes('serie')) {
        endpoint = `/tv/popular`;
        tipoPadrao = 'tv';
    } else if (text.includes('anime')) {
        endpoint = `/discover/tv?with_genres=16&with_original_language=ja`;
        tipoPadrao = 'tv';
    } else if (text.includes('dorama') || text.includes('coreano')) {
        endpoint = `/discover/tv?with_original_language=ko`;
        tipoPadrao = 'tv';
    } else if (text.includes('destaque') || text.includes('popula') || text.includes('top')) {
        endpoint = `/trending/all/week`;
    } else {
        endpoint = `/search/multi?query=${encodeURIComponent(msg)}`;
    }

    const data = await fetchTMDB(endpoint);
    let resultados = (data.results || []).filter(item => item.poster_path && !recomendadosVistos.has(item.id) && (item.media_type === 'movie' || item.media_type === 'tv' || !item.media_type));

    if (resultados.length === 0) resultados = (data.results || []).filter(item => item.poster_path);

    if (resultados.length === 0) {
        addMessage("Desculpa, não consegui encontrar nenhuma recomendação. Experimenta pedir <b>'Ação'</b>, <b>'Terror'</b> ou <b>'Anime'</b>!", 'bot');
        return;
    }

    const topLimit = Math.min(resultados.length, 5);
    const item = resultados[Math.floor(Math.random() * topLimit)];
    recomendadosVistos.add(item.id);

    const mediaType = item.media_type || tipoPadrao;
    const titulo = item.title || item.name;
    const sinopse = item.overview ? item.overview : "Sem sinopse disponível.";
    const poster = `https://image.tmdb.org/t/p/w200${item.poster_path}`;

    const cardHTML = `
        <div class="bot-card-recommendation">
            <img src="${poster}" alt="${titulo}">
            <div class="bot-card-info">
                <h4>${titulo}</h4>
                <p>${sinopse}</p>
                <div class="bot-card-actions">
                    <button class="btn-play-sm" onclick="abrirPlayer(${item.id}, '${mediaType}')">▶ Assistir</button>
                    <button class="btn-info-sm" onclick="abrirDetalhes(${item.id}, '${mediaType}')">ℹ Detalhes</button>
                </div>
            </div>
        </div>
    `;

    addMessage(`Com certeza! Aqui tens uma recomendação para ti:<br>${cardHTML}`, 'bot');
}

function enviarChat() {
    const text = chatInput.value.trim();
    if(!text) return;
    addMessage(text, 'user');
    chatInput.value = '';
    setTimeout(() => processarMensagemBot(text), 600);
}

if(sendBtn) sendBtn.onclick = enviarChat;
if(chatInput) chatInput.onkeypress = (e) => { if(e.key === 'Enter') enviarChat(); };

if(document.getElementById('chat-quick-actions')) {
    document.getElementById('chat-quick-actions').onclick = (e) => {
        if(e.target.classList.contains('chat-chip')) {
            chatInput.value = e.target.innerText;
            enviarChat();
        }
    };
}
