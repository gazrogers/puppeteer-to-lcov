const PuppeteerToLcov = require('./lib/puppeteer-to-lcov');

module.exports = function (test, coverage, config) {
	return new PuppeteerToLcov(test, coverage, config);
}