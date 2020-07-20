import Movie from './movie.js';
import Config from './ApiConfig.js';
import Helpers from '../helpers.js';
import HandlebarTemplates from '../handlebarTemplates.js';
import MovieRama from '../movieRama.js';

export default class MovieModal {
  static isOpen = false;

  static #tabs = [
    {
      active: true,
      class: '.btn-overview',
      /**@type {HTMLElement} */
      link: null,
      template: movie => HandlebarTemplates.modalOverviewTemplate(movie.toJSON())
    },
    {
      class: '.btn-reviews',
      /**@type {HTMLElement} */
      link: null,
      template: movie => HandlebarTemplates.modalReviewsTemplate(movie.toJSON())
    },
    {
      class: '.btn-similar',
      /**@type {HTMLElement} */
      link: null,
      template: (movie) => '<div class="movie-catalog" class="fade">' + movie.similar.map(
        movie => HandlebarTemplates.posterTemplate(movie.toJSON())
      ).join('') + '</div'
    },
  ];

  /**
   * @type HTMLElement
   */
  static #modalLoaded = null;

  static #movieId = null;

  static #activeTab = null;

  static #tabLinks = {
    /**
     * @type HTMLElement
     */
    overviewLink: null,

    /**
     * @type HTMLElement
     */
    reviewsLink: null,

    /**
     * @type HTMLElement
     */
    similarLink: null
  }

  static #modalContainer = null;


  static async show(id) {
    if (!id || (MovieModal.#movieId === id)) {
      return;
    }

    Config.debug && console.debug('Retrieving movie details for movie id = ' + id);

    /** @type {Movie} */
    let movie;
    try {
      movie = await Movie.fetchMovieDetails(id);
      Config.debug && console.log({ desc: 'Finished retrieving movie details ', movie: movie.toClassDebugView() });
    } catch (error) {
      Config.debug && console.error({ desc: 'Error while retrieving movie details', id });
    }

    if (!movie) return;

    const modal = await MovieModal.getModalElement(movie);

    document.body.appendChild(MovieModal.#modalLoaded = modal);

    MovieModal.#movieId = id;

    modal.style.opacity = 0;
    modal.offsetHeight;
    modal.style.opacity = 1

    document.addEventListener('click', e => {
      if (e.target == modal) {
        MovieModal.hide(true);
      }
    })

    document.addEventListener('keydown', e => {
      if (e.key === "Escape") {
        MovieModal.hide(true);
      }
    });
  }

  static async hide(editUri = false) {
    if (!MovieModal.#movieId || !MovieModal.#modalLoaded) return;

    const modal = MovieModal.#modalLoaded;
    MovieModal.#modalLoaded = null;
    modal.style.opacity = 0;

    await Helpers.waitForEvent(modal, 'transitionend');
    modal.remove();

    MovieRama.redirectTo(null, true, MovieModal.#movieId);
    MovieModal.#movieId = null;
  }

  static isLoaded(movieId) {
    return movieId === MovieModal.#movieId
  }

  /**
   * 
   * @param {Movie} movie 
   * @returns {HTMLElement}
   */
  static async getModalElement(movie) {
    if (MovieModal.#modalLoaded) {
      if (MovieModal.#movieId === movie.id) {
        return MovieModal.#modalLoaded;
      } else {
        await MovieModal.hide();
      }
    }
    const container = document.createElement('div');

    container.innerHTML = HandlebarTemplates.modalTemplate(movie.toJSON());

    /** @type {HTMLElement} */
    const backgroundContainer = container.querySelector('.modalInner');
    backgroundContainer.style.backgroundImage = `url(${movie.backdrop_url || movie.poster_url})`

    const listener = async (e) => {
      e.preventDefault();
      if (e.target === MovieModal.#activeTab.link) return;
      MovieModal.#activeTab.link.classList.remove('active');

      for (let i = 0, tabs = MovieModal.#tabs, len = tabs.length; i < len; ++i) {
        if (e.target === tabs[i].link) {
          MovieModal.#modalContainer.offsetHeight;
          MovieModal.#modalContainer.style.opacity = 0;
          await Helpers.waitForEvent(MovieModal.#modalContainer, 'transitionend');

          MovieModal.#modalContainer.innerHTML = tabs[i].template(movie);

          MovieModal.#activeTab = tabs[i];
          tabs[i].link.classList.add('active');

          MovieModal.#modalContainer.offsetHeight;
          MovieModal.#modalContainer.style.opacity = 1
          return;
        }
      }
    };

    let active = null;
    MovieModal.#tabs.forEach(tab => {
      tab.link = container.querySelector(tab.class);
      if (tab.link) {
        tab.link.addEventListener('click', listener);
        if (!active || tab.active) active = tab;
      }
    });

    active.link.classList.add('active');
    MovieModal.#activeTab = active;

    MovieModal.#modalContainer = container.querySelector('.movie-details-wrapper');
    MovieModal.#modalContainer.innerHTML = active.template(movie)

    return container.firstElementChild
  }

}