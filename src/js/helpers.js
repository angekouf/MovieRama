export default class Helpers {

    static validateData(data, required) {
        return data && required.every(prop => data[prop]);
    }

    static isNumeric(n) {
        // Taken from jQuery
        // parseFloat NaNs numeric-cast false positives (null|true|false|"")
        // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
        // subtraction forces infinities to NaN
        // adding 1 corrects loss of precision from parseFloat (#15100)
        return !Array.isArray(n) && (n - parseFloat(n) + 1) >= 0;
    }

    static isInteger(n) {
        return Helpers.isNumeric(n) && !(n % 1);
    }

    static parseInt(n) {
        return Helpers.isInteger(n) ? Number.parseInt(n) : null;
    }

    static assertPositive(obj, desc = 'positive') {
        for (const [name, value] of Object.entries(obj)) {
            if (value <= 0) throw `${name} was expected to be ${desc}. ${movieId} was given.`;
        }
    }

    static mapBy(arr, key = 'id') {
        return arr.reduce((map, data) => map.set(data[key], data), new Map);
    }

    static getRequestQuery(params) {
        params = params || {};

        const q = Object.keys(params)
            .map(k => params[k] === void (0) || params[k] === null ? '' : encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .filter(x => x)
            .join('&');

        return q ? '?' + q : '';
    }

    static get loaderElement() {
        const loader = document.createElement('div');
        loader.className = 'lds-roller fade';
        loader.innerHTML = '<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>'
        return loader;
    }

    /**
     * Returns a function, that, when invoked, will only be triggered at most once
     * during a given window of time. Normally, the throttled function will run
     * as much as it can, without ever going more than once per `wait` duration;
     * but if you'd like to disable the execution on the leading edge, pass
     * `{leading: false}`. To disable execution on the trailing edge, likewise.
     * 
     * @param {Function} func The function that should be called
     * @param {Number} wait Minnimum time to wait between calls
     * @param {Object} options Options to disable execution on the leading edge or the trailing edge
     */
    static throttle(func, wait, options = {}) {
        let context, args, result;
        let timeout = null;
        let previous = 0;
        let later = function () {
            previous = options.leading === false ? 0 : Date.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };

        return function () {
            let now = Date.now();
            if (!previous && options.leading === false) previous = now;
            let remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
    };

    static waitForEvent(element, type) {
        return element && type && new Promise(resolve => element.addEventListener(type, resolve, { once: true }));
    }

    /**
     * 
     * @param {HTMLElement | NodeListOf | HTMLCollectionOf} elements The elements that will be changed
     * @param {string} html 
     */
    static updateElementsContent(elements, html) {
        if (elements instanceof HTMLElement) {
            elements.innerHTML = html;
        } else for (let i = elements.length - 1; i >= 0; --i) {
            if (elements[i] instanceof HTMLElement) {
                elements[i].innerHTML = html;
            }
        }
    }

    /**
     * @param {HTMLElement} el The starting element to look for the selector tranversing upwards the DOM tree.
     * @param {String} selector The selector to match the desired element to
     * @param {HTMLElement} untilElement The parent element after which we will stop searching
     * 
     * @returns {HTMLElement}
     */
    static closestElement(el, selector, untilElement) {
        while (!el.matches(selector)) {
            if (el === untilElement) {
                return null;
            }

            el = el.parentElement;

            if (!el) {
                return null;
            }
        }

        return el;
    }

    /**
     * Truncate the text and add read more if too long
     * @param {HTMLElement} el.
     * @param {Number} length.
     */
    static function () {
        
    }
}