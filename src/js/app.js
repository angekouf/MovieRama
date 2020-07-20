import MovieRama from './movieRama.js';

(function () {

    window.addEventListener('load', () => {
        const movieRama = new MovieRama(
            document.getElementById('movie-catalog'),
            document.getElementById('catalog-loader'),
            document.querySelectorAll('.page-title'),
            document.querySelector('.search-wrapper>input'),
        );

        const scrollableElement = document.querySelector('.main');

        const scrollHandler = movieRama.getScrollHandler();
        scrollableElement.addEventListener('scroll', scrollHandler);
        scrollableElement.addEventListener('touchmove', scrollHandler);
        window.addEventListener('resize', scrollHandler);
    });
})();