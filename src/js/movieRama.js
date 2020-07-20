import Helpers from './helpers.js';
import Config from './MovieDB/ApiConfig.js';
import Movie from './MovieDB/movie.js';
import MovieModal from './MovieDB/movieModal.js';
import HandlebarTemplates from './handlebarTemplates.js';

export default class MovieRama {
    // The HtmlElement container for our movie catalog. It will also display the data rendered for our error page.
    #containerElement;

    /** @type {HtmlInputElement} The HtmlInputElement for the search bar. */
    #searchElement;

    // The i (icon) element for the search if found.
    #searchIcon;

    // The element containing the animation for the ongoing search.
    #searchLoading;

    // The HtmlElement that will display the loader and
    // the one that the IntersectionObserver will observe to use for infinite scroll.
    #loaderElement;

    // The api URL for the current request
    #apiUrl;

    // The api query for the current request
    #apiQuery = {};

    // The page number that is currently loaded in our catalog
    #page;

    // The total number of available pages in the request
    #pages;

    // The total number of  results in the request
    #results;

    // The configuration helper class for our web app
    #config;

    // Flag to check if we are curretnly loading a page
    #loading = false;

    #titleElements;

    constructor(containerElement, catalogLoaderElement, titleElements, searchElement, useCache = true) {
        // Initialize containerElement class property if the given element is a valid instance of a HtmlElement class. Throw an error if not.
        if (containerElement && containerElement instanceof HTMLElement) {
            this.#containerElement = containerElement;
        } else throw "MovieRama initialization error: Parameter containerElement must be an instance of a HTMLElement class";

        // Initialize catalogLoaderElement class property if the given element is a valid instance of a HtmlElement class. Throw an error if not.
        if (catalogLoaderElement && catalogLoaderElement instanceof HTMLElement) {
            this.#loaderElement = catalogLoaderElement;
        } else throw "MovieRama initialization error: Parameter catalogLoaderElement must be an instance of a HTMLElement class";

        // Initialize searchElement class property if the given element is a valid instance of a HTMLInputElement class. 
        // If not given he search function will simply not activate
        if (searchElement && searchElement instanceof HTMLInputElement) {
            this.#searchElement = searchElement;
            this.#searchIcon = searchElement.parentElement.querySelector('i');

            // Check if a search loader already exists or create a new one but hide it either way.
            this.#searchLoading = ((loader) => {
                if (!loader) {
                    loader = Helpers.loaderElement;
                    loader.classList.add('search');
                    searchElement.parentElement.prepend(loader);
                }
                loader.style.opacity = 0;
                loader.style.display = 'none';
                return loader;
            })(searchElement.parentElement.querySelector('.lds-roller'));
        }

        this.#titleElements = titleElements;

        // Init our configuration class
        Config.enableCache(useCache);
        this.#config = new Config;

        // Load our movie catalog and movie details.
        this.#loadPage();

        // Init events for navigation.
        this.#initEvents();
    }

    #loadPage() {
        // Read current url params
        const urlParams = new URLSearchParams(window.location.search);
        const query = (urlParams.get('query') || '').trim();
        const lang = (urlParams.get('lang') || '').trim() || 'en-US';
        const region = (urlParams.get('region') || '').trim() || null;

        this.#config.language = lang;
        this.#config.region = region;

        // Check if a movie is open
        const paths = window.location.pathname.split("/").filter(x => x);
        const movieId = paths.shift() === 'movie' ? Helpers.parseInt(paths.shift()) : null;

        // If the path has other segments clear them
        if (paths.length) {
            return MovieRama.redirectTo(null, query, movieId, lang, region, true)
        }

        // Check if a non empty search query exists.
        if (query) {
            // If it does load the search page
            this.searchMovies(query);
            this.#searchElement.value = query;
        } else {
            // If not load the in cinemas page
            this.displayInCinemas();
        }

        MovieModal.show(movieId);
    }

    static redirectTo(title = null, search = false, movieId = false, lang = true, region = true, replaceState = false) {
        // Read current url params
        const urlParams = new URLSearchParams(window.location.search);
        if (search === true) search = (urlParams.get('query') || '').trim();
        if (lang === true) lang = (urlParams.get('lang') || '').trim();
        if (region === true) region = (urlParams.get('region') || '').trim();

        let uri = '/';

        if (movieId) {
            uri += 'movie/' + movieId;
        }

        const newState = {
            query: (search || '').trim() || null,
            lang: lang || null,
            region: region || null
        };

        uri += Helpers.getRequestQuery(newState);

        newState.movieId = movieId;
        newState.pageTitle = (title || '').trim() || null;

        window.history[replaceState ? 'replaceState' : 'pushState']([], '', uri);
        window.dispatchEvent(new Event('popstate'));
    }

    #initEvents() {
        // Add event for real time updating to results with throttled function to avoid too often calls 
        this.#searchElement.addEventListener('input', Helpers.throttle((e) => {
            MovieRama.redirectTo(`Searching movies for "${e.target.value}"`, e.target.value, null, Config.language, Config.region)
        }, 1000, { leading: false }));
        // this.#searchElement.addEventListener('change', (e) => {
        //     // router.navigateTo('?query=' + encodeURIComponent(e.target.value), {}, true);

        // });

        document.body.addEventListener('click', (e) => {
            const el = Helpers.closestElement(e.target, '.trigger-movie-modal');
            if (!el) return;

            const movieId = el.getAttribute('data-id');
            if (!movieId) return;

            e.preventDefault();

            MovieRama.redirectTo(null, this.#apiQuery.query, movieId, Config.language, Config.region)
        }, { capture: true });

        window.addEventListener('popstate', e => this.#loadPage());
    }

    #setLoadingState() {
        if (this.#loading) return;
        // TODO Persist this loader too for performance
        this.#loading = true;
        const loaderElem = Helpers.loaderElement;
        this.#loaderElement.appendChild(loaderElem);
        // Access offsetWidth to foce the browser to render the page in order to see the fade in
        loaderElem.offsetWidth;
        loaderElem.style.opacity = 1;
        Config.debug && console.info("Begin loading page: ", this.toClassDebugView());
    }

    async #clearLoadingState() {
        const loaderElem = this.#loaderElement.firstElementChild;

        if (loaderElem) {
            loaderElem.style.opacity = 0;
            await Helpers.waitForEvent(loaderElem, 'transitionend')

            this.#loaderElement.innerHTML = '';
        }

        this.#loaderElement.innerHTML = '';
        this.#loading = false;

        Config.debug && console.info("Finished loading page: ", this.toClassDebugView());
    }

    /**
     * A function to fade an elements content in the new contents
     * @param {HTMLElement} container 
     * @param {String} html 
     */
    async  #replaceDomData(container, html) {
        if (!container) return;

        const animate = container.classList.contains("fade");

        if (animate) {
            container.style.opacity = 0;
            await Helpers.waitForEvent(container, 'transitionend')
        }

        container.innerHTML = html || '';

        if (animate) {
            container.style.opacity = 1;
            await Helpers.waitForEvent(container, 'transitionend')
        }

        Config.debug && console.info("Finished replacing DOM content");
    }


    /**
     * A function to fade an elements content in the new contents
     * @param {HTMLElement} container 
     * @param {String} html 
     */
    async  #appendDomData(container, html) {
        if (!container) return;

        container.innerHTML += html;
    }

    async fetchNextPage(reloadPage = false, langParam = false, regionParam = false) {
        if (reloadPage) {
            if (!this.#apiQuery) this.#apiQuery = {}
            if (langParam) {
                this.#apiQuery.language = this.#config.language;
            }
            if (regionParam) {
                this.#apiQuery.region = this.#config.region;
            }

            // Clear the page data if reloading
            this.#page = this.#pages = this.#results = null;
            this.#apiQuery.page = 1;
        } else if (!this.#page || this.#page < this.#pages) {
            this.#apiQuery.page = this.#page + 1;
        } else return false;

        this.#setLoadingState();

        let data;
        try {
            // Convert the movies to their html code
            data = await this.fetchPageRequest();
        } catch (error) {
            this.#errorLogger('An error occured while fetching the page data from fetchNextPage', { error });
        }

        Config.debug && console.info("Data loaded: ", data);
        let success = false;

        if (data) {
            try {
                // Read result page data
                this.#page = data.page;
                this.#pages = data.total_pages;
                this.#results = data.total_results;

                // Convert the movies to their html code 
                const html = data.results.map(
                    movie => movie && HandlebarTemplates.posterTemplate(movie.toJSON ? movie.toJSON() : movie)
                ).join('');

                // Call either the replaceDomData if clearing the container or the replaceDomData if simply appening the data
                await (reloadPage ? this.#replaceDomData : this.#appendDomData)(this.#containerElement, html);

                success = true;
            } catch (error) {
                this.#errorLogger('An error occured while rendering the page data', { error, data });
                success = 'An error occured while retrieving the movie data.';
            }
        } else success = 'No movies were found.';

        await this.#clearLoadingState();

        return success;
    }

    async fetchPageRequest() {
        let data;
        // Fetch the data for the next movies from the API
        try {
            data = await fetch(this.#apiUrl + Helpers.getRequestQuery(this.#apiQuery))
                .then(response => response.json());
        } catch (error) {
            this.#errorLogger('An error occured while fetching the page data from fetchPageRequest', { error });
        }

        //Check if response empty or if the page is already loaded
        if (!data || data.page <= this.#page) {
            data && Config.debug && console.info("Data retrieved are already loaded");
            return null;
        }

        try {
            // Convert data to Movies objects
            const movies = await Promise.all(data.results.map(Movie.parse));

            return {
                page: data.page,
                total_pages: data.total_pages,
                total_results: data.total_results,
                results: movies,
            };
        } catch (error) {
            this.#errorLogger('An error occured while transforming the page data to movie objects', { error, data });
        }
    }

    async displayInCinemas() {
        this.#apiUrl = "/api/movie/now_playing";
        this.#apiQuery = {};

        let title;
        try {
            title = (await this.fetchNextPage(true, true, true)) || "Invalid request data.";
        } catch (error) {
            this.#errorLogger('An error occured while fetching the data for the currently playing movies', { error });
        }

        if (title === true) {
            title = "In cinemas";
        }
        Helpers.updateElementsContent(this.#titleElements, document.title = title);
    }

    async searchMovies(query) {
        if (this.#apiQuery === query) return;

        this.#apiUrl = "/api/search/movie";
        this.#apiQuery = { query: query };

        const loadCss = this.#searchLoading.style;

        loadCss.removeProperty("display");
        this.#searchIcon.style.opacity = 0;
        loadCss.opacity = 1;

        try {
            const status = await this.fetchNextPage(true, true, true);
        } catch (error) {
            this.#errorLogger('An error occured while fetching the results of a search in the movie DB', { error })
        }

        this.#searchIcon.style.removeProperty('opacity');
        loadCss.opacity = 0;

        Helpers.updateElementsContent(this.#titleElements, document.title = `Searching for "${query}".`);

        await Helpers.waitForEvent(this.#searchLoading, 'transitionend');
        loadCss.display = 'none';
    }

    async showMovieDetails(movieId) {
        this.#apiUrl = "/api/search/movie";
        this.#apiQuery = { query: query };

        const loadCss = this.#searchLoading.style;

        loadCss.removeProperty("display");
        this.#searchIcon.style.opacity = 0;
        loadCss.opacity = 1;

        try {
            const status = await this.fetchNextPage(true, true, false);
        } catch (error) {
            this.#errorLogger('An error occured while fetching the results of a search in the movie DB', { error })
        }

        this.#searchIcon.style.removeProperty('opacity');
        loadCss.opacity = 0;

        Helpers.updateElementsContent(this.#titleElements, `Searching for "${query}".`);

        await Helpers.waitForEvent(this.#searchLoading, 'transitionend');
        loadCss.display = 'none';
    }

    #errorLogger(description, var_obj) {
        console.error(Config.debug ? {
            desc: description,
            ...var_obj,
            class: this.toClassDebugView()
        } : description)
    }

    getScrollHandler(loadNextThreshold = 400) {
        return (e) => {
            if (this.#loading) return;

            const pixelsFromBottom = e.target.scrollHeight - e.target.clientHeight - e.target.scrollTop;

            if (pixelsFromBottom < loadNextThreshold) {
                this.fetchNextPage();
            }
        };
    }

    toClassDebugView() {
        return Config.debug ? {
            containerElement: this.#containerElement,
            searchElement: this.#searchElement,
            requestUrl: this.#apiUrl,
            requestQuery: this.#apiQuery,
            page: this.#page,
            pages: this.#pages,
            results: this.#results,
            config: this.#config.toClassDebugView(),
            loading: this.#loading,
        } : null;
    }

}