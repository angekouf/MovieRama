export default class HandlebarTemplates {
  static errorTemplate = Handlebars.compile(document.getElementById('error-template').innerHTML);
  static posterTemplate = Handlebars.compile(document.getElementById('poster-partial').innerHTML);
  static modalOverviewTemplate = Handlebars.compile(document.getElementById('modal-overview-partial').innerHTML);
  static modalReviewsTemplate = Handlebars.compile(document.getElementById('modal-reviews-partial').innerHTML);
  static modalTemplate = Handlebars.compile(document.getElementById('modal-template').innerHTML);
}